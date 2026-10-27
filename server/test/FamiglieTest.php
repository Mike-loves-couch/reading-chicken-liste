<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use ReadingChicken\Risposta;

final class FamiglieTest extends TestConDatabase
{
    private string $michele;

    protected function setUp(): void
    {
        parent::setUp();
        $this->creaUtente('michele@esempio.it', 'logopedista');
        $this->michele = $this->entra('michele@esempio.it');
    }

    private function invita(array $corpo, ?string $sessione = null): Risposta
    {
        return $this->chiama('POST', '/famiglie', $corpo + ['email' => 'rossi@esempio.it', 'bambini' => ['Pulcino']], $sessione ?? $this->michele);
    }

    public function testInvitareUnaFamigliaCreaIProfiliEMandaIlLink(): void
    {
        $risposta = $this->invita(['email' => ' Rossi@Esempio.IT ', 'nome' => 'Famiglia Rossi', 'bambini' => ['Pulcino', ' Gallo ']]);

        $this->assertSame(201, $risposta->stato);
        $famiglia = $risposta->corpo['famiglia'];
        $this->assertSame('rossi@esempio.it', $famiglia['email']);
        $this->assertSame('Famiglia Rossi', $famiglia['nome']);
        $this->assertSame(['Gallo', 'Pulcino'], array_column($famiglia['bambini'], 'nome'));
        $this->assertSame([false, false], array_column($famiglia['bambini'], 'archiviato'));
        $invito = $this->posta->inviate[array_key_last($this->posta->inviate)];
        $this->assertSame(['rossi@esempio.it', 'Invito a Reading Chicken'], [$invito['a'], $invito['oggetto']]);

        $conferma = $this->chiama('POST', '/accesso/conferma', ['token' => $this->tokenDallUltimaEmail()]);
        $this->assertSame('famiglia', $conferma->corpo['utente']['ruolo']);
        $io = $this->chiama('GET', '/io', sessione: $conferma->sessione);
        $this->assertSame(['Gallo', 'Pulcino'], array_column($io->corpo['bambini'], 'nome'));
    }

    public function testIlLinkDiInvitoValeSetteGiorni(): void
    {
        $this->invita([]);
        $token = $this->tokenDallUltimaEmail();
        $this->avanza('P6DT23H');
        $this->assertSame(200, $this->chiama('POST', '/accesso/conferma', ['token' => $token])->stato);

        $this->invita(['email' => 'bianchi@esempio.it']);
        $token = $this->tokenDallUltimaEmail();
        $this->avanza('P7DT1M');
        $this->assertSame(410, $this->chiama('POST', '/accesso/conferma', ['token' => $token])->stato);
    }

    public function testDatiDellInvitoNonValidi(): void
    {
        $this->assertSame(409, $this->invita(['email' => 'michele@esempio.it'])->stato);
        $this->invita([]);
        $doppia = $this->invita([]);
        $this->assertSame(409, $doppia->stato);
        $this->assertSame('Esiste già un account con questa email', $doppia->corpo['errore']);
        $this->assertSame(400, $this->invita(['email' => 'bianchi@esempio.it', 'bambini' => []])->stato);
        $this->assertSame(400, $this->invita(['email' => 'bianchi@esempio.it', 'bambini' => ['  ']])->stato);
        $this->assertSame(400, $this->invita(['email' => 'bianchi@esempio.it', 'bambini' => array_fill(0, 11, 'Ape')])->stato);
        $this->assertSame(1, (int) $this->db->query("SELECT COUNT(*) FROM utenti WHERE ruolo = 'famiglia'")->fetchColumn());
    }

    public function testOgniLogopedistaVedeSoloLeSueFamiglie(): void
    {
        $this->invita([]);
        $this->creaUtente('altra@esempio.it', 'logopedista');
        $altra = $this->entra('altra@esempio.it');
        $this->invita(['email' => 'bianchi@esempio.it'], $altra);

        $this->assertSame(['rossi@esempio.it'], array_column($this->chiama('GET', '/famiglie', sessione: $this->michele)->corpo['famiglie'], 'email'));
        $this->assertSame(['bianchi@esempio.it'], array_column($this->chiama('GET', '/famiglie', sessione: $altra)->corpo['famiglie'], 'email'));
    }

    public function testLeFamiglieDiUnAltroLogopedistaNonEsistono(): void
    {
        $famiglia = $this->invita([])->corpo['famiglia'];
        $this->creaUtente('altra@esempio.it', 'logopedista');
        $altra = $this->entra('altra@esempio.it');

        $this->assertSame(404, $this->chiama('DELETE', "/famiglie/{$famiglia['id']}", sessione: $altra)->stato);
        $this->assertSame(404, $this->chiama('POST', "/famiglie/{$famiglia['id']}/invito", sessione: $altra)->stato);
        $this->assertSame(404, $this->chiama('POST', "/famiglie/{$famiglia['id']}/bambini", ['nome' => 'Ape'], $altra)->stato);
        $this->assertSame(404, $this->chiama('PATCH', "/bambini/{$famiglia['bambini'][0]['id']}", ['nome' => 'Ape'], $altra)->stato);
    }

    public function testUnaFamigliaNonUsaLeApiDelLogopedista(): void
    {
        $this->invita([]);
        $rossi = (string) $this->chiama('POST', '/accesso/conferma', ['token' => $this->tokenDallUltimaEmail()])->sessione;

        $this->assertSame(403, $this->chiama('GET', '/famiglie', sessione: $rossi)->stato);
        $this->assertSame(403, $this->invita(['email' => 'bianchi@esempio.it'], $rossi)->stato);
    }

    public function testAggiungereRinominareEArchiviareUnProfilo(): void
    {
        $famiglia = $this->invita([])->corpo['famiglia'];
        $rossi = (string) $this->chiama('POST', '/accesso/conferma', ['token' => $this->tokenDallUltimaEmail()])->sessione;

        $nuovo = $this->chiama('POST', "/famiglie/{$famiglia['id']}/bambini", ['nome' => 'Ape'], $this->michele);
        $this->assertSame(201, $nuovo->stato);
        $id = $nuovo->corpo['bambino']['id'];
        $this->assertSame(['id' => $id, 'nome' => 'Apina', 'archiviato' => false],
            $this->chiama('PATCH', "/bambini/$id", ['nome' => 'Apina'], $this->michele)->corpo['bambino']);
        $this->assertSame(['id' => $id, 'nome' => 'Apina', 'archiviato' => true],
            $this->chiama('PATCH', "/bambini/$id", ['archiviato' => true], $this->michele)->corpo['bambino']);
        $this->assertSame(400, $this->chiama('PATCH', "/bambini/$id", ['archiviato' => 'sì'], $this->michele)->stato);

        $this->assertSame(['Pulcino'], array_column($this->chiama('GET', '/io', sessione: $rossi)->corpo['bambini'], 'nome'));
        $elenco = $this->chiama('GET', '/famiglie', sessione: $this->michele)->corpo['famiglie'][0]['bambini'];
        $this->assertSame([['Apina', true], ['Pulcino', false]], array_map(fn (array $b): array => [$b['nome'], $b['archiviato']], $elenco));
    }

    public function testRimandareLInvito(): void
    {
        $famiglia = $this->invita([])->corpo['famiglia'];
        $prima = count($this->posta->inviate);

        $this->assertSame(204, $this->chiama('POST', "/famiglie/{$famiglia['id']}/invito", sessione: $this->michele)->stato);

        $this->assertCount($prima + 1, $this->posta->inviate);
        $this->assertSame('Invito a Reading Chicken', $this->posta->inviate[$prima]['oggetto']);
    }

    public function testEliminareUnaFamigliaChiudeAncheLeSueSessioni(): void
    {
        $famiglia = $this->invita([])->corpo['famiglia'];
        $rossi = (string) $this->chiama('POST', '/accesso/conferma', ['token' => $this->tokenDallUltimaEmail()])->sessione;

        $this->assertSame(204, $this->chiama('DELETE', "/famiglie/{$famiglia['id']}", sessione: $this->michele)->stato);

        $this->assertSame(401, $this->chiama('GET', '/io', sessione: $rossi)->stato);
        $this->assertSame([], $this->chiama('GET', '/famiglie', sessione: $this->michele)->corpo['famiglie']);
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM bambini')->fetchColumn());
    }

    public function testSeLInvitoNonParteLaFamigliaRestaCreata(): void
    {
        $this->posta->guasta = true;

        $risposta = $this->invita([]);

        $this->assertSame(502, $risposta->stato);
        $this->assertSame('Famiglia creata, ma l\'email di invito non è partita: riprova con "Rimanda invito"', $risposta->corpo['errore']);
        $this->assertSame(['rossi@esempio.it'], array_column($this->chiama('GET', '/famiglie', sessione: $this->michele)->corpo['famiglie'], 'email'));
    }
}
