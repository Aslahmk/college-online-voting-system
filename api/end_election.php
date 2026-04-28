<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();
$input = getJsonInput();
$electionId = (int) ($input['election_id'] ?? 0);

if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $endStmt = $pdo->prepare(
        "UPDATE elections
         SET status = 'ended',
             end_time = NOW()
         WHERE id = :id"
    );
    $endStmt->execute([':id' => $electionId]);

    if ($endStmt->rowCount() === 0) {
        sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
    }

    sendJsonResponse(['success' => true, 'message' => 'Election ended successfully.']);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not end election.'], 500);
}
