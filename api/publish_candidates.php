<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

requirePostMethod();
requireAdminAuth();
$input = getJsonInput();
$electionId = (int) ($input['election_id'] ?? 0);

if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    ensureElectionWorkflowTable($pdo);

    $workflowStmt = $pdo->prepare('SELECT review_deadline_at, candidates_published FROM election_workflow WHERE election_id = :election_id');
    $workflowStmt->execute([':election_id' => $electionId]);
    $workflow = $workflowStmt->fetch();
    if ($workflow === false) {
        sendJsonResponse(['success' => false, 'message' => 'Election workflow not configured.'], 409);
    }

    if ((int) $workflow['candidates_published'] === 1) {
        sendJsonResponse(['success' => true, 'message' => 'Candidate list already published.']);
    }

    $approvedCountStmt = $pdo->prepare("SELECT COUNT(*) AS count FROM candidates WHERE election_id = :election_id AND status = 'approved'");
    $approvedCountStmt->execute([':election_id' => $electionId]);
    $approvedCount = (int) ($approvedCountStmt->fetch()['count'] ?? 0);
    if ($approvedCount === 0) {
        sendJsonResponse(['success' => false, 'message' => 'No approved candidates to publish.'], 409);
    }

    $updateStmt = $pdo->prepare(
        'UPDATE election_workflow
         SET candidates_published = 1, candidates_published_at = NOW()
         WHERE election_id = :election_id'
    );
    $updateStmt->execute([':election_id' => $electionId]);

    sendJsonResponse(['success' => true, 'message' => 'Final candidate list published successfully.']);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not publish candidates.'], 500);
}

