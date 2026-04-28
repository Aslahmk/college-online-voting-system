<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';
require_once dirname(__DIR__) . '/utils/election.php';
require_once dirname(__DIR__) . '/utils/election_workflow.php';

requirePostMethod();
$auth = requireStudentAuth();

function ensureCandidatePhotoColumn(PDO $pdo): void
{
    $columnStmt = $pdo->query("SHOW COLUMNS FROM candidates LIKE 'photo_path'");
    if ($columnStmt->fetch() === false) {
        $pdo->exec("ALTER TABLE candidates ADD COLUMN photo_path VARCHAR(255) NULL AFTER manifesto");
    }
}

function saveCandidatePhoto(array $file): string
{
    if (!isset($file['error']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return '';
    }
    if ((int) $file['error'] !== UPLOAD_ERR_OK) {
        sendJsonResponse(['success' => false, 'message' => 'Photo upload failed.'], 422);
    }
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid uploaded file.'], 422);
    }

    $maxSize = 2 * 1024 * 1024;
    if ((int) ($file['size'] ?? 0) > $maxSize) {
        sendJsonResponse(['success' => false, 'message' => 'Photo must be 2MB or smaller.'], 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($file['tmp_name']);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];
    if (!isset($allowed[$mime])) {
        sendJsonResponse(['success' => false, 'message' => 'Only JPG, PNG, WEBP or GIF images are allowed.'], 422);
    }

    $uploadDir = dirname(__DIR__) . '/uploads/candidate_photos';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
        sendJsonResponse(['success' => false, 'message' => 'Could not prepare photo upload directory.'], 500);
    }

    $filename = sprintf('candidate_%s.%s', bin2hex(random_bytes(12)), $allowed[$mime]);
    $destination = $uploadDir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        sendJsonResponse(['success' => false, 'message' => 'Could not store uploaded photo.'], 500);
    }

    return 'uploads/candidate_photos/' . $filename;
}

$isMultipart = isset($_SERVER['CONTENT_TYPE']) && stripos((string) $_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false;
$input = $isMultipart ? $_POST : getJsonInput();

$positionId = (int) ($input['position_id'] ?? 0);
$manifesto = trim((string) ($input['manifesto'] ?? ''));
$photoPath = $isMultipart ? saveCandidatePhoto($_FILES['photo'] ?? []) : '';

if ($positionId <= 0) {
    sendJsonResponse(['success' => false, 'message' => 'Valid position_id is required.'], 422);
}

try {
    $pdo = Database::getConnection();
    ensureCandidatePhotoColumn($pdo);
    $applicationElection = getOpenApplicationElection($pdo);
    if ($applicationElection === null) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Candidate application window is closed. Applications open 21 days before voting date.',
        ], 409);
    }

    $positionStmt = $pdo->prepare(
        'SELECT id, election_id, name, scope, department_id
         FROM positions
         WHERE id = :position_id'
    );
    $positionStmt->execute([':position_id' => $positionId]);
    $position = $positionStmt->fetch();

    if ($position === false || (int) $position['election_id'] !== (int) $applicationElection['id']) {
        sendJsonResponse(['success' => false, 'message' => 'Position does not belong to current application election.'], 404);
    }

    if ($position['scope'] === 'department' && (int) $position['department_id'] !== $auth['department_id']) {
        sendJsonResponse(['success' => false, 'message' => 'You can only apply for your own department positions.'], 403);
    }

    $womenOnlySeat = stripos((string) $position['name'], 'lady rep') !== false;
    if ($womenOnlySeat) {
        $studentStmt = $pdo->prepare('SELECT gender FROM students WHERE id = :student_id');
        $studentStmt->execute([':student_id' => $auth['student_id']]);
        $student = $studentStmt->fetch();
        $gender = strtolower(trim((string) ($student['gender'] ?? '')));
        $isWomanStudent = in_array($gender, ['female', 'woman'], true);
        if (!$isWomanStudent) {
            sendJsonResponse(['success' => false, 'message' => 'This seat is only for women candidates.'], 403);
        }
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO candidates (election_id, student_id, position_id, manifesto, photo_path)
         VALUES (:election_id, :student_id, :position_id, :manifesto, :photo_path)'
    );
    $insertStmt->execute([
        ':election_id' => (int) $applicationElection['id'],
        ':student_id' => $auth['student_id'],
        ':position_id' => $positionId,
        ':manifesto' => $manifesto !== '' ? $manifesto : null,
        ':photo_path' => $photoPath !== '' ? $photoPath : null,
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Candidate application submitted. Await admin approval.',
        'candidate_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (PDOException $exception) {
    if ((int) $exception->getCode() === 23000) {
        sendJsonResponse(['success' => false, 'message' => 'You already applied for this position.'], 409);
    }
    sendJsonResponse(['success' => false, 'message' => 'Could not apply as candidate.'], 500);
}
