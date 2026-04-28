<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
$auth = requireStudentAuth();
$input = getJsonInput();
$candidateId = (int) ($input['candidate_id'] ?? 0);

if ($candidateId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid candidate_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();

    $candidateStmt = $pdo->prepare(
        "SELECT id, student_id, status, photo_path
         FROM candidates
         WHERE id = :candidate_id
         LIMIT 1"
    );
    $candidateStmt->execute([':candidate_id' => $candidateId]);
    $candidate = $candidateStmt->fetch();

    if ($candidate === false) {
        sendJsonResponse(['success' => false, 'message' => 'Application not found.'], 404);
    }

    if ((int) $candidate['student_id'] !== (int) $auth['student_id']) {
        sendJsonResponse(['success' => false, 'message' => 'You can only revoke your own application.'], 403);
    }

    if ((string) $candidate['status'] !== 'pending') {
        sendJsonResponse(['success' => false, 'message' => 'Only pending applications can be revoked.'], 409);
    }

    $deleteStmt = $pdo->prepare('DELETE FROM candidates WHERE id = :candidate_id');
    $deleteStmt->execute([':candidate_id' => $candidateId]);

    $photoPath = trim((string) ($candidate['photo_path'] ?? ''));
    if ($photoPath !== '') {
        $resolvedPath = realpath(dirname(__DIR__) . DIRECTORY_SEPARATOR . $photoPath);
        $uploadsRoot = realpath(dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads');
        if ($resolvedPath !== false && $uploadsRoot !== false) {
            $isInsideUploads = str_starts_with($resolvedPath, $uploadsRoot . DIRECTORY_SEPARATOR);
            if ($isInsideUploads && is_file($resolvedPath)) {
                @unlink($resolvedPath);
            }
        }
    }

    sendJsonResponse([
        'success' => true,
        'message' => 'Your application has been withdrawn.',
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not revoke application.'], 500);
}
