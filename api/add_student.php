<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();

$input = getJsonInput();

$name = trim((string) ($input['name'] ?? ''));
$registerNumber = strtoupper(trim((string) ($input['register_number'] ?? '')));
$departmentId = (int) ($input['department_id'] ?? 0);
$email = trim((string) ($input['email'] ?? ''));
$level = trim((string) ($input['level'] ?? ''));
$gender = trim((string) ($input['gender'] ?? ''));
$plainPassword = (string) ($input['password'] ?? '');
$autoGenerate = (bool) ($input['auto_generate_password'] ?? false);

if ($name === '' || $registerNumber === '' || $departmentId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'name, register_number and department_id are required.'], 422);
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(['success' => false, 'message' => 'Invalid email format.'], 422);
}

if ($autoGenerate || $plainPassword === '') {
    // Generate a readable temporary password for first login.
    $plainPassword = 'STD@' . random_int(100000, 999999);
}
try {
    $pdo = Database::getConnection();

    $deptCheck = $pdo->prepare('SELECT id FROM departments WHERE id = :id');
    $deptCheck->execute([':id' => $departmentId]);
    if ($deptCheck->fetch() === false) {
        sendJsonResponse(['success' => false, 'message' => 'Department not found.'], 404);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO students (name, register_number, department_id, email, level, gender, password_hash, security_code)
         VALUES (:name, :register_number, :department_id, :email, :level, :gender, :password_hash, :security_code)'
    );
    $stmt->execute([
        ':name' => $name,
        ':register_number' => $registerNumber,
        ':department_id' => $departmentId,
        ':email' => $email !== '' ? $email : null,
        ':level' => $level !== '' ? $level : null,
        ':gender' => $gender !== '' ? $gender : null,
        ':password_hash' => password_hash($plainPassword, PASSWORD_DEFAULT),
        ':security_code' => null,
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Student added successfully.',
        'student_id' => (int) $pdo->lastInsertId(),
        'register_number' => $registerNumber,
        'generated_password' => $plainPassword,
    ], 201);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'Register number or email already exists.'], 409);
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not add student.'], 500);
}
