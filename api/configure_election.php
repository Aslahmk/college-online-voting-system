<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

requirePostMethod();
$adminId = requireAdminAuth();
$input = getJsonInput();

$electionId = isset($input['election_id']) ? (int) $input['election_id'] : 0;
$title = trim((string) ($input['title'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$electionDate = trim((string) ($input['election_date'] ?? ''));
$startTime = trim((string) ($input['start_time'] ?? ''));
$endTime = trim((string) ($input['end_time'] ?? ''));
$reviewDeadlineAt = trim((string) ($input['review_deadline_at'] ?? ''));

if ($title === '' || $electionDate === '' || $startTime === '' || $endTime === '' || $reviewDeadlineAt === '') {
    sendJsonResponse(['success' => false, 'message' => 'title, election_date, start_time, end_time and review_deadline_at are required.'], 422);
}

$startAt = DateTime::createFromFormat('Y-m-d H:i', $electionDate . ' ' . $startTime);
$endAt = DateTime::createFromFormat('Y-m-d H:i', $electionDate . ' ' . $endTime);
$reviewDeadline = DateTime::createFromFormat('Y-m-d\TH:i', $reviewDeadlineAt) ?: DateTime::createFromFormat('Y-m-d H:i', $reviewDeadlineAt);

if (!$startAt || !$endAt || !$reviewDeadline) {
    sendJsonResponse(['success' => false, 'message' => 'Invalid date/time format.'], 422);
}

if ($endAt <= $startAt) {
    sendJsonResponse(['success' => false, 'message' => 'End time must be after start time.'], 422);
}

$applicationOpenAt = (clone $startAt)->modify('-21 days');
if ($reviewDeadline <= $applicationOpenAt || $reviewDeadline >= $startAt) {
    sendJsonResponse([
        'success' => false,
        'message' => 'Review deadline must be between application open date and voting start date.',
    ], 422);
}
$isUpdate = $electionId > 0;

try {
    $pdo = Database::getConnection();
    ensureElectionWorkflowTable($pdo);
    $pdo->beginTransaction();

    if ($electionId > 0) {
        $ownershipStmt = $pdo->prepare('SELECT id FROM elections WHERE id = :id AND created_by_admin_id = :admin_id');
        $ownershipStmt->execute([
            ':id' => $electionId,
            ':admin_id' => $adminId,
        ]);
        if ($ownershipStmt->fetch() === false) {
            $pdo->rollBack();
            sendJsonResponse(['success' => false, 'message' => 'Election not found for this admin.'], 404);
        }

        $stmt = $pdo->prepare(
            'UPDATE elections
             SET title = :title,
                 description = :description,
                 start_time = :start_time,
                 end_time = :end_time
             WHERE id = :election_id'
        );
        $stmt->execute([
            ':title' => $title,
            ':description' => $description !== '' ? $description : null,
            ':start_time' => $startAt->format('Y-m-d H:i:s'),
            ':end_time' => $endAt->format('Y-m-d H:i:s'),
            ':election_id' => $electionId,
        ]);

        $workflowStmt = $pdo->prepare(
            'INSERT INTO election_workflow (election_id, application_open_at, review_deadline_at)
             VALUES (:election_id, :application_open_at, :review_deadline_at)
             ON DUPLICATE KEY UPDATE
               application_open_at = VALUES(application_open_at),
               review_deadline_at = VALUES(review_deadline_at)'
        );
        $workflowStmt->execute([
            ':election_id' => $electionId,
            ':application_open_at' => $applicationOpenAt->format('Y-m-d H:i:s'),
            ':review_deadline_at' => $reviewDeadline->format('Y-m-d H:i:s'),
        ]);
    } else {
        $stmt = $pdo->prepare(
            "INSERT INTO elections (title, description, status, start_time, end_time, created_by_admin_id)
             VALUES (:title, :description, 'draft', :start_time, :end_time, :admin_id)"
        );
        $stmt->execute([
            ':title' => $title,
            ':description' => $description !== '' ? $description : null,
            ':start_time' => $startAt->format('Y-m-d H:i:s'),
            ':end_time' => $endAt->format('Y-m-d H:i:s'),
            ':admin_id' => $adminId,
        ]);

        $electionId = (int) $pdo->lastInsertId();
        $workflowStmt = $pdo->prepare(
            'INSERT INTO election_workflow (election_id, application_open_at, review_deadline_at)
             VALUES (:election_id, :application_open_at, :review_deadline_at)'
        );
        $workflowStmt->execute([
            ':election_id' => $electionId,
            ':application_open_at' => $applicationOpenAt->format('Y-m-d H:i:s'),
            ':review_deadline_at' => $reviewDeadline->format('Y-m-d H:i:s'),
        ]);
    }

    $pdo->commit();
    sendJsonResponse([
        'success' => true,
        'message' => $isUpdate ? 'Election updated successfully.' : 'Election configured successfully.',
        'election_id' => $electionId,
        'application_open_at' => $applicationOpenAt->format(DateTime::ATOM),
        'review_deadline_at' => $reviewDeadline->format(DateTime::ATOM),
    ], 201);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not configure election.'], 500);
}

