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
    $stmt = $pdo->prepare(
        "UPDATE elections
         SET status = 'draft', published_results = 0
         WHERE id = :id"
    );
    $stmt->execute([':id' => $electionId]);

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM elections WHERE id = :id');
        $existsStmt->execute([':id' => $electionId]);
        if ($existsStmt->fetch() === false) {
            sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
        }
    }

    sendJsonResponse(['success' => true, 'message' => 'Election moved to upcoming status.']);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not update election status.'], 500);
}
