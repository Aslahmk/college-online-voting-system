<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election.php';
require_once dirname(__DIR__) . '/utils/vote_privacy.php';

requirePostMethod();
$auth = requireStudentAuth();
$input = getJsonInput();

$candidateId = (int) ($input['candidate_id'] ?? 0);

if ($candidateId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid candidate_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $activeElection = getActiveElection($pdo);
    if ($activeElection === null) {
        sendJsonResponse(['success' => false, 'message' => 'No active election.'], 409);
    }

    $now = time();
    $startTime = !empty($activeElection['start_time']) ? strtotime((string) $activeElection['start_time']) : null;
    $endTime = !empty($activeElection['end_time']) ? strtotime((string) $activeElection['end_time']) : null;

    if ($endTime !== null && $now > $endTime) {
        $endStmt = $pdo->prepare("UPDATE elections SET status = 'ended', end_time = NOW() WHERE id = :id");
        $endStmt->execute([':id' => (int) $activeElection['id']]);
        sendJsonResponse(['success' => false, 'message' => 'Voting is closed. Election time has ended.'], 409);
    }

    $candidateStmt = $pdo->prepare(
        "SELECT c.id, c.election_id, c.position_id, c.status,
                p.scope, p.department_id AS position_department_id
         FROM candidates c
         INNER JOIN positions p ON p.id = c.position_id
         WHERE c.id = :candidate_id"
    );
    $candidateStmt->execute([':candidate_id' => $candidateId]);
    $candidate = $candidateStmt->fetch();

    if ($candidate === false || (int) $candidate['election_id'] !== (int) $activeElection['id']) {
        sendJsonResponse(['success' => false, 'message' => 'Candidate not valid for active election.'], 404);
    }

    if ($candidate['status'] !== 'approved') {
        sendJsonResponse(['success' => false, 'message' => 'You can vote only for approved candidates.'], 403);
    }

    if ($candidate['scope'] === 'department' && (int) $candidate['position_department_id'] !== $auth['department_id']) {
        sendJsonResponse(['success' => false, 'message' => 'Department restriction: cannot vote for this position.'], 403);
    }

    $voterRef = buildAnonymousVoterRef((int) $activeElection['id'], (int) $auth['student_id']);

    $voteStmt = $pdo->prepare(
        'INSERT INTO votes (election_id, position_id, candidate_id, voter_ref)
         VALUES (:election_id, :position_id, :candidate_id, :voter_ref)'
    );
    $voteStmt->execute([
        ':election_id' => (int) $activeElection['id'],
        ':position_id' => (int) $candidate['position_id'],
        ':candidate_id' => $candidateId,
        ':voter_ref' => $voterRef,
    ]);

    sendJsonResponse(['success' => true, 'message' => 'Vote cast successfully.']);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'You already voted for this position.'], 409);
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not cast vote.'], 500);
}
