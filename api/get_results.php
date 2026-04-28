<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/utils/result_archive.php';

$electionId = isset($_GET['election_id']) ? (int) $_GET['election_id'] : 0;
if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id query parameter is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $electionStmt = $pdo->prepare(
        'SELECT id, title, status, published_results FROM elections WHERE id = :election_id'
    );
    $electionStmt->execute([':election_id' => $electionId]);
    $election = $electionStmt->fetch();

    if ($election === false) {
        sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
    }

    if ((int) $election['published_results'] !== 1) {
        sendJsonResponse(['success' => false, 'message' => 'Results are not published yet.'], 403);
    }

    $snapshotStmt = $pdo->prepare(
        'SELECT position_id, position_name, scope, department_name, candidate_id, candidate_name, register_number, total_votes
         FROM election_result_snapshots
         WHERE election_id = :election_id
         ORDER BY position_name ASC, total_votes DESC, candidate_name ASC'
    );
    $snapshotStmt->execute([':election_id' => $electionId]);
    $snapshotRows = $snapshotStmt->fetchAll();

    if ($snapshotRows) {
        $results = $snapshotRows;
        $statsStmt = $pdo->prepare(
            'SELECT total_voters, votes_cast, unique_voters, turnout_percentage, winner_count
             FROM election_result_stats
             WHERE election_id = :election_id'
        );
        $statsStmt->execute([':election_id' => $electionId]);
        $stats = $statsStmt->fetch();
        $totalVoters = (int) ($stats['total_voters'] ?? 0);
        $votesCast = (int) ($stats['votes_cast'] ?? 0);
        $uniqueVoters = (int) ($stats['unique_voters'] ?? 0);
        $turnoutPercentage = (float) ($stats['turnout_percentage'] ?? 0);
        $winnerCount = (int) ($stats['winner_count'] ?? 0);
    } else {
        $resultStmt = $pdo->prepare(
            "SELECT p.id AS position_id, p.name AS position_name, p.scope,
                    d.name AS department_name,
                    c.id AS candidate_id, s.name AS candidate_name, s.register_number,
                    COUNT(v.id) AS total_votes
             FROM candidates c
             INNER JOIN positions p ON p.id = c.position_id
             INNER JOIN students s ON s.id = c.student_id
             LEFT JOIN departments d ON d.id = p.department_id
             LEFT JOIN votes v ON v.candidate_id = c.id
             WHERE c.election_id = :election_id
               AND c.status = 'approved'
             GROUP BY p.id, p.name, p.scope, d.name, c.id, s.name, s.register_number
             ORDER BY p.name ASC, total_votes DESC, s.name ASC"
        );
        $resultStmt->execute([':election_id' => $electionId]);
        $results = $resultStmt->fetchAll();

        $totalVotersStmt = $pdo->query('SELECT COUNT(*) AS total_voters FROM students WHERE is_active = 1');
        $totalVotersRow = $totalVotersStmt->fetch();
        $totalVoters = (int) ($totalVotersRow['total_voters'] ?? 0);

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

        $turnoutPercentage = $totalVoters > 0
            ? round(($uniqueVoters / $totalVoters) * 100, 2)
            : 0.0;

        $winnerCount = count(array_unique(array_map(
            static fn (array $row): int => (int) $row['position_id'],
            $results
        )));
    }

    sendJsonResponse([
        'success' => true,
        'election' => $election,
        'results' => $results,
        'stats' => [
            'total_voters' => $totalVoters,
            'votes_cast' => $votesCast,
            'unique_voters' => $uniqueVoters,
            'turnout_percentage' => $turnoutPercentage,
            'winner_count' => $winnerCount,
        ],
        'privacy_note' => 'Results show vote totals only. Voter-to-candidate mapping is hidden.',
    ]);
} catch (Throwable $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch results.'], 500);
}
