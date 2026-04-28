<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requireAdminAuth();

try {
    $pdo = Database::getConnection();

    $studentsStmt = $pdo->query('SELECT COUNT(*) AS total_students FROM students WHERE is_active = 1');
    $totalStudents = (int) (($studentsStmt->fetch())['total_students'] ?? 0);

    $candidateStatsStmt = $pdo->query(
        "SELECT
            COUNT(*) AS total_candidates,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_candidates
         FROM candidates"
    );
    $candidateStats = $candidateStatsStmt->fetch() ?: [];
    $totalCandidates = (int) ($candidateStats['total_candidates'] ?? 0);
    $pendingCandidates = (int) ($candidateStats['pending_candidates'] ?? 0);

    $activeElectionsStmt = $pdo->query("SELECT COUNT(*) AS active_elections FROM elections WHERE status = 'active'");
    $activeElections = (int) (($activeElectionsStmt->fetch())['active_elections'] ?? 0);

    $latestElectionStmt = $pdo->query(
        'SELECT id, title, status, start_time, end_time, published_results, created_at
         FROM elections
         ORDER BY created_at DESC
         LIMIT 1'
    );
    $latestElection = $latestElectionStmt->fetch() ?: null;

    $turnoutPercentage = 0.0;
    if ($latestElection !== null) {
        $electionId = (int) $latestElection['id'];
        $isPublished = (int) ($latestElection['published_results'] ?? 0) === 1;

        if ($isPublished) {
            $archivedStatsStmt = $pdo->prepare(
                'SELECT turnout_percentage FROM election_result_stats WHERE election_id = :election_id LIMIT 1'
            );
            $archivedStatsStmt->execute([':election_id' => $electionId]);
            $archivedStats = $archivedStatsStmt->fetch() ?: [];
            $turnoutPercentage = (float) ($archivedStats['turnout_percentage'] ?? 0);
        } else {
            $identityColumn = 'voter_student_id';
            $columnStmt = $pdo->query("SHOW COLUMNS FROM votes LIKE 'voter_ref'");
            if ($columnStmt !== false && $columnStmt->fetch() !== false) {
                $identityColumn = 'voter_ref';
            }

            $voteStatsStmt = $pdo->prepare(
                "SELECT COUNT(DISTINCT {$identityColumn}) AS unique_voters
                 FROM votes
                 WHERE election_id = :election_id"
            );
            $voteStatsStmt->execute([':election_id' => $electionId]);
            $voteStats = $voteStatsStmt->fetch() ?: [];
            $uniqueVoters = (int) ($voteStats['unique_voters'] ?? 0);
            $turnoutPercentage = $totalStudents > 0 ? round(($uniqueVoters / $totalStudents) * 100, 2) : 0.0;
        }
    }

    sendJsonResponse([
        'success' => true,
        'stats' => [
            'total_students' => $totalStudents,
            'total_candidates' => $totalCandidates,
            'pending_candidates' => $pendingCandidates,
            'active_elections' => $activeElections,
            'turnout_percentage' => $turnoutPercentage,
        ],
        'latest_election' => $latestElection,
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch admin dashboard data.'], 500);
}
