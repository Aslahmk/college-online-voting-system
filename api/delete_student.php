<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();

$input = getJsonInput();
$studentId = (int) ($input['student_id'] ?? 0);

if ($studentId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid student_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare('DELETE FROM students WHERE id = :id');
    $stmt->execute([':id' => $studentId]);

    if ($stmt->rowCount() === 0) {
        sendJsonResponse(['success' => false, 'message' => 'Student not found.'], 404);
    }

    sendJsonResponse(['success' => true, 'message' => 'Student deleted successfully.']);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not delete student.'], 500);
}
