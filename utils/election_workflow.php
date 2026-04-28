<?php
declare(strict_types=1);

function ensureElectionWorkflowTable(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS election_workflow (
            election_id INT PRIMARY KEY,
            application_open_at DATETIME NOT NULL,
            review_deadline_at DATETIME NOT NULL,
            candidates_published TINYINT(1) NOT NULL DEFAULT 0,
            candidates_published_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_workflow_election
                FOREIGN KEY (election_id) REFERENCES elections(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )'
    );
}

function getElectionWithWorkflow(PDO $pdo, int $electionId): ?array
{
    ensureElectionWorkflowTable($pdo);
    $stmt = $pdo->prepare(
        'SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.published_results,
                ew.application_open_at, ew.review_deadline_at, ew.candidates_published, ew.candidates_published_at
         FROM elections e
         LEFT JOIN election_workflow ew ON ew.election_id = e.id
         WHERE e.id = :election_id'
    );
    $stmt->execute([':election_id' => $electionId]);
    $row = $stmt->fetch();
    return $row !== false ? $row : null;
}

function getOpenApplicationElection(PDO $pdo): ?array
{
    ensureElectionWorkflowTable($pdo);
    $stmt = $pdo->query(
        "SELECT e.id, e.title, e.status, e.start_time, e.end_time,
                ew.application_open_at, ew.review_deadline_at, ew.candidates_published
         FROM elections e
         INNER JOIN election_workflow ew ON ew.election_id = e.id
         WHERE e.status IN ('draft', 'active')
           AND NOW() BETWEEN ew.application_open_at AND ew.review_deadline_at
         ORDER BY e.start_time ASC, e.id ASC
         LIMIT 1"
    );
    $row = $stmt->fetch();
    return $row !== false ? $row : null;
}

