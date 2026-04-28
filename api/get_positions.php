<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$electionId = isset($_GET['election_id']) ? (int) $_GET['election_id'] : 0;

if ($electionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid election_id query parameter is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        'SELECT p.id, p.name, p.scope, p.department_id, d.name AS department_name
         FROM positions p
         LEFT JOIN departments d ON d.id = p.department_id
         WHERE p.election_id = :election_id
         ORDER BY p.name ASC'
    );
    $stmt->execute([':election_id' => $electionId]);
    $positions = $stmt->fetchAll();

    sendJsonResponse(['success' => true, 'positions' => $positions]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch positions.'], 500);
}
