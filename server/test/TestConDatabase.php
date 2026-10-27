<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PDO;
use PHPUnit\Framework\TestCase;
use ReadingChicken\Database;

// Base dei test che usano il database rc_test: ogni test parte da tabelle vuote.
abstract class TestConDatabase extends TestCase
{
    private static ?PDO $connessione = null;

    protected PDO $db;

    public static function pdo(): PDO
    {
        return self::$connessione ??= Database::connetti('mysql:host=db;dbname=rc_test;charset=utf8mb4', 'rc', 'rc');
    }

    protected function setUp(): void
    {
        $this->db = self::pdo();
        $this->db->exec('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $tabella) {
            $this->db->exec("TRUNCATE TABLE `$tabella`");
        }
        $this->db->exec('SET FOREIGN_KEY_CHECKS = 1');
    }
}
