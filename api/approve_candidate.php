<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

requirePostMethod();
$adminId = requireAdminAuth();
$input = getJsonInput();

$candidateId = (int) ($input['candidate_id'] ?? 0);
$action = trim((string) ($input['action'] ?? ''));
$rejectionReason = trim((string) ($input['rejection_reason'] ?? ''));

if ($candidateId <= 0 || !in_array($action, ['approve', 'reject'], true)) {
    sendJsonResponse(['success' => false, 'message' => 'candidate_id and valid action are required.'], 422);
}

$status = $action === 'approve' ? 'approved' : 'rejected';

try {
    $pdo = Database::getConnection();
    ensureElectionWorkflowTable($pdo);

    $candidateStmt = $pdo->prepare('SELECT id, election_id FROM candidates WHERE id = :candidate_id');
    $candidateStmt->execute([':candidate_id' => $candidateId]);
    $candidate = $candidateStmt->fetch();
    if ($candidate === false) {
        sendJsonResponse(['success' => false, 'message' => 'Candidate not found.'], 404);
    }

    $workflowStmt = $pdo->prepare('SELECT review_deadline_at FROM election_workflow WHERE election_id = :election_id');
    $workflowStmt->execute([':election_id' => (int) $candidate['election_id']]);
    $workflow = $workflowStmt->fetch();
    if ($workflow === false) {
        sendJsonResponse(['success' => false, 'message' => 'Election workflow not configured.'], 409);
    }

    $stmt = $pdo->prepare(
        'UPDATE candidates
         SET status = :status,
             rejection_reason = :rejection_reason,
             reviewed_by_admin_id = :admin_id,
             reviewed_at = NOW()
         WHERE id = :candidate_id'
    );
    $stmt->execute([
        ':status' => $status,
        ':rejection_reason' => $status === 'rejected' ? ($rejectionReason !== '' ? $rejectionReason : 'Not specified') : null,
        ':admin_id' => $adminId,
        ':candidate_id' => (int) $candidate['id'],
    ]);

    if ($stmt->rowCount() === 0) {
        sendJsonResponse(['success' => false, 'message' => 'Candidate not found or unchanged.'], 404);
    }

    sendJsonResponse(['success' => true, 'message' => 'Candidate status updated successfully.', 'status' => $status]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not review candidate.'], 500);
}
