<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();

$input = getJsonInput();
$departmentId = (int) ($input['department_id'] ?? 0);

if ($departmentId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid department_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare('DELETE FROM departments WHERE id = :id');
    $stmt->execute([':id' => $departmentId]);

    if ($stmt->rowCount() === 0) {
        sendJsonResponse(['success' => false, 'message' => 'Department not found.'], 404);
    }

    sendJsonResponse(['success' => true, 'message' => 'Department deleted successfully.']);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Department is linked to students or positions and cannot be deleted.',
        ], 409);
    }

    sendJsonResponse(['success' => false, 'message' => 'Could not delete department.'], 500);
}
