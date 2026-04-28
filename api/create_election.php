<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
$adminId = requireAdminAuth();
$input = getJsonInput();

$title = trim((string) ($input['title'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));

if ($title === '') {
    sendJsonResponse(['success' => false, 'message' => 'Election title is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO elections (title, description, status, created_by_admin_id)
         VALUES (:title, :description, :status, :admin_id)'
    );
    $stmt->execute([
        ':title' => $title,
        ':description' => $description !== '' ? $description : null,
        ':status' => 'draft',
        ':admin_id' => $adminId,
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Election created successfully.',
        'election_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not create election.'], 500);
}
