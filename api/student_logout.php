<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireStudentAuth();

$_SESSION = [];
session_destroy();

sendJsonResponse(['success' => true, 'message' => 'Student logged out successfully.']);
