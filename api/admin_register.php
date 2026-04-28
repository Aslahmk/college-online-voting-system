<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

requirePostMethod();
$input = getJsonInput();

$collegeName = trim((string) ($input['college_name'] ?? ''));
$adminName = trim((string) ($input['admin_name'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($collegeName === '' || $adminName === '' || $email === '' || $password === '') {
    sendJsonResponse(['success' => false, 'message' => 'All fields are required.'], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(['success' => false, 'message' => 'Invalid email format.'], 422);
}

try {
    $pdo = Database::getConnection();
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        'INSERT INTO admins (college_name, admin_name, email, password_hash)
         VALUES (:college_name, :admin_name, :email, :password_hash)'
    );
    $stmt->execute([
        ':college_name' => $collegeName,
        ':admin_name' => $adminName,
        ':email' => $email,
        ':password_hash' => $passwordHash,
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Admin registered successfully.',
        'admin_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'Email already registered.'], 409);
    }

    sendJsonResponse(['success' => false, 'message' => 'Registration failed.'], 500);
}
