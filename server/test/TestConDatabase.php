<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use PDO;
use PHPUnit\Framework\TestCase;
use ReadingChicken\Api;
use ReadingChicken\Database;
use ReadingChicken\Richiesta;
use ReadingChicken\Risposta;
use ReadingChicken\Router;
use ReadingChicken\Tempo;

// Base dei test che usano il database rc_test: ogni test parte da tabelle vuote,
// con la posta in memoria e un orologio fermo che si fa avanzare a mano.
abstract class TestConDatabase extends TestCase
{
    private static ?PDO $connessione = null;

    protected PDO $db;
    protected PostaInMemoria $posta;
    protected DateTimeImmutable $ora;
    protected Router $api;

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
        $this->posta = new PostaInMemoria();
        $this->ora = new DateTimeImmutable('2026-10-27 10:00:00', new DateTimeZone('UTC'));
        $this->api = Api::crea($this->db, $this->posta, 'https://gioco.example', fn (): DateTimeImmutable => $this->ora);
    }

    protected function avanza(string $intervallo): void
    {
        $this->ora = $this->ora->add(new DateInterval($intervallo));
    }

    protected function chiama(string $metodo, string $percorso, array $corpo = [], ?string $sessione = null, string $ip = '10.0.0.1'): Risposta
    {
        $risposta = $this->api->gestisci(new Richiesta($metodo, $percorso, $corpo, $ip, $sessione));
        $risposta->eseguiDopo(); // come l'invio reale: le azioni partono dopo la risposta
        return $risposta;
    }

    protected function creaUtente(string $email, string $ruolo, ?int $logopedistaId = null): int
    {
        $this->db->prepare('INSERT INTO utenti (email, ruolo, logopedista_id, creato_il) VALUES (?, ?, ?, ?)')
            ->execute([$email, $ruolo, $logopedistaId, Tempo::sql($this->ora)]);
        return (int) $this->db->lastInsertId();
    }

    protected function creaBambino(int $famigliaId, string $nome, bool $archiviato = false): int
    {
        $this->db->prepare('INSERT INTO bambini (famiglia_id, nome, archiviato, creato_il) VALUES (?, ?, ?, ?)')
            ->execute([$famigliaId, $nome, (int) $archiviato, Tempo::sql($this->ora)]);
        return (int) $this->db->lastInsertId();
    }

    // il token del link contenuto nell'ultima email inviata
    protected function tokenDallUltimaEmail(): string
    {
        $this->assertNotEmpty($this->posta->inviate, 'nessuna email inviata');
        $testo = $this->posta->inviate[array_key_last($this->posta->inviate)]['testo'];
        $this->assertSame(1, preg_match('#https://gioco\.example/accedi/\?token=([0-9a-f]{64})#', $testo, $trovati), $testo);
        return $trovati[1];
    }

    // fa l'accesso con questa email e restituisce il token della sessione
    protected function entra(string $email): string
    {
        $this->chiama('POST', '/accesso/richiesta', ['email' => $email]);
        return (string) $this->chiama('POST', '/accesso/conferma', ['token' => $this->tokenDallUltimaEmail()])->sessione;
    }
}
