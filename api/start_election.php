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
    $pdo->beginTransaction();

    $activeCheck = $pdo->query("SELECT id FROM elections WHERE status = 'active' LIMIT 1")->fetch();
    if ($activeCheck !== false) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'message' => 'Another election is already active.'], 409);
    }

    $electionStmt = $pdo->prepare('SELECT id, start_time FROM elections WHERE id = :id AND status IN (\'draft\', \'ended\')');
    $electionStmt->execute([':id' => $electionId]);
    $election = $electionStmt->fetch();
    if ($election === false) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
    }

    $currentStart = !empty($election['start_time']) ? strtotime((string) $election['start_time']) : false;
    $shouldResetStart = $currentStart === false || $currentStart > time();

    $stmt = $pdo->prepare(
        "UPDATE elections
         SET status = 'active',
             start_time = CASE
                WHEN :reset_start = 1 THEN NOW()
                ELSE start_time
             END
         WHERE id = :id"
    );
    $stmt->execute([
        ':id' => $electionId,
        ':reset_start' => $shouldResetStart ? 1 : 0,
    ]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
    }

    $pdo->commit();
    sendJsonResponse(['success' => true, 'message' => 'Election started successfully.']);
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not start election.'], 500);
}
