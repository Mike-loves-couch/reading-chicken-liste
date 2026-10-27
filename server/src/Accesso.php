<?php
declare(strict_types=1);

namespace ReadingChicken;

use Closure;
use DateInterval;
use DateTimeImmutable;
use PDO;
use Throwable;

// Magic link e sessioni. Nel database ci sono solo gli hash dei token:
// chi legge il database non può entrare al posto di nessuno.
final class Accesso
{
    private const DURATA_LINK = 'PT15M';
    private const DURATA_INVITO = 'P7D';
    private const DURATA_SESSIONE = 'P180D';
    private const MASSIMO_PER_EMAIL = 5;
    private const MASSIMO_PER_IP = 20;

    /** @param Closure(): DateTimeImmutable $adesso */
    public function __construct(
        private PDO $db,
        private Posta $posta,
        private string $sito,
        private Closure $adesso,
    ) {
    }

    // Ogni richiesta viene registrata e limitata, ma il link parte solo per un indirizzo
    // registrato: dalla risposta non si capisce chi è iscritto.
    public function richiediLink(string $email, string $ip): void
    {
        $ora = ($this->adesso)();
        $unOraFa = Tempo::sql($ora->sub(new DateInterval('PT1H')));
        $perEmail = $this->conta('SELECT COUNT(*) FROM richieste_accesso WHERE email = ? AND creato_il > ?', [$email, $unOraFa]);
        $perIp = $this->conta('SELECT COUNT(*) FROM richieste_accesso WHERE ip = ? AND creato_il > ?', [$ip, $unOraFa]);
        if ($perEmail >= self::MASSIMO_PER_EMAIL || $perIp >= self::MASSIMO_PER_IP) {
            throw new Errore(429, 'Troppe richieste: riprova tra un\'ora');
        }
        $this->db->prepare('INSERT INTO richieste_accesso (email, ip, creato_il) VALUES (?, ?, ?)')
            ->execute([$email, $ip, Tempo::sql($ora)]);

        $utente = $this->trovaUtente('email = ?', [$email]);
        if ($utente === null) {
            return;
        }
        $link = $this->creaLink($utente['id'], self::DURATA_LINK);
        $this->spedisci($email, 'Il tuo link per entrare in Reading Chicken', <<<TESTO
            Ciao,

            per entrare in Reading Chicken apri questo link entro 15 minuti:

            $link

            Se non hai chiesto tu di entrare, ignora questa email.
            TESTO);
    }

    public function inviaInvito(int $utenteId, string $email): void
    {
        $link = $this->creaLink($utenteId, self::DURATA_INVITO);
        $this->spedisci($email, 'Invito a Reading Chicken', <<<TESTO
            Ciao,

            hai ricevuto un invito a Reading Chicken, il gioco per esercitare la lettura con il pollo.
            Apri questo link entro 7 giorni per entrare:

            $link

            Dopo il primo accesso il computer resta collegato per 6 mesi. Se serve, puoi chiedere
            un nuovo link scrivendo la tua email nella pagina di accesso.
            TESTO);
    }

    /** @return array{utente: array, sessione: string} */
    public function conferma(string $token): array
    {
        $ora = ($this->adesso)();
        $hash = hash('sha256', $token);
        $consumo = $this->db->prepare('UPDATE accessi SET usato_il = ? WHERE token_hash = ? AND usato_il IS NULL AND scade_il > ?');
        $consumo->execute([Tempo::sql($ora), $hash, Tempo::sql($ora)]);
        if ($consumo->rowCount() !== 1) {
            throw new Errore(410, 'Il link è scaduto o è già stato usato: chiedine uno nuovo');
        }
        $utente = $this->trovaUtente('id = (SELECT utente_id FROM accessi WHERE token_hash = ?)', [$hash]);
        $sessione = bin2hex(random_bytes(32));
        $this->db->prepare('INSERT INTO sessioni (utente_id, token_hash, scade_il, creato_il) VALUES (?, ?, ?, ?)')
            ->execute([$utente['id'], hash('sha256', $sessione), Tempo::sql($ora->add(new DateInterval(self::DURATA_SESSIONE))), Tempo::sql($ora)]);
        return ['utente' => $utente, 'sessione' => $sessione];
    }

    // L'utente della sessione, o null. Ogni uso sposta la scadenza a 180 giorni da adesso
    // (al massimo una scrittura al giorno).
    public function utenteDellaSessione(?string $token): ?array
    {
        if ($token === null || $token === '') {
            return null;
        }
        $ora = ($this->adesso)();
        $hash = hash('sha256', $token);
        $cerca = $this->db->prepare('SELECT utente_id, scade_il FROM sessioni WHERE token_hash = ? AND scade_il > ?');
        $cerca->execute([$hash, Tempo::sql($ora)]);
        $sessione = $cerca->fetch();
        if ($sessione === false) {
            return null;
        }
        $nuovaScadenza = $ora->add(new DateInterval(self::DURATA_SESSIONE));
        if ($sessione['scade_il'] < Tempo::sql($nuovaScadenza->sub(new DateInterval('P1D')))) {
            $this->db->prepare('UPDATE sessioni SET scade_il = ? WHERE token_hash = ?')->execute([Tempo::sql($nuovaScadenza), $hash]);
        }
        return $this->trovaUtente('id = ?', [$sessione['utente_id']]);
    }

    public function esci(?string $token): void
    {
        if ($token !== null && $token !== '') {
            $this->db->prepare('DELETE FROM sessioni WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        }
    }

    private function creaLink(int $utenteId, string $durata): string
    {
        $token = bin2hex(random_bytes(32));
        $scadenza = ($this->adesso)()->add(new DateInterval($durata));
        $this->db->prepare('INSERT INTO accessi (utente_id, token_hash, scade_il) VALUES (?, ?, ?)')
            ->execute([$utenteId, hash('sha256', $token), Tempo::sql($scadenza)]);
        return "{$this->sito}/accedi/?token=$token";
    }

    private function spedisci(string $email, string $oggetto, string $testo): void
    {
        try {
            $this->posta->invia($email, $oggetto, $testo);
        } catch (Throwable $guasto) {
            error_log((string) $guasto);
            throw new Errore(502, 'Non riesco a inviare l\'email: riprova più tardi');
        }
    }

    /** @return array{id: int, email: string, nome: ?string, ruolo: string}|null */
    private function trovaUtente(string $condizione, array $valori): ?array
    {
        $cerca = $this->db->prepare("SELECT id, email, nome, ruolo FROM utenti WHERE $condizione");
        $cerca->execute($valori);
        $utente = $cerca->fetch();
        return $utente === false ? null : $utente;
    }

    private function conta(string $sql, array $valori): int
    {
        $conta = $this->db->prepare($sql);
        $conta->execute($valori);
        return (int) $conta->fetchColumn();
    }
}
