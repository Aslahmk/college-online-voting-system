<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

function requireAdminAuth(): int
{
    if (!isset($_SESSION['admin_id'])) {
        sendJsonResponse(['success' => false, 'message' => 'Admin login required.'], 401);
    }

    return (int) $_SESSION['admin_id'];
}

function requireStudentAuth(): array
{
    if (!isset($_SESSION['student_id'], $_SESSION['student_department_id'])) {
        sendJsonResponse(['success' => false, 'message' => 'Student login required.'], 401);
    }

    return [
        'student_id' => (int) $_SESSION['student_id'],
        'department_id' => (int) $_SESSION['student_department_id'],
    ];
}
