<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/utils/department_schema.php';

try {
    $pdo = Database::getConnection();
    ensureDepartmentExtendedColumns($pdo);
    $hasDeptCode = departmentColumnExists($pdo, 'dept_code');
    $hasUgPrograms = departmentColumnExists($pdo, 'ug_programs');
    $hasPgPrograms = departmentColumnExists($pdo, 'pg_programs');
    $hasIsActive = departmentColumnExists($pdo, 'is_active');

    $selectParts = [
        'd.id',
        'd.name',
        'd.created_at',
        '(SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) AS student_count',
    ];

    $selectParts[] = $hasDeptCode ? 'd.dept_code' : 'NULL AS dept_code';
    $selectParts[] = $hasUgPrograms ? 'd.ug_programs' : 'NULL AS ug_programs';
    $selectParts[] = $hasPgPrograms ? 'd.pg_programs' : 'NULL AS pg_programs';
    $selectParts[] = $hasIsActive ? 'd.is_active' : '1 AS is_active';

    $query = sprintf(
        'SELECT %s
         FROM departments d
         ORDER BY d.name ASC',
        implode(', ', $selectParts)
    );

    $departments = $pdo->query($query)->fetchAll();

    sendJsonResponse(['success' => true, 'departments' => $departments]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch departments.'], 500);
}
