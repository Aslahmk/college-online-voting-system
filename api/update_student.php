<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();

$input = getJsonInput();
$studentId = (int) ($input['student_id'] ?? 0);
$name = trim((string) ($input['name'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$departmentId = (int) ($input['department_id'] ?? 0);
$level = strtoupper(trim((string) ($input['level'] ?? '')));
$gender = trim((string) ($input['gender'] ?? ''));
$isActive = (int) ($input['is_active'] ?? 1) === 1 ? 1 : 0;

if ($studentId <= 0 || $name === '' || $departmentId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'student_id, name and department_id are required.'], 422);
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(['success' => false, 'message' => 'Invalid email format.'], 422);
}

if ($level !== '' && !in_array($level, ['UG', 'PG'], true)) {
    sendJsonResponse(['success' => false, 'message' => 'level must be UG or PG.'], 422);
}

try {
    $pdo = Database::getConnection();

    $deptCheck = $pdo->prepare('SELECT id FROM departments WHERE id = :id');
    $deptCheck->execute([':id' => $departmentId]);
    if ($deptCheck->fetch() === false) {
        sendJsonResponse(['success' => false, 'message' => 'Department not found.'], 404);
    }

    $stmt = $pdo->prepare(
        'UPDATE students
         SET name = :name,
             email = :email,
             department_id = :department_id,
             level = :level,
             gender = :gender,
             is_active = :is_active
         WHERE id = :id'
    );
    $stmt->execute([
        ':name' => $name,
        ':email' => $email !== '' ? $email : null,
        ':department_id' => $departmentId,
        ':level' => $level !== '' ? $level : null,
        ':gender' => $gender !== '' ? $gender : null,
        ':is_active' => $isActive,
        ':id' => $studentId,
    ]);

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM students WHERE id = :id');
        $existsStmt->execute([':id' => $studentId]);
        if ($existsStmt->fetch() === false) {
            sendJsonResponse(['success' => false, 'message' => 'Student not found.'], 404);
        }
    }

    sendJsonResponse(['success' => true, 'message' => 'Student updated successfully.']);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'Email already exists.'], 409);
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not update student.'], 500);
}
