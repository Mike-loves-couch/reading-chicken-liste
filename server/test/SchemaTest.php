<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PDO;

final class SchemaTest extends TestConDatabase
{
    public function testCiSonoTutteLeTabelle(): void
    {
        $tabelle = $this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        sort($tabelle);

        $this->assertSame(['accessi', 'bambini', 'parole_partita', 'partite', 'richieste_accesso', 'sessioni', 'utenti'], $tabelle);
    }

    public function testEliminareUnaFamigliaEliminaTuttiISuoiDati(): void
    {
        $ora = '2026-10-27 10:00:00';
        $this->db->exec("INSERT INTO utenti (id, email, ruolo, creato_il) VALUES (1, 'michele@esempio.it', 'logopedista', '$ora')");
        $this->db->exec("INSERT INTO utenti (id, email, ruolo, logopedista_id, creato_il) VALUES (2, 'rossi@esempio.it', 'famiglia', 1, '$ora')");
        $this->db->exec("INSERT INTO bambini (id, famiglia_id, nome, creato_il) VALUES (1, 2, 'Pulcino', '$ora')");
        $this->db->exec("INSERT INTO partite (id, bambino_id, id_client, giocata_il, tipo, lista, maiuscolo, quantita, ricevuta_il)
            VALUES (1, 1, '00000000-0000-4000-8000-000000000000', '$ora', 'parole', '01 - Bisillabe', 1, 1, '$ora')");
        $this->db->exec("INSERT INTO parole_partita (partita_id, posizione, testo, riprova, secondi) VALUES (1, 0, 'pane', 0, 2.5)");
        $this->db->exec("INSERT INTO sessioni (utente_id, token_hash, scade_il, creato_il) VALUES (2, REPEAT('a', 64), '$ora', '$ora')");
        $this->db->exec("INSERT INTO accessi (utente_id, token_hash, scade_il) VALUES (2, REPEAT('b', 64), '$ora')");

        $this->db->exec('DELETE FROM utenti WHERE id = 2');

        foreach (['bambini', 'partite', 'parole_partita', 'sessioni', 'accessi'] as $tabella) {
            $this->assertSame(0, (int) $this->db->query("SELECT COUNT(*) FROM $tabella")->fetchColumn(), $tabella);
        }
        $this->assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM utenti')->fetchColumn());
    }
}
