<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/result_archive.php';

requireAdminAuth();

$electionId = isset($_GET['election_id']) ? (int) $_GET['election_id'] : 0;
if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id query parameter is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $electionStmt = $pdo->prepare(
        'SELECT id, title, status, published_results FROM elections WHERE id = :election_id LIMIT 1'
    );
    $electionStmt->execute([':election_id' => $electionId]);
    $election = $electionStmt->fetch();
    if ($election === false) {
        sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
    }
    if ((int) ($election['published_results'] ?? 0) !== 1) {
        sendJsonResponse(['success' => false, 'message' => 'Results are not published yet.'], 403);
    }

    $snapshotStmt = $pdo->prepare(
        'SELECT position_name, scope, department_name, candidate_name, register_number, total_votes
         FROM election_result_snapshots
         WHERE election_id = :election_id
         ORDER BY position_name ASC, total_votes DESC, candidate_name ASC'
    );
    $snapshotStmt->execute([':election_id' => $electionId]);
    $rows = $snapshotStmt->fetchAll();

    if (!$rows) {
        $liveStmt = $pdo->prepare(
            "SELECT p.name AS position_name, p.scope, d.name AS department_name,
                    s.name AS candidate_name, s.register_number, COUNT(v.id) AS total_votes
             FROM candidates c
             INNER JOIN positions p ON p.id = c.position_id
             INNER JOIN students s ON s.id = c.student_id
             LEFT JOIN departments d ON d.id = p.department_id
             LEFT JOIN votes v ON v.candidate_id = c.id
             WHERE c.election_id = :election_id
               AND c.status = 'approved'
             GROUP BY p.id, p.name, p.scope, d.name, s.id, s.name, s.register_number
             ORDER BY p.name ASC, total_votes DESC, s.name ASC"
        );
        $liveStmt->execute([':election_id' => $electionId]);
        $rows = $liveStmt->fetchAll();
    }

    $statsStmt = $pdo->prepare(
        'SELECT total_voters, votes_cast, unique_voters, turnout_percentage, winner_count
         FROM election_result_stats
         WHERE election_id = :election_id'
    );
    $statsStmt->execute([':election_id' => $electionId]);
    $stats = $statsStmt->fetch();

    if ($stats === false) {
        $totalVotersStmt = $pdo->query('SELECT COUNT(*) AS total_voters FROM students WHERE is_active = 1');
        $totalVoters = (int) (($totalVotersStmt->fetch())['total_voters'] ?? 0);

        $identityColumn = getVotesIdentityColumn($pdo);
        $votesCastStmt = $pdo->prepare(
            "SELECT COUNT(*) AS votes_cast, COUNT(DISTINCT {$identityColumn}) AS unique_voters
             FROM votes
             WHERE election_id = :election_id"
        );
        $votesCastStmt->execute([':election_id' => $electionId]);
        $voteStats = $votesCastStmt->fetch();
        $votesCast = (int) ($voteStats['votes_cast'] ?? 0);
        $uniqueVoters = (int) ($voteStats['unique_voters'] ?? 0);
        $turnout = $totalVoters > 0 ? round(($uniqueVoters / $totalVoters) * 100, 2) : 0.0;
        $winnerCount = count(array_unique(array_map(
            static fn (array $row): string => (string) ($row['position_name'] ?? ''),
            $rows
        )));
    } else {
        $totalVoters = (int) ($stats['total_voters'] ?? 0);
        $votesCast = (int) ($stats['votes_cast'] ?? 0);
        $uniqueVoters = (int) ($stats['unique_voters'] ?? 0);
        $turnout = (float) ($stats['turnout_percentage'] ?? 0);
        $winnerCount = (int) ($stats['winner_count'] ?? 0);
    }

    $safeTitle = preg_replace('/[^A-Za-z0-9_-]+/', '_', (string) ($election['title'] ?? 'election'));
    $filename = sprintf('results_%d_%s.csv', $electionId, trim((string) $safeTitle, '_'));

    header_remove('Content-Type');
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $out = fopen('php://output', 'wb');
    if ($out === false) {
        throw new RuntimeException('Could not open output stream.');
    }

    fputcsv($out, ['Election ID', (string) $electionId]);
    fputcsv($out, ['Election Title', (string) ($election['title'] ?? '')]);
    fputcsv($out, ['Election Status', (string) ($election['status'] ?? '')]);
    fputcsv($out, ['Total Voters', (string) $totalVoters]);
    fputcsv($out, ['Votes Cast', (string) $votesCast]);
    fputcsv($out, ['Unique Voters', (string) $uniqueVoters]);
    fputcsv($out, ['Turnout Percentage', number_format($turnout, 2) . '%']);
    fputcsv($out, ['Winner Count', (string) $winnerCount]);
    fputcsv($out, []);
    fputcsv($out, ['Position', 'Scope', 'Department', 'Candidate', 'Register Number', 'Total Votes']);

    foreach ($rows as $row) {
        fputcsv($out, [
            (string) ($row['position_name'] ?? ''),
            (string) ($row['scope'] ?? ''),
            (string) ($row['department_name'] ?? ''),
            (string) ($row['candidate_name'] ?? ''),
            (string) ($row['register_number'] ?? ''),
            (string) ($row['total_votes'] ?? 0),
        ]);
    }

    fclose($out);
    exit;
} catch (Throwable $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not export results.'], 500);
}
