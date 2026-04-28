<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/department_schema.php';

requirePostMethod();
requireAdminAuth();

$input = getJsonInput();
$name = trim((string) ($input['name'] ?? ''));
$deptCode = trim((string) ($input['dept_code'] ?? ''));
$ugPrograms = trim((string) ($input['ug_programs'] ?? ''));
$pgPrograms = trim((string) ($input['pg_programs'] ?? ''));
$statusInput = strtolower(trim((string) ($input['status'] ?? 'active')));
$isActive = $statusInput === 'inactive' ? 0 : 1;

if ($name === '') {
    sendJsonResponse(['success' => false, 'message' => 'Department name is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    ensureDepartmentExtendedColumns($pdo);
    $hasDeptCode = departmentColumnExists($pdo, 'dept_code');
    $hasUgPrograms = departmentColumnExists($pdo, 'ug_programs');
    $hasPgPrograms = departmentColumnExists($pdo, 'pg_programs');
    $hasIsActive = departmentColumnExists($pdo, 'is_active');

    $columns = ['name'];
    $placeholders = [':name'];
    $params = [':name' => $name];

    if ($hasDeptCode) {
        $columns[] = 'dept_code';
        $placeholders[] = ':dept_code';
        $params[':dept_code'] = $deptCode !== '' ? $deptCode : null;
    }
    if ($hasUgPrograms) {
        $columns[] = 'ug_programs';
        $placeholders[] = ':ug_programs';
        $params[':ug_programs'] = $ugPrograms !== '' ? $ugPrograms : null;
    }
    if ($hasPgPrograms) {
        $columns[] = 'pg_programs';
        $placeholders[] = ':pg_programs';
        $params[':pg_programs'] = $pgPrograms !== '' ? $pgPrograms : null;
    }
    if ($hasIsActive) {
        $columns[] = 'is_active';
        $placeholders[] = ':is_active';
        $params[':is_active'] = $isActive;
    }

    $stmt = $pdo->prepare(
        sprintf(
            'INSERT INTO departments (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', $placeholders)
        )
    );
    $stmt->execute($params);

    sendJsonResponse([
        'success' => true,
        'message' => 'Department added successfully.',
        'department_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'Department already exists.'], 409);
    }

    sendJsonResponse(['success' => false, 'message' => 'Could not add department.'], 500);
}
