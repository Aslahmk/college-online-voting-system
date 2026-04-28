<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

try {
    $pdo = Database::getConnection();
    ensureElectionWorkflowTable($pdo);
    $elections = $pdo->query(
        'SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.published_results, e.created_at,
                ew.application_open_at, ew.review_deadline_at, ew.candidates_published, ew.candidates_published_at
         FROM elections e
         LEFT JOIN election_workflow ew ON ew.election_id = e.id
         ORDER BY e.created_at DESC'
    )->fetchAll();

    sendJsonResponse(['success' => true, 'elections' => $elections]);
} catch (PDOException $exception) {
    sendJsonResponse(['success' => false, 'message' => 'Could not fetch elections.'], 500);
}
