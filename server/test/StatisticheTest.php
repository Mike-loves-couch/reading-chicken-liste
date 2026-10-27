<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use ReadingChicken\Risposta;

final class StatisticheTest extends TestConDatabase
{
    private int $pulcino;
    private string $michele;
    private int $partite = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $michele = $this->creaUtente('michele@esempio.it', 'logopedista');
        $rossi = $this->creaUtente('rossi@esempio.it', 'famiglia', $michele);
        $this->pulcino = $this->creaBambino($rossi, 'Pulcino');
        $this->michele = $this->entra('michele@esempio.it');
    }

    // registra una partita di Pulcino; ogni parola è [testo, riprova, secondi]
    private function gioca(string $quando, array $parole): void
    {
        $risposta = $this->chiama('POST', '/partite', [
            'id_client' => sprintf('00000000-0000-4000-8000-%012d', $this->partite++),
            'bambino_id' => $this->pulcino,
            'giocata_il' => $quando,
            'tipo' => 'parole',
            'lista' => '01 - Bisillabe - Facili',
            'maiuscolo' => true,
            'durata_secondi' => 60,
            'parole' => array_map(fn (array $p): array => ['testo' => $p[0], 'riprova' => $p[1], 'secondi' => $p[2]], $parole),
        ], $this->michele);
        $this->assertSame(201, $risposta->stato);
    }

    private function statistiche(?string $sessione = null): Risposta
    {
        return $this->chiama('GET', "/bambini/{$this->pulcino}/statistiche", sessione: $sessione ?? $this->michele);
    }

    public function testAndamentoUnaRigaPerPartitaDallaPiuVecchia(): void
    {
        $this->gioca('2026-10-26T10:00:00Z', [['pane', 1, 3.0], ['sole', 0, 2.0]]);
        $this->gioca('2026-10-25T09:00:00Z', [['pane', 0, 5.0], ['nido', 2, null]]);

        $this->assertSame([
            ['giocata_il' => '2026-10-25T09:00:00Z', 'tipo' => 'parole', 'lista' => '01 - Bisillabe - Facili', 'quantita' => 2, 'riprova' => 2, 'tempo_medio' => 5.0],
            ['giocata_il' => '2026-10-26T10:00:00Z', 'tipo' => 'parole', 'lista' => '01 - Bisillabe - Facili', 'quantita' => 2, 'riprova' => 1, 'tempo_medio' => 2.5],
        ], $this->statistiche()->corpo['andamento']);
    }

    public function testParoleDifficiliPerRiprovaEPerTempo(): void
    {
        $this->gioca('2026-10-25T09:00:00Z', [['pane', 0, 5.0], ['nido', 2, null], ['sole', 0, 2.0]]);
        $this->gioca('2026-10-26T10:00:00Z', [['pane', 1, 3.0], ['sole', 0, 2.1]]);

        $difficili = $this->statistiche()->corpo['parole_difficili'];

        $this->assertSame([
            ['testo' => 'nido', 'letture' => 1, 'riprova' => 2, 'tempo_medio' => null],
            ['testo' => 'pane', 'letture' => 2, 'riprova' => 1, 'tempo_medio' => 4.0],
        ], $difficili['per_riprova']);
        $this->assertSame(['pane', 'sole'], array_column($difficili['per_tempo'], 'testo'));
        $this->assertSame([4.0, 2.1], array_column($difficili['per_tempo'], 'tempo_medio'));
    }

    public function testAlMassimoDieciParoleDifficili(): void
    {
        $this->gioca('2026-10-26T10:00:00Z', array_map(fn (int $i): array => ["parola$i", 1, 1.0 + $i / 10], range(1, 12)));

        $difficili = $this->statistiche()->corpo['parole_difficili'];

        $this->assertCount(10, $difficili['per_riprova']);
        $this->assertCount(10, $difficili['per_tempo']);
        $this->assertSame('parola12', $difficili['per_tempo'][0]['testo']);
    }

    public function testSenzaPartiteTuttoVuoto(): void
    {
        $risposta = $this->statistiche();

        $this->assertSame(['id' => $this->pulcino, 'nome' => 'Pulcino', 'archiviato' => false, 'famiglia' => 'rossi@esempio.it'], $risposta->corpo['bambino']);
        $this->assertSame([], $risposta->corpo['andamento']);
        $this->assertSame(['per_riprova' => [], 'per_tempo' => []], $risposta->corpo['parole_difficili']);
    }

    public function testSoloChiPuoVedereIlProfilo(): void
    {
        $this->assertSame(200, $this->statistiche($this->entra('rossi@esempio.it'))->stato);
        $this->creaUtente('altra@esempio.it', 'logopedista');
        $this->assertSame(404, $this->statistiche($this->entra('altra@esempio.it'))->stato);
        $this->assertSame(401, $this->chiama('GET', "/bambini/{$this->pulcino}/statistiche")->stato);
    }
}
