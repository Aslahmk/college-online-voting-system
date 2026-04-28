<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

$auth = requireStudentAuth();

try {
    $pdo = Database::getConnection();
    // Always prioritize the active election for vote page.
    $activeStmt = $pdo->query(
        "SELECT id, title, status, start_time, end_time
         FROM elections
         WHERE status = 'active'
         ORDER BY id DESC
         LIMIT 1"
    );
    $currentElection = $activeStmt->fetch();
    if ($currentElection === false) {
        // If nothing is active yet, show latest draft for candidate preview.
        $draftStmt = $pdo->query(
            "SELECT id, title, status, start_time, end_time
             FROM elections
             WHERE status = 'draft'
             ORDER BY start_time DESC, id DESC
             LIMIT 1"
        );
        $currentElection = $draftStmt->fetch();
    }
    if ($currentElection === false) {
        sendJsonResponse([
            'success' => true,
            'message' => 'No election configured yet.',
            'election' => null,
            'can_vote' => false,
            'candidates' => [],
        ]);
    }

    $now = time();
    $startTime = !empty($currentElection['start_time']) ? strtotime((string) $currentElection['start_time']) : null;
    $endTime = !empty($currentElection['end_time']) ? strtotime((string) $currentElection['end_time']) : null;
    $status = strtolower((string) ($currentElection['status'] ?? ''));
    $canVote = $status === 'active';
    $voteMessage = 'Voting is active.';
    $stateLabel = 'Live';

    if ($status === 'ended') {
        $canVote = false;
        $voteMessage = 'Voting is closed. Election has ended.';
        $stateLabel = 'Closed';
    } elseif ($status !== 'active') {
        $canVote = false;
        $voteMessage = 'Election is not started yet. You can view candidates now, voting starts when admin starts election.';
        $stateLabel = 'Upcoming';
    } elseif ($endTime !== null && $now > $endTime) {
        $canVote = false;
        $voteMessage = 'Voting is closed. Election time has ended.';
        $stateLabel = 'Closed';
        $endStmt = $pdo->prepare("UPDATE elections SET status = 'ended', end_time = NOW() WHERE id = :id");
        $endStmt->execute([':id' => (int) $currentElection['id']]);
        $currentElection['status'] = 'ended';
    }

    $stmt = $pdo->prepare(
        "SELECT c.id AS candidate_id, c.manifesto, c.photo_path,
                s.name AS candidate_name, s.register_number,
                p.id AS position_id, p.name AS position_name, p.scope,
                d.name AS department_name
         FROM candidates c
         INNER JOIN students s ON s.id = c.student_id
         INNER JOIN positions p ON p.id = c.position_id
         LEFT JOIN departments d ON d.id = p.department_id
         WHERE c.election_id = :election_id
           AND c.status = 'approved'
           AND (p.scope = 'general' OR p.department_id = :student_department_id)
         ORDER BY p.name ASC, s.name ASC"
    );
    $stmt->execute([
        ':election_id' => (int) $currentElection['id'],
        ':student_department_id' => (int) $auth['department_id'],
    ]);
    $eligibleCandidates = $stmt->fetchAll();
    $approvedStmt = $pdo->prepare(
        "SELECT COUNT(*) AS approved_count
         FROM candidates
         WHERE election_id = :election_id
           AND status = 'approved'"
    );
    $approvedStmt->execute([':election_id' => (int) $currentElection['id']]);
    $approvedCountRow = $approvedStmt->fetch();
    $approvedCount = (int) ($approvedCountRow['approved_count'] ?? 0);

    if (!$eligibleCandidates) {
        $message = $approvedCount > 0
            ? ($stateLabel . ': No approved candidates are available for your eligible seats (department/gender restrictions).')
            : ($stateLabel . ': No approved candidates are available yet.');

        sendJsonResponse([
            'success' => true,
            'message' => $message . ' (Election: ' . $currentElection['title'] . ', ID: ' . $currentElection['id'] . ')',
            'election' => $currentElection,
            'can_vote' => $canVote,
            'state_label' => $stateLabel,
            'approved_count_for_election' => $approvedCount,
            'eligible_count_for_student' => 0,
            'candidates' => [],
        ]);
    }

    sendJsonResponse([
        'success' => true,
        'message' => $voteMessage,
        'election' => $currentElection,
        'can_vote' => $canVote,
        'state_label' => $stateLabel,
        'approved_count_for_election' => $approvedCount,
        'eligible_count_for_student' => count($eligibleCandidates),
        'candidates' => $eligibleCandidates,
    ]);
} catch (PDOException $exception) {
    sendJsonResponse([
        'success' => false,
        'message' => 'Could not load voting ballot: ' . $exception->getMessage(),
    ], 500);
}

