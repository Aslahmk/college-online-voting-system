<?php
declare(strict_types=1);

require_once __DIR__ . '/election_workflow.php';

function getVotesIdentityColumn(PDO $pdo): string
{
    $preferredColumns = ['voter_ref', 'voter_student_id', 'student_id'];

    foreach ($preferredColumns as $column) {
        $columnStmt = $pdo->query("SHOW COLUMNS FROM votes LIKE '{$column}'");
        if ($columnStmt !== false && $columnStmt->fetch() !== false) {
            return $column;
        }
    }

    throw new RuntimeException('Votes identity column not found (expected voter_ref, voter_student_id, or student_id).');
}

function ensureResultArchiveTables(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS election_result_snapshots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            election_id INT NOT NULL,
            position_id INT NOT NULL,
            position_name VARCHAR(100) NOT NULL,
            scope ENUM('general', 'department') NOT NULL,
            department_name VARCHAR(100) NULL,
            candidate_id INT NULL,
            candidate_name VARCHAR(100) NOT NULL,
            register_number VARCHAR(30) NOT NULL,
            total_votes INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_snapshot_election
                FOREIGN KEY (election_id) REFERENCES elections(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            INDEX idx_snapshot_election_position (election_id, position_id),
            INDEX idx_snapshot_election_votes (election_id, total_votes)
        )"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS election_result_stats (
            election_id INT PRIMARY KEY,
            total_voters INT NOT NULL DEFAULT 0,
            votes_cast INT NOT NULL DEFAULT 0,
            unique_voters INT NOT NULL DEFAULT 0,
            turnout_percentage DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            winner_count INT NOT NULL DEFAULT 0,
            archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_result_stats_election
                FOREIGN KEY (election_id) REFERENCES elections(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )"
    );
}

function archiveElectionResultsAndCleanup(PDO $pdo, int $electionId): array
{
    $resultsStmt = $pdo->prepare(
        "SELECT p.id AS position_id, p.name AS position_name, p.scope,
                d.name AS department_name,
                c.id AS candidate_id, s.name AS candidate_name, s.register_number,
                COUNT(v.id) AS total_votes
         FROM candidates c
         INNER JOIN positions p ON p.id = c.position_id
         INNER JOIN students s ON s.id = c.student_id
         LEFT JOIN departments d ON d.id = p.department_id
         LEFT JOIN votes v ON v.candidate_id = c.id
         WHERE c.election_id = :election_id
           AND c.status = 'approved'
         GROUP BY p.id, p.name, p.scope, d.name, c.id, s.name, s.register_number
         ORDER BY p.name ASC, total_votes DESC, s.name ASC"
    );
    $resultsStmt->execute([':election_id' => $electionId]);
    $results = $resultsStmt->fetchAll();

    $totalVotersStmt = $pdo->query('SELECT COUNT(*) AS total_voters FROM students WHERE is_active = 1');
    $totalVoters = (int) (($totalVotersStmt->fetch())['total_voters'] ?? 0);

    $identityColumn = getVotesIdentityColumn($pdo);
    $votesCastStmt = $pdo->prepare(
        "SELECT COUNT(*) AS votes_cast, COUNT(DISTINCT {$identityColumn}) AS unique_voters
         FROM votes
         WHERE election_id = :election_id"
    );
    $votesCastStmt->execute([':election_id' => $electionId]);
    $voteStats = $votesCastStmt->fetch();
    $votesCast = (int) ($voteStats['votes_cast'] ?? 0);
    $uniqueVoters = (int) ($voteStats['unique_voters'] ?? 0);
    $turnoutPercentage = $totalVoters > 0 ? round(($uniqueVoters / $totalVoters) * 100, 2) : 0.00;
    $winnerCount = count(array_unique(array_map(
        static fn (array $row): int => (int) $row['position_id'],
        $results
    )));

    $pdo->prepare('DELETE FROM election_result_snapshots WHERE election_id = :election_id')
        ->execute([':election_id' => $electionId]);

    if ($results) {
        $insertSnapshotStmt = $pdo->prepare(
            'INSERT INTO election_result_snapshots
             (election_id, position_id, position_name, scope, department_name, candidate_id, candidate_name, register_number, total_votes)
             VALUES
             (:election_id, :position_id, :position_name, :scope, :department_name, :candidate_id, :candidate_name, :register_number, :total_votes)'
        );
        foreach ($results as $row) {
            $insertSnapshotStmt->execute([
                ':election_id' => $electionId,
                ':position_id' => (int) $row['position_id'],
                ':position_name' => (string) $row['position_name'],
                ':scope' => (string) $row['scope'],
                ':department_name' => $row['department_name'] !== null ? (string) $row['department_name'] : null,
                ':candidate_id' => (int) $row['candidate_id'],
                ':candidate_name' => (string) $row['candidate_name'],
                ':register_number' => (string) $row['register_number'],
                ':total_votes' => (int) $row['total_votes'],
            ]);
        }
    }

    $statsStmt = $pdo->prepare(
        'INSERT INTO election_result_stats
         (election_id, total_voters, votes_cast, unique_voters, turnout_percentage, winner_count)
         VALUES
         (:election_id, :total_voters, :votes_cast, :unique_voters, :turnout_percentage, :winner_count)
         ON DUPLICATE KEY UPDATE
            total_voters = VALUES(total_voters),
            votes_cast = VALUES(votes_cast),
            unique_voters = VALUES(unique_voters),
            turnout_percentage = VALUES(turnout_percentage),
            winner_count = VALUES(winner_count),
            archived_at = CURRENT_TIMESTAMP'
    );
    $statsStmt->execute([
        ':election_id' => $electionId,
        ':total_voters' => $totalVoters,
        ':votes_cast' => $votesCast,
        ':unique_voters' => $uniqueVoters,
        ':turnout_percentage' => $turnoutPercentage,
        ':winner_count' => $winnerCount,
    ]);

    $pdo->prepare("UPDATE elections SET status = 'ended', published_results = 1 WHERE id = :id")
        ->execute([':id' => $electionId]);

    // Delete operational records now that archived results are available.
    $pdo->prepare('DELETE FROM positions WHERE election_id = :election_id')
        ->execute([':election_id' => $electionId]);
    $pdo->prepare('DELETE FROM election_workflow WHERE election_id = :election_id')
        ->execute([':election_id' => $electionId]);

    return [
        'snapshot_rows' => count($results),
        'votes_cast' => $votesCast,
        'unique_voters' => $uniqueVoters,
    ];
}
