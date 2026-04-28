<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/department_schema.php';

requireAdminAuth();

try {
    $pdo = Database::getConnection();
    ensureDepartmentExtendedColumns($pdo);
    $query = $pdo->query(
        "SELECT s.id, s.name, s.register_number, s.email, s.department_id, d.name AS department, s.level, s.gender, s.is_active, s.created_at,
                d.ug_programs, d.pg_programs,
                CASE
                    WHEN UPPER(COALESCE(s.level, '')) = 'UG' THEN d.ug_programs
                    WHEN UPPER(COALESCE(s.level, '')) = 'PG' THEN d.pg_programs
                    ELSE NULL
                END AS program
         FROM students s
         INNER JOIN departments d ON d.id = s.department_id
         ORDER BY s.created_at DESC"
    );
    $students = $query->fetchAll();

    sendJsonResponse(['success' => true, 'students' => $students]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch students.'], 500);
}
