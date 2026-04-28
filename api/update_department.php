<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/department_schema.php';

requirePostMethod();
requireAdminAuth();

$input = getJsonInput();
$departmentId = (int) ($input['department_id'] ?? 0);
$name = trim((string) ($input['name'] ?? ''));
$deptCode = trim((string) ($input['dept_code'] ?? ''));
$ugPrograms = trim((string) ($input['ug_programs'] ?? ''));
$pgPrograms = trim((string) ($input['pg_programs'] ?? ''));
$statusInput = strtolower(trim((string) ($input['status'] ?? 'active')));
$isActive = $statusInput === 'inactive' ? 0 : 1;

if ($departmentId <= 0 || $name === '') {
    sendJsonResponse(['success' => false, 'message' => 'department_id and name are required.'], 422);
}

try {
    $pdo = Database::getConnection();
    ensureDepartmentExtendedColumns($pdo);
    $hasDeptCode = departmentColumnExists($pdo, 'dept_code');
    $hasUgPrograms = departmentColumnExists($pdo, 'ug_programs');
    $hasPgPrograms = departmentColumnExists($pdo, 'pg_programs');
    $hasIsActive = departmentColumnExists($pdo, 'is_active');

    $setParts = ['name = :name'];
    $params = [
        ':name' => $name,
        ':id' => $departmentId,
    ];

    if ($hasDeptCode) {
        $setParts[] = 'dept_code = :dept_code';
        $params[':dept_code'] = $deptCode !== '' ? $deptCode : null;
    }
    if ($hasUgPrograms) {
        $setParts[] = 'ug_programs = :ug_programs';
        $params[':ug_programs'] = $ugPrograms !== '' ? $ugPrograms : null;
    }
    if ($hasPgPrograms) {
        $setParts[] = 'pg_programs = :pg_programs';
        $params[':pg_programs'] = $pgPrograms !== '' ? $pgPrograms : null;
    }
    if ($hasIsActive) {
        $setParts[] = 'is_active = :is_active';
        $params[':is_active'] = $isActive;
    }

    $stmt = $pdo->prepare(
        sprintf(
            'UPDATE departments SET %s WHERE id = :id',
            implode(', ', $setParts)
        )
    );
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM departments WHERE id = :id');
        $existsStmt->execute([':id' => $departmentId]);
        if ($existsStmt->fetch() === false) {
            sendJsonResponse(['success' => false, 'message' => 'Department not found.'], 404);
        }
    }

    sendJsonResponse(['success' => true, 'message' => 'Department updated successfully.']);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'Department name already exists.'], 409);
    }

    sendJsonResponse(['success' => false, 'message' => 'Could not update department.'], 500);
}
