<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

$auth = requireStudentAuth();

try {
    $pdo = Database::getConnection();
    ensureElectionWorkflowTable($pdo);

    $publishedElectionStmt = $pdo->query(
        "SELECT e.id, e.title, e.start_time, e.end_time, e.status, ew.candidates_published
         FROM elections e
         INNER JOIN election_workflow ew ON ew.election_id = e.id
         WHERE ew.candidates_published = 1
         ORDER BY e.start_time DESC, e.id DESC
         LIMIT 1"
    );
    $publishedElection = $publishedElectionStmt->fetch();
    if ($publishedElection === false) {
        sendJsonResponse(['success' => true, 'message' => 'Final candidate list is not published yet.', 'candidates' => []]);
    }

    $stmt = $pdo->prepare(
        "SELECT c.id AS candidate_id, c.manifesto, c.photo_path, c.applied_at,
                s.id AS student_id, s.name AS student_name, s.register_number, s.department_id,
                p.id AS position_id, p.name AS position_name, p.scope, p.department_id AS position_department_id,
                d.name AS position_department_name
         FROM candidates c
         INNER JOIN students s ON s.id = c.student_id
         INNER JOIN positions p ON p.id = c.position_id
         LEFT JOIN departments d ON d.id = p.department_id
         WHERE c.election_id = :election_id
           AND c.status = 'approved'
           AND (p.scope = 'general' OR p.department_id = :student_department_id)
         ORDER BY p.name ASC, s.name ASC"
    );
    $stmt->execute([
        ':election_id' => (int) $publishedElection['id'],
        ':student_department_id' => $auth['department_id'],
    ]);

    sendJsonResponse([
        'success' => true,
        'election' => $publishedElection,
        'candidates' => $stmt->fetchAll(),
    ]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch candidates.'], 500);
}
