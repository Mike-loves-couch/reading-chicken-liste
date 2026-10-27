<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use ReadingChicken\Richiesta;

final class AccessoTest extends TestConDatabase
{
    public function testIlLinkArrivaSoloAGliIndirizziRegistrati(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');

        $this->assertSame(204, $this->chiama('POST', '/accesso/richiesta', ['email' => ' Rossi@Esempio.IT '])->stato);
        $this->assertSame(204, $this->chiama('POST', '/accesso/richiesta', ['email' => 'sconosciuto@esempio.it'])->stato);

        $this->assertCount(1, $this->posta->inviate);
        $this->assertSame('rossi@esempio.it', $this->posta->inviate[0]['a']);
        $this->assertSame('Il tuo link per entrare in Reading Chicken', $this->posta->inviate[0]['oggetto']);
        $this->tokenDallUltimaEmail();
    }

    public function testIlLinkApreUnaSessione(): void
    {
        $id = $this->creaUtente('rossi@esempio.it', 'famiglia');
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'rossi@esempio.it']);

        $risposta = $this->chiama('POST', '/accesso/conferma', ['token' => $this->tokenDallUltimaEmail()]);

        $this->assertSame(200, $risposta->stato);
        $this->assertSame(['id' => $id, 'email' => 'rossi@esempio.it', 'nome' => null, 'ruolo' => 'famiglia'], $risposta->corpo['utente']);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', (string) $risposta->sessione);
        $io = $this->chiama('GET', '/io', sessione: $risposta->sessione);
        $this->assertSame(200, $io->stato);
        $this->assertSame('rossi@esempio.it', $io->corpo['utente']['email']);
        $this->assertSame($risposta->sessione, $io->sessione, 'il cookie viene rinnovato');
    }

    public function testIlLinkSiUsaUnaVoltaSola(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'rossi@esempio.it']);
        $token = $this->tokenDallUltimaEmail();

        $this->assertSame(200, $this->chiama('POST', '/accesso/conferma', ['token' => $token])->stato);
        $seconda = $this->chiama('POST', '/accesso/conferma', ['token' => $token]);

        $this->assertSame(410, $seconda->stato);
        $this->assertSame('Il link è scaduto o è già stato usato: chiedine uno nuovo', $seconda->corpo['errore']);
    }

    public function testIlLinkScadeDopoQuindiciMinuti(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'rossi@esempio.it']);
        $token = $this->tokenDallUltimaEmail();

        $this->avanza('PT16M');

        $this->assertSame(410, $this->chiama('POST', '/accesso/conferma', ['token' => $token])->stato);
    }

    public function testTroppeRichiesteDallaStessaEmailODalloStessoIp(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->assertSame(204, $this->chiama('POST', '/accesso/richiesta', ['email' => 'a@esempio.it'])->stato);
        }
        $troppe = $this->chiama('POST', '/accesso/richiesta', ['email' => 'a@esempio.it']);
        $this->assertSame(429, $troppe->stato);
        $this->assertSame('Troppe richieste: riprova tra un\'ora', $troppe->corpo['errore']);

        for ($i = 0; $i < 15; $i++) {
            $this->chiama('POST', '/accesso/richiesta', ['email' => "b$i@esempio.it"]);
        }
        $this->assertSame(429, $this->chiama('POST', '/accesso/richiesta', ['email' => 'c@esempio.it'])->stato, '20 richieste dallo stesso IP');
        $this->assertSame(204, $this->chiama('POST', '/accesso/richiesta', ['email' => 'c@esempio.it'], ip: '10.0.0.2')->stato);

        $this->avanza('PT61M');
        $this->assertSame(204, $this->chiama('POST', '/accesso/richiesta', ['email' => 'a@esempio.it'])->stato);
    }

    public function testSenzaAccessoIoRisponde401(): void
    {
        $this->assertSame(401, $this->chiama('GET', '/io')->stato);
        $this->assertSame(401, $this->chiama('GET', '/io', sessione: str_repeat('0', 64))->stato);
    }

    public function testEsciChiudeLaSessioneECancellaIlCookie(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $sessione = $this->entra('rossi@esempio.it');

        $esci = $this->chiama('POST', '/esci', sessione: $sessione);

        $this->assertSame(204, $esci->stato);
        $this->assertSame('', $esci->sessione);
        $this->assertSame(401, $this->chiama('GET', '/io', sessione: $sessione)->stato);
    }

    public function testLaSessioneDuraCentottantaGiorniDallUltimoUso(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $sessione = $this->entra('rossi@esempio.it');

        $this->avanza('P100D');
        $this->assertSame(200, $this->chiama('GET', '/io', sessione: $sessione)->stato);
        $this->avanza('P100D');
        $this->assertSame(200, $this->chiama('GET', '/io', sessione: $sessione)->stato);
        $this->avanza('P181D');
        $this->assertSame(401, $this->chiama('GET', '/io', sessione: $sessione)->stato);
    }

    public function testIoMostraIBambiniCheSiPossonoFarGiocare(): void
    {
        $michele = $this->creaUtente('michele@esempio.it', 'logopedista');
        $altro = $this->creaUtente('altro@esempio.it', 'logopedista');
        $rossi = $this->creaUtente('rossi@esempio.it', 'famiglia', $michele);
        $bianchi = $this->creaUtente('bianchi@esempio.it', 'famiglia', $michele);
        $verdi = $this->creaUtente('verdi@esempio.it', 'famiglia', $altro);
        $this->creaBambino($rossi, 'Pulcino');
        $this->creaBambino($rossi, 'Gallo', archiviato: true);
        $this->creaBambino($bianchi, 'Ape');
        $this->creaBambino($verdi, 'Riccio');
        $neri = $this->creaUtente('neri@esempio.it', 'famiglia', $michele);
        $this->db->exec("UPDATE utenti SET nome = 'Famiglia Neri' WHERE id = $neri");
        $this->creaBambino($neri, 'Gatto');

        $perRossi = $this->chiama('GET', '/io', sessione: $this->entra('rossi@esempio.it'))->corpo['bambini'];
        $perMichele = $this->chiama('GET', '/io', sessione: $this->entra('michele@esempio.it'))->corpo['bambini'];

        $this->assertSame(['Pulcino'], array_column($perRossi, 'nome'));
        $this->assertSame(['Ape', 'Gatto', 'Pulcino'], array_column($perMichele, 'nome'));
        $this->assertSame([null, 'Famiglia Neri', null], array_column($perMichele, 'famiglia'));
        $this->assertSame([$bianchi, $neri, $rossi], array_column($perMichele, 'famiglia_id'));
    }

    public function testEmailOTokenNonValidiRispondono400(): void
    {
        $this->assertSame(400, $this->chiama('POST', '/accesso/richiesta', ['email' => 'non-una-email'])->stato);
        $this->assertSame(400, $this->chiama('POST', '/accesso/conferma', ['token' => 'abc'])->stato);
    }

    public function testIDatiDiAccessoVecchiVengonoCancellati(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'rossi@esempio.it']);
        $token1 = $this->tokenDallUltimaEmail();
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'sconosciuto@esempio.it']);
        $this->assertSame(200, $this->chiama('POST', '/accesso/conferma', ['token' => $token1])->stato);
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'rossi@esempio.it']);
        $this->assertSame(1, $this->righe('accessi'), 'il link usato è stato cancellato');

        $this->avanza('PT61M');
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'altro@esempio.it']);
        $this->assertSame(1, $this->righe('richieste_accesso'));
        $this->assertSame(0, $this->righe('accessi'), 'il link scaduto è stato cancellato');

        $this->avanza('P181D');
        $this->chiama('POST', '/accesso/richiesta', ['email' => 'altro2@esempio.it']);
        $this->assertSame(0, $this->righe('sessioni'));
    }

    private function righe(string $tabella): int
    {
        return (int) $this->db->query("SELECT COUNT(*) FROM $tabella")->fetchColumn();
    }

    public function testSeLaPostaNonParteLaRispostaNonCambia(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $this->posta->guasta = true;

        $risposta = $this->chiama('POST', '/accesso/richiesta', ['email' => 'rossi@esempio.it']);

        $this->assertSame(204, $risposta->stato);
        $this->assertSame([], $this->posta->inviate);
    }

    public function testLaRispostaNonDiceSeLIndirizzoERegistrato(): void
    {
        $this->creaUtente('rossi@esempio.it', 'famiglia');
        $risposte = [];
        foreach (['rossi@esempio.it', 'sconosciuto@esempio.it'] as $email) {
            $risposte[$email] = $this->api->gestisci(new Richiesta('POST', '/accesso/richiesta', ['email' => $email], '10.0.0.1', null));
            $this->assertSame(204, $risposte[$email]->stato);
            $this->assertNull($risposte[$email]->corpo);
            $this->assertNull($risposte[$email]->sessione);
        }
        $this->assertSame([], $this->posta->inviate, 'nessuna email prima di eseguiDopo()');

        $risposte['rossi@esempio.it']->eseguiDopo();
        $risposte['sconosciuto@esempio.it']->eseguiDopo();

        $this->assertCount(1, $this->posta->inviate);
    }
}
