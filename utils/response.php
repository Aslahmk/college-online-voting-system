<?php
declare(strict_types=1);

function getJsonInput(): array
{
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || trim($rawInput) === '') {
        return [];
    }

    $decoded = json_decode($rawInput, true);
    if (!is_array($decoded)) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid JSON body.'], 400);
    }

    return $decoded;
}

function sendJsonResponse(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function requirePostMethod(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(['success' => false, 'message' => 'Only POST method is allowed.'], 405);
    }
}
