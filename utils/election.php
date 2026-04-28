<?php
declare(strict_types=1);

function getActiveElection(PDO $pdo): ?array
{
    $now = date('Y-m-d H:i:s');

    // Auto-close active elections that already passed end_time.
    $closeStmt = $pdo->prepare(
        "UPDATE elections
         SET status = 'ended'
         WHERE status = 'active'
           AND end_time IS NOT NULL
           AND end_time <= :now"
    );
    $closeStmt->execute([':now' => $now]);

    $query = $pdo->query(
        "SELECT id, title, start_time, end_time
         FROM elections
         WHERE status = 'active'
         ORDER BY id DESC
         LIMIT 1"
    );
    $election = $query->fetch();
    if ($election !== false) {
        return $election;
    }

    // If nothing is active, auto-start latest eligible draft election.
    $draftStmt = $pdo->prepare(
        "SELECT id
         FROM elections
         WHERE status = 'draft'
           AND start_time IS NOT NULL
           AND start_time <= :now
           AND (end_time IS NULL OR end_time > :now)
         ORDER BY start_time DESC, id DESC
         LIMIT 1"
    );
    $draftStmt->execute([':now' => $now]);
    $draftElection = $draftStmt->fetch();
    if ($draftElection === false) {
        return null;
    }

    $activateStmt = $pdo->prepare(
        "UPDATE elections
         SET status = 'active'
         WHERE id = :id
           AND status = 'draft'"
    );
    $activateStmt->execute([':id' => (int) $draftElection['id']]);

    $activeStmt = $pdo->prepare(
        "SELECT id, title, start_time, end_time
         FROM elections
         WHERE id = :id
           AND status = 'active'
         LIMIT 1"
    );
    $activeStmt->execute([':id' => (int) $draftElection['id']]);
    $activeElection = $activeStmt->fetch();

    return $activeElection !== false ? $activeElection : null;
}
