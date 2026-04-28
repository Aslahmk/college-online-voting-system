<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requireStudentAuth();

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        'SELECT s.id, s.name, s.register_number, s.department_id, s.email, s.level, s.gender, d.name AS department_name
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.id = :student_id AND s.is_active = 1'
    );
    $stmt->execute([':student_id' => $_SESSION['student_id']]);
    $student = $stmt->fetch();

    if ($student === false) {
        sendJsonResponse(['success' => false, 'message' => 'Student not found.'], 404);
    }

    sendJsonResponse([
        'success' => true,
        'student' => [
            'id' => (int) $student['id'],
            'name' => $student['name'],
            'register_number' => $student['register_number'],
            'department_id' => (int) $student['department_id'],
            'department_name' => $student['department_name'] ?? 'Unknown',
            'email' => $student['email'] ?? '',
            'level' => $student['level'] ?? '',
            'gender' => $student['gender'] ?? '',
        ],
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Failed to fetch student data.'], 500);
}

