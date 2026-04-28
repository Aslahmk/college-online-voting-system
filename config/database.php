<?php
declare(strict_types=1);

class Database
{
    private const HOST = '127.0.0.1';
    private const DB_NAME = 'college_voting';
    private const USERNAME = 'root';
    private const PASSWORD = '';

    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', self::HOST, self::DB_NAME);
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            self::$connection = new PDO($dsn, self::USERNAME, self::PASSWORD, $options);
        }

        return self::$connection;
    }
}
