<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/result_archive.php';

requirePostMethod();
requireAdminAuth();
$input = getJsonInput();
$electionId = (int) ($input['election_id'] ?? 0);

if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    // Ensure archive/workflow tables exist before opening transaction.
    // CREATE TABLE can cause implicit commit in MySQL, which breaks active transactions.
    ensureElectionWorkflowTable($pdo);
    ensureResultArchiveTables($pdo);
    $pdo->beginTransaction();

    $electionStmt = $pdo->prepare('SELECT id, status, end_time, published_results FROM elections WHERE id = :id');
    $electionStmt->execute([':id' => $electionId]);
    $election = $electionStmt->fetch();
    if ($election === false) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'message' => 'Election not found.'], 404);
    }

    $now = time();
    $endTime = !empty($election['end_time']) ? strtotime((string) $election['end_time']) : null;
    $canPublish = $election['status'] === 'ended'
        || ($election['status'] === 'active' && $endTime !== null && $now > $endTime);

    if (!$canPublish) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'message' => 'Results can be published only after election is ended.'], 409);
    }

    if ($election['status'] !== 'ended') {
        $endStmt = $pdo->prepare("UPDATE elections SET status = 'ended' WHERE id = :id");
        $endStmt->execute([':id' => $electionId]);
    }

    archiveElectionResultsAndCleanup($pdo, $electionId);

    $pdo->commit();
    sendJsonResponse(['success' => true, 'message' => 'Results published and old election data archived/cleaned successfully.']);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse([
        'success' => false,
        'message' => 'Could not publish results.',
        'error' => $exception->getMessage(),
    ], 500);
}
