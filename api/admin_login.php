<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

requirePostMethod();
$input = getJsonInput();

$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($email === '' || $password === '') {
    sendJsonResponse(['success' => false, 'message' => 'Email and password are required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare('SELECT id, college_name, admin_name, email, password_hash FROM admins WHERE email = :email');
    $stmt->execute([':email' => $email]);
    $admin = $stmt->fetch();

    if ($admin === false || !password_verify($password, $admin['password_hash'])) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid credentials.'], 401);
    }

    $_SESSION['admin_id'] = (int) $admin['id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['admin_name'] = $admin['admin_name'];

    sendJsonResponse([
        'success' => true,
        'message' => 'Admin login successful.',
        'admin' => [
            'id' => (int) $admin['id'],
            'college_name' => $admin['college_name'],
            'admin_name' => $admin['admin_name'],
            'email' => $admin['email'],
        ],
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Login failed.'], 500);
}
