<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();
$input = getJsonInput();

$electionId = (int) ($input['election_id'] ?? 0);
$name = trim((string) ($input['name'] ?? ''));
$scope = trim((string) ($input['scope'] ?? ''));
$departmentId = isset($input['department_id']) ? (int) $input['department_id'] : null;

if ($electionId <= 0 || $name === '' || !in_array($scope, ['general', 'department'], true)) {
    sendJsonResponse(['success' => false, 'message' => 'election_id, name, and valid scope are required.'], 422);
}

if ($scope === 'general') {
    $departmentId = null;
}

if ($scope === 'department' && ($departmentId === null || $departmentId <= 0)) {
    sendJsonResponse(['success' => false, 'message' => 'department_id is required for department scope.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO positions (election_id, name, scope, department_id)
         VALUES (:election_id, :name, :scope, :department_id)'
    );
    $stmt->execute([
        ':election_id' => $electionId,
        ':name' => $name,
        ':scope' => $scope,
        ':department_id' => $departmentId,
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Position added successfully.',
        'position_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'Duplicate position or invalid foreign key.'], 409);
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not add position.'], 500);
}
