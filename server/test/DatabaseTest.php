<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PDOException;
use PHPUnit\Framework\TestCase;
use ReadingChicken\Database;

final class DatabaseTest extends TestCase
{
    public function testLaPasswordNonCompareNellEccezione(): void
    {
        try {
            Database::connetti('mysql:host=127.0.0.1;port=1;dbname=x', 'utente', 'Segreta123');
            $this->fail('la connessione doveva fallire');
        } catch (PDOException $eccezione) {
            $this->assertStringNotContainsString('Segreta123', (string) $eccezione);
        }
    }
}
