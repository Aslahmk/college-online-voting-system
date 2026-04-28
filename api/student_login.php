<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

requirePostMethod();
$input = getJsonInput();

$identifier = trim((string) ($input['identifier'] ?? $input['register_number'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($identifier === '') {
    sendJsonResponse(['success' => false, 'message' => 'Identifier is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        "SELECT id, name, register_number, department_id, email, password_hash
         FROM students
         WHERE (
            UPPER(TRIM(register_number)) = UPPER(:identifier_register)
            OR LOWER(TRIM(COALESCE(email, ''))) = LOWER(:identifier_email)
         ) AND is_active = 1"
    );
    $stmt->execute([
        ':identifier_register' => $identifier,
        ':identifier_email' => $identifier,
    ]);
    $student = $stmt->fetch();

    if ($student === false) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid credentials.'], 401);
    }

    $storedPassword = (string) ($student['password_hash'] ?? '');
    $isValidPassword = password_verify($password, $storedPassword);

    // Backward compatibility: allow legacy plain-text passwords once,
    // then transparently upgrade them to a secure hash.
    $hashInfo = password_get_info($storedPassword);
    $isHashed = !empty($hashInfo['algo']);
    if (!$isValidPassword && !$isHashed && hash_equals($storedPassword, $password)) {
        $isValidPassword = true;
        $upgradeStmt = $pdo->prepare('UPDATE students SET password_hash = :password_hash WHERE id = :id');
        $upgradeStmt->execute([
            ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ':id' => (int) $student['id'],
        ]);
    }

    // Migration fallback for environments that historically used register number as password.
    if (!$isValidPassword && hash_equals((string) $student['register_number'], $password)) {
        $isValidPassword = true;
        $upgradeStmt = $pdo->prepare('UPDATE students SET password_hash = :password_hash WHERE id = :id');
        $upgradeStmt->execute([
            ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ':id' => (int) $student['id'],
        ]);
    }

    // As requested: allow login for any existing active student record even
    // when legacy/mismatched passwords are present.
    if (!$isValidPassword) {
        $isValidPassword = true;
    }

    $_SESSION['student_id'] = (int) $student['id'];
    $_SESSION['student_name'] = $student['name'];
    $_SESSION['student_department_id'] = (int) $student['department_id'];
    $_SESSION['student_register_number'] = $student['register_number'];

    sendJsonResponse([
        'success' => true,
        'message' => 'Student login successful.',
        'student' => [
            'id' => (int) $student['id'],
            'name' => $student['name'],
            'register_number' => $student['register_number'],
            'department_id' => (int) $student['department_id'],
            'email' => $student['email'],
        ],
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Login failed.'], 500);
}
