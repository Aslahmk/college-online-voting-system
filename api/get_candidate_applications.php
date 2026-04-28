<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

requireAdminAuth();

$electionId = isset($_GET['election_id']) ? (int) $_GET['election_id'] : 0;

try {
    $pdo = Database::getConnection();
    ensureElectionWorkflowTable($pdo);
    $sql = "SELECT c.id AS candidate_id, c.status, c.manifesto, c.photo_path, c.rejection_reason, c.applied_at,
                   s.id AS student_id, s.name AS student_name, s.register_number, s.level,
                   p.id AS position_id, p.name AS position_name, p.scope,
                   d.name AS department_name,
                   sd.name AS student_department_name,
                   c.election_id,
                   ew.review_deadline_at,
                   ew.candidates_published
            FROM candidates c
            INNER JOIN students s ON s.id = c.student_id
            INNER JOIN positions p ON p.id = c.position_id
            LEFT JOIN departments d ON d.id = p.department_id
            LEFT JOIN departments sd ON sd.id = s.department_id
            LEFT JOIN election_workflow ew ON ew.election_id = c.election_id";

    if ($electionId > 0) {
        $sql .= ' WHERE c.election_id = :election_id';
    }

    $sql .= ' ORDER BY c.applied_at DESC';
    $stmt = $pdo->prepare($sql);
    if ($electionId > 0) {
        $stmt->execute([':election_id' => $electionId]);
    } else {
        $stmt->execute();
    }

    sendJsonResponse(['success' => true, 'applications' => $stmt->fetchAll()]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch candidate applications.'], 500);
}
