<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/vote_privacy.php';

$auth = requireStudentAuth();
$electionId = isset($_GET['election_id']) ? (int) $_GET['election_id'] : 0;

if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id query parameter is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $voterRef = buildAnonymousVoterRef($electionId, (int) $auth['student_id']);
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS vote_count
         FROM votes
         WHERE election_id = :election_id
           AND voter_ref = :voter_ref'
    );
    $stmt->execute([
        ':election_id' => $electionId,
        ':voter_ref' => $voterRef,
    ]);
    $row = $stmt->fetch();
    $voteCount = (int) ($row['vote_count'] ?? 0);

    sendJsonResponse([
        'success' => true,
        'election_id' => $electionId,
        'vote_count' => $voteCount,
        'has_voted' => $voteCount > 0,
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch vote status.'], 500);
}

