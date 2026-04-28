<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

requirePostMethod();
requireAdminAuth();

$_SESSION = [];
session_destroy();

sendJsonResponse(['success' => true, 'message' => 'Admin logged out successfully.']);
