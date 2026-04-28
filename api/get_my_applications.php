<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

$auth = requireStudentAuth();

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare(
        "SELECT c.id AS candidate_id,
                c.status,
                c.manifesto,
                c.photo_path,
                c.rejection_reason,
                c.applied_at,
                p.id AS position_id,
                p.name AS position_name,
                p.scope AS position_scope,
                d.name AS department_name,
                e.id AS election_id,
                e.title AS election_title
         FROM candidates c
         INNER JOIN positions p ON p.id = c.position_id
         INNER JOIN elections e ON e.id = c.election_id
         LEFT JOIN departments d ON d.id = p.department_id
         WHERE c.student_id = :student_id
         ORDER BY c.applied_at DESC"
    );
    $stmt->execute([':student_id' => (int) $auth['student_id']]);
    $applications = $stmt->fetchAll();

    sendJsonResponse([
        'success' => true,
        'applications' => $applications,
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch your applications.'], 500);
}

