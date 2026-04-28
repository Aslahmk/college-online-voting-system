<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();

if (!isset($_FILES['students_file'])) {
    sendJsonResponse(['success' => false, 'message' => 'students_file is required.'], 422);
}

$file = $_FILES['students_file'];
if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    sendJsonResponse(['success' => false, 'message' => 'File upload failed.'], 422);
}

$tmpPath = (string) ($file['tmp_name'] ?? '');
$originalName = (string) ($file['name'] ?? 'students.csv');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($extension, ['csv'], true)) {
    sendJsonResponse([
        'success' => false,
        'message' => 'Only CSV is supported right now. Please save your Excel sheet as CSV and upload.',
    ], 422);
}

$handle = fopen($tmpPath, 'rb');
if ($handle === false) {
    sendJsonResponse(['success' => false, 'message' => 'Could not read uploaded file.'], 500);
}

try {
    $header = fgetcsv($handle);
    if (!is_array($header)) {
        sendJsonResponse(['success' => false, 'message' => 'CSV is empty.'], 422);
    }

    $normalize = static function (string $value): string {
        $value = strtolower(trim($value));
        return preg_replace('/[^a-z0-9]/', '', $value) ?? '';
    };

    $headerMap = [];
    foreach ($header as $index => $column) {
        $headerMap[$normalize((string) $column)] = $index;
    }

    $pickColumn = static function (array $map, array $aliases): ?int {
        foreach ($aliases as $alias) {
            if (array_key_exists($alias, $map)) {
                return (int) $map[$alias];
            }
        }
        return null;
    };

    $nameCol = $pickColumn($headerMap, ['name', 'studentname', 'fullname']);
    $regCol = $pickColumn($headerMap, ['registerno', 'registernumber', 'regno', 'register', 'registerid']);
    $emailCol = $pickColumn($headerMap, ['email', 'mail']);
    $deptCol = $pickColumn($headerMap, ['department', 'departmentname', 'dept', 'deptname', 'departmentcode', 'deptcode']);
    $levelCol = $pickColumn($headerMap, ['level', 'ugpg', 'programlevel']);
    $genderCol = $pickColumn($headerMap, ['gender', 'sex']);

    if ($nameCol === null || $regCol === null || $deptCol === null || $levelCol === null || $genderCol === null) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Required headers: Name, Register Number, Department, Level, Gender (Email optional).',
        ], 422);
    }

    $pdo = Database::getConnection();

    $deptStmt = $pdo->query('SELECT id, name, dept_code FROM departments');
    $departments = $deptStmt->fetchAll();
    $deptByKey = [];
    foreach ($departments as $department) {
        $id = (int) ($department['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }
        $nameKey = $normalize((string) ($department['name'] ?? ''));
        if ($nameKey !== '') {
            $deptByKey[$nameKey] = $id;
        }
        $codeKey = $normalize((string) ($department['dept_code'] ?? ''));
        if ($codeKey !== '') {
            $deptByKey[$codeKey] = $id;
        }
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO students (name, register_number, department_id, email, level, gender, password_hash, security_code)
         VALUES (:name, :register_number, :department_id, :email, :level, :gender, :password_hash, :security_code)'
    );

    $insertedCount = 0;
    $skippedCount = 0;
    $errors = [];
    $rowNumber = 1;

    while (($row = fgetcsv($handle)) !== false) {
        $rowNumber++;
        if (!is_array($row)) {
            $skippedCount++;
            $errors[] = ['row' => $rowNumber, 'message' => 'Invalid CSV row format.'];
            continue;
        }

        $name = trim((string) ($row[$nameCol] ?? ''));
        $registerNumber = strtoupper(trim((string) ($row[$regCol] ?? '')));
        $email = trim((string) ($emailCol !== null ? ($row[$emailCol] ?? '') : ''));
        $departmentRaw = trim((string) ($row[$deptCol] ?? ''));
        $level = strtoupper(trim((string) ($row[$levelCol] ?? '')));
        $gender = trim((string) ($row[$genderCol] ?? ''));

        if ($name === '' && $registerNumber === '' && $departmentRaw === '') {
            continue;
        }

        if ($name === '' || $registerNumber === '' || $departmentRaw === '' || $level === '' || $gender === '') {
            $skippedCount++;
            $errors[] = ['row' => $rowNumber, 'message' => 'Missing required value(s).'];
            continue;
        }

        if (!in_array($level, ['UG', 'PG'], true)) {
            $skippedCount++;
            $errors[] = ['row' => $rowNumber, 'message' => 'Level must be UG or PG.'];
            continue;
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $skippedCount++;
            $errors[] = ['row' => $rowNumber, 'message' => 'Invalid email format.'];
            continue;
        }

        $departmentId = 0;
        if (is_numeric($departmentRaw)) {
            $departmentId = (int) $departmentRaw;
        } else {
            $departmentId = (int) ($deptByKey[$normalize($departmentRaw)] ?? 0);
        }
        if ($departmentId <= 0) {
            $skippedCount++;
            $errors[] = ['row' => $rowNumber, 'message' => 'Department not found. Use valid department name/code/id.'];
            continue;
        }

        $plainPassword = 'STD@' . random_int(100000, 999999);
        try {
            $insertStmt->execute([
                ':name' => $name,
                ':register_number' => $registerNumber,
                ':department_id' => $departmentId,
                ':email' => $email !== '' ? $email : null,
                ':level' => $level,
                ':gender' => $gender,
                ':password_hash' => password_hash($plainPassword, PASSWORD_DEFAULT),
                ':security_code' => null,
            ]);
            $insertedCount++;
        } catch (PDOException $exception) {
            $skippedCount++;
            if ((int) $exception->getCode() === 23000) {
                $errors[] = ['row' => $rowNumber, 'message' => 'Duplicate register number or email.'];
            } else {
                $errors[] = ['row' => $rowNumber, 'message' => 'Database insert failed.'];
            }
        }
    }

    sendJsonResponse([
        'success' => true,
        'message' => 'Upload processed.',
        'inserted_count' => $insertedCount,
        'skipped_count' => $skippedCount,
        'errors' => $errors,
    ]);
} finally {
    fclose($handle);
}
