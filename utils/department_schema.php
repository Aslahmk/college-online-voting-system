<?php
declare(strict_types=1);

function departmentColumnExists(PDO $pdo, string $column): bool
{
    if (!preg_match('/^[a-z_]+$/', $column)) {
        return false;
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM departments LIKE '{$column}'");
    if ($stmt === false) {
        return false;
    }

    return $stmt->fetch() !== false;
}

function ensureDepartmentExtendedColumns(PDO $pdo): void
{
    if (!departmentColumnExists($pdo, 'dept_code')) {
        $pdo->exec('ALTER TABLE departments ADD COLUMN dept_code VARCHAR(50) NULL');
    }
    if (!departmentColumnExists($pdo, 'ug_programs')) {
        $pdo->exec('ALTER TABLE departments ADD COLUMN ug_programs TEXT NULL');
    }
    if (!departmentColumnExists($pdo, 'pg_programs')) {
        $pdo->exec('ALTER TABLE departments ADD COLUMN pg_programs TEXT NULL');
    }
    if (!departmentColumnExists($pdo, 'is_active')) {
        $pdo->exec('ALTER TABLE departments ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
    }
}
