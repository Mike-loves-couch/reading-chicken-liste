<?php
declare(strict_types=1);

namespace ReadingChicken;

use PDO;

final class Database
{
    public static function connetti(string $dsn, string $utente, #[\SensitiveParameter] string $password): PDO
    {
        return new PDO($dsn, $utente, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
