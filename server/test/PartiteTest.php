<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use ReadingChicken\Risposta;

final class PartiteTest extends TestConDatabase
{
    private int $pulcino;
    private int $ape;
    private string $rossi;
    private string $michele;

    protected function setUp(): void
    {
        parent::setUp();
        $michele = $this->creaUtente('michele@esempio.it', 'logopedista');
        $rossi = $this->creaUtente('rossi@esempio.it', 'famiglia', $michele);
        $bianchi = $this->creaUtente('bianchi@esempio.it', 'famiglia', $michele);
        $this->pulcino = $this->creaBambino($rossi, 'Pulcino');
        $this->ape = $this->creaBambino($bianchi, 'Ape');
        $this->rossi = $this->entra('rossi@esempio.it');
        $this->michele = $this->entra('michele@esempio.it');
    }

    private function partita(array $altro = []): array
    {
        return $altro + [
            'id_client' => '0b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11',
            'bambino_id' => $this->pulcino,
            'giocata_il' => '2026-10-27T09:30:00.000Z',
            'tipo' => 'parole',
            'lista' => '01 - Bisillabe - Facili',
            'maiuscolo' => true,
            'durata_secondi' => 42,
            'parole' => [['testo' => 'pane', 'riprova' => 1, 'secondi' => 3.2], ['testo' => 'sole', 'riprova' => 0, 'secondi' => null]],
        ];
    }

    private function registra(array $altro = [], ?string $sessione = null): Risposta
    {
        return $this->chiama('POST', '/partite', $this->partita($altro), $sessione ?? $this->rossi);
    }

    private function partite(int $bambinoId, ?string $sessione = null): Risposta
    {
        return $this->chiama('GET', "/bambini/$bambinoId/partite", sessione: $sessione ?? $this->rossi);
    }

    public function testUnaFamigliaRegistraUnaPartitaELaRilegge(): void
    {
        $this->assertSame(201, $this->registra()->stato);

        $this->assertSame([[
            'id_client' => '0b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11',
            'giocata_il' => '2026-10-27T09:30:00Z',
            'tipo' => 'parole',
            'lista' => '01 - Bisillabe - Facili',
            'maiuscolo' => true,
            'quantita' => 2,
            'durata_secondi' => 42,
            'parole' => [['testo' => 'pane', 'riprova' => 1, 'secondi' => 3.2], ['testo' => 'sole', 'riprova' => 0, 'secondi' => null]],
        ]], $this->partite($this->pulcino)->corpo['partite']);
    }

    public function testLoStessoIdClientNonCreaDoppioni(): void
    {
        $this->assertSame(201, $this->registra()->stato);
        $this->assertSame(200, $this->registra()->stato);

        $this->assertCount(1, $this->partite($this->pulcino)->corpo['partite']);
    }

    public function testLOrarioDiventaUtc(): void
    {
        $this->registra(['giocata_il' => '2026-10-27T11:30:00+02:00']);

        $this->assertSame('2026-10-27T09:30:00Z', $this->partite($this->pulcino)->corpo['partite'][0]['giocata_il']);
    }

    public function testDatiNonValidi(): void
    {
        $nonValide = [
            ['id_client' => 'abc'],
            ['id_client' => '0B6F3C1E-5D2A-4C3B-9F1E-2A7D8C9B0E11'],
            ['bambino_id' => (string) $this->pulcino],
            ['giocata_il' => 'ieri'],
            ['giocata_il' => '2026-10-29T10:00:00Z'],
            ['tipo' => 'numeri'],
            ['lista' => ''],
            ['maiuscolo' => 'si'],
            ['durata_secondi' => -1],
            ['parole' => []],
            ['parole' => array_fill(0, 51, ['testo' => 'pane', 'riprova' => 0, 'secondi' => 1])],
            ['parole' => [['testo' => '', 'riprova' => 0, 'secondi' => 1]]],
            ['parole' => [['testo' => 'pane', 'riprova' => -1, 'secondi' => 1]]],
            ['parole' => [['testo' => 'pane', 'riprova' => 0, 'secondi' => 'tre']]],
            ['parole' => ['pane']],
        ];
        foreach ($nonValide as $altro) {
            $this->assertSame(400, $this->registra($altro)->stato, (string) json_encode($altro));
        }

        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM partite')->fetchColumn());
    }

    public function testDurateEccessiveDiventanoNullEIValoriAmmessiPassano(): void
    {
        $this->assertSame(201, $this->registra(['durata_secondi' => 86401])->stato);
        $this->assertNull($this->partite($this->pulcino)->corpo['partite'][0]['durata_secondi']);

        $aperta = $this->registra([
            'id_client' => '3b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11',
            'giocata_il' => '2026-10-27T09:31:00.000Z',
            'parole' => [['testo' => 'pane', 'riprova' => 0, 'secondi' => 90000], ['testo' => 'sole', 'riprova' => 0, 'secondi' => 3]],
        ]);
        $this->assertSame(201, $aperta->stato);
        $parole = $this->partite($this->pulcino)->corpo['partite'][0]['parole'];
        $this->assertNull($parole[0]['secondi']);
        $this->assertSame(3.0, $parole[1]['secondi']);

        $this->assertSame(201, $this->registra([
            'id_client' => '4b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11',
            'giocata_il' => '2026-10-27T09:32:00.000Z',
            'durata_secondi' => null,
        ])->stato);
        $this->assertSame(201, $this->registra([
            'id_client' => '5b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11',
            'giocata_il' => '2026-10-27T09:33:00.000Z',
            'parole' => array_fill(0, 50, ['testo' => 'pane', 'riprova' => 0, 'secondi' => 1]),
        ])->stato);
        $this->assertSame(201, $this->registra([
            'id_client' => '6b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11',
            'giocata_il' => '2026-10-28T09:00:00Z',
        ])->stato);
    }

    public function testUnaFamigliaUsaSoloISuoiProfiliNonArchiviati(): void
    {
        $this->assertSame(404, $this->registra(['bambino_id' => $this->ape])->stato);
        $this->assertSame(404, $this->partite($this->ape)->stato);
        $this->assertSame(201, $this->registra()->stato);
        $this->db->exec("UPDATE bambini SET archiviato = 1 WHERE id = {$this->pulcino}");

        // il gioco scarta la partita in base a questo messaggio
        $nuova = $this->registra(['id_client' => '1b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11']);
        $this->assertSame(404, $nuova->stato);
        $this->assertSame('Profilo non trovato', $nuova->corpo['errore']);
        $letto = $this->partite($this->pulcino);
        $this->assertSame(404, $letto->stato);
        $this->assertSame('Profilo non trovato', $letto->corpo['errore']);
        $altro = $this->registra(['bambino_id' => $this->ape]);
        $this->assertSame(404, $altro->stato);
        $this->assertSame('Profilo non trovato', $altro->corpo['errore']);
        $lettoAltro = $this->partite($this->ape);
        $this->assertSame(404, $lettoAltro->stato);
        $this->assertSame('Profilo non trovato', $lettoAltro->corpo['errore']);
        $this->assertSame(404, $this->registra(['id_client' => '2b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11'], $this->michele)->stato);
    }

    public function testIlLogopedistaFaGiocareERileggeISuoiProfiliAncheArchiviati(): void
    {
        $this->assertSame(201, $this->registra([], $this->michele)->stato);
        $this->db->exec("UPDATE bambini SET archiviato = 1 WHERE id = {$this->pulcino}");
        $this->assertCount(1, $this->partite($this->pulcino, $this->michele)->corpo['partite']);

        $this->creaUtente('altra@esempio.it', 'logopedista');
        $altra = $this->entra('altra@esempio.it');
        $this->assertSame(404, $this->partite($this->pulcino, $altra)->stato);
        $this->assertSame(404, $this->registra(['id_client' => '1b6f3c1e-5d2a-4c3b-9f1e-2a7d8c9b0e11', 'bambino_id' => $this->ape], $altra)->stato);
    }

    public function testElencoDallaPiuRecenteConAlMassimoCentoPartite(): void
    {
        for ($i = 0; $i < 101; $i++) {
            $this->registra([
                'id_client' => sprintf('00000000-0000-4000-8000-%012d', $i),
                'giocata_il' => $this->ora->modify("-$i hours")->format('Y-m-d\TH:i:s\Z'),
            ]);
        }

        $partite = $this->partite($this->pulcino)->corpo['partite'];

        $this->assertCount(100, $partite);
        $this->assertSame('00000000-0000-4000-8000-000000000000', $partite[0]['id_client']);
        $this->assertSame('00000000-0000-4000-8000-000000000099', $partite[99]['id_client']);
    }

    public function testSenzaAccessoNonSiRegistraENonSiLegge(): void
    {
        $this->assertSame(401, $this->chiama('POST', '/partite', $this->partita())->stato);
        $this->assertSame(401, $this->chiama('GET', "/bambini/{$this->pulcino}/partite")->stato);
    }

    public function testLoStessoIdClientPerUnAltroProfiloEUnConflitto(): void
    {
        $this->registra();

        $this->assertSame(409, $this->registra(['bambino_id' => $this->ape], $this->michele)->stato);
    }
}
