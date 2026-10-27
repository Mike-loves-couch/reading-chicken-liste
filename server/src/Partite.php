<?php
declare(strict_types=1);

namespace ReadingChicken;

use Closure;
use DateInterval;
use DateTimeImmutable;
use Exception;
use PDO;
use PDOException;

// Partite dei profili: arrivano dal gioco, si rileggono nello storico e nella pagina del logopedista.
final class Partite
{
    private const MASSIMO_ELENCO = 100;
    private const MASSIMO_SECONDI = 86400;
    private const ISO = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/D';
    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D';

    /** @param Closure(): DateTimeImmutable $adesso */
    public function __construct(
        private PDO $db,
        private Closure $adesso,
    ) {
    }

    // Controlla la partita inviata dal gioco e la porta nel formato del database.
    public function valida(array $corpo): array
    {
        $idClient = $corpo['id_client'] ?? null;
        if (!is_string($idClient) || preg_match(self::UUID, $idClient) !== 1) {
            throw self::nonValida('id_client');
        }
        $giocataIl = self::momento($corpo['giocata_il'] ?? null);
        // un giorno di margine per gli orologi dei computer avanti
        if ($giocataIl === null || $giocataIl > ($this->adesso)()->add(new DateInterval('P1D'))) {
            throw self::nonValida('giocata_il');
        }
        $tipo = $corpo['tipo'] ?? null;
        if (!in_array($tipo, ['sillabe', 'parole'], true)) {
            throw self::nonValida('tipo');
        }
        if (!is_bool($corpo['maiuscolo'] ?? null)) {
            throw self::nonValida('maiuscolo');
        }
        $durata = $corpo['durata_secondi'] ?? null;
        if ($durata !== null && (!is_int($durata) || $durata < 0 || $durata > self::MASSIMO_SECONDI)) {
            throw self::nonValida('durata_secondi');
        }
        $parole = $corpo['parole'] ?? null;
        if (!is_array($parole) || !array_is_list($parole) || count($parole) < 1 || count($parole) > 50) {
            throw self::nonValida('parole');
        }
        return [
            'id_client' => $idClient,
            'giocata_il' => Tempo::sql($giocataIl),
            'tipo' => $tipo,
            'lista' => Valida::nome($corpo['lista'] ?? null, 120, 'Lista'),
            'maiuscolo' => $corpo['maiuscolo'],
            'durata_secondi' => $durata,
            'parole' => array_map(self::parola(...), $parole),
        ];
    }

    // Registra la partita; lo stesso id_client inviato di nuovo (per esempio dopo una rete caduta)
    // non crea doppioni e restituisce false.
    public function registra(int $bambinoId, array $partita): bool
    {
        $cerca = $this->db->prepare('SELECT bambino_id FROM partite WHERE id_client = ?');
        $cerca->execute([$partita['id_client']]);
        $proprietario = $cerca->fetchColumn();
        if ($proprietario !== false) {
            if ((int) $proprietario !== $bambinoId) {
                throw new Errore(409, 'Questa partita è già registrata per un altro profilo');
            }
            return false;
        }
        $this->db->beginTransaction();
        try {
            $this->db->prepare(
                'INSERT INTO partite (bambino_id, id_client, giocata_il, tipo, lista, maiuscolo, quantita, durata_secondi, ricevuta_il)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $bambinoId, $partita['id_client'], $partita['giocata_il'], $partita['tipo'], $partita['lista'],
                (int) $partita['maiuscolo'], count($partita['parole']), $partita['durata_secondi'], Tempo::sql(($this->adesso)()),
            ]);
            $id = (int) $this->db->lastInsertId();
            $inserisci = $this->db->prepare('INSERT INTO parole_partita (partita_id, posizione, testo, riprova, secondi) VALUES (?, ?, ?, ?, ?)');
            foreach ($partita['parole'] as $posizione => $parola) {
                $inserisci->execute([$id, $posizione, $parola['testo'], $parola['riprova'], $parola['secondi']]);
            }
            $this->db->commit();
            return true;
        } catch (PDOException $errore) {
            $this->db->rollBack();
            // due invii simultanei della stessa partita: il secondo trova la riga del primo
            if ($errore->getCode() === '23000') {
                return false;
            }
            throw $errore;
        }
    }

    // Le partite più recenti del profilo con le loro parole, dalla più recente.
    public function elenco(int $bambinoId): array
    {
        $cerca = $this->db->prepare(
            'SELECT id, id_client, giocata_il, tipo, lista, maiuscolo, quantita, durata_secondi FROM partite
             WHERE bambino_id = ? ORDER BY giocata_il DESC, id DESC LIMIT ' . self::MASSIMO_ELENCO
        );
        $cerca->execute([$bambinoId]);
        $partite = $cerca->fetchAll();
        if ($partite === []) {
            return [];
        }
        $segnaposto = implode(', ', array_fill(0, count($partite), '?'));
        $cercaParole = $this->db->prepare(
            "SELECT partita_id, testo, riprova, secondi FROM parole_partita WHERE partita_id IN ($segnaposto) ORDER BY partita_id, posizione"
        );
        $cercaParole->execute(array_column($partite, 'id'));
        $parole = [];
        foreach ($cercaParole->fetchAll() as $riga) {
            $parole[$riga['partita_id']][] = [
                'testo' => $riga['testo'],
                'riprova' => $riga['riprova'],
                'secondi' => $riga['secondi'] === null ? null : (float) $riga['secondi'],
            ];
        }
        return array_map(fn (array $partita): array => [
            'id_client' => $partita['id_client'],
            'giocata_il' => self::iso($partita['giocata_il']),
            'tipo' => $partita['tipo'],
            'lista' => $partita['lista'],
            'maiuscolo' => (bool) $partita['maiuscolo'],
            'quantita' => $partita['quantita'],
            'durata_secondi' => $partita['durata_secondi'],
            'parole' => $parole[$partita['id']] ?? [],
        ], $partite);
    }

    // DATETIME in UTC del database -> ISO 8601 con la Z, come quello che legge il JavaScript
    public static function iso(string $datetime): string
    {
        return str_replace(' ', 'T', $datetime) . 'Z';
    }

    private static function parola(mixed $parola): array
    {
        $parola = is_array($parola) ? $parola : [];
        $riprova = $parola['riprova'] ?? null;
        if (!is_int($riprova) || $riprova < 0 || $riprova > 1000) {
            throw self::nonValida('riprova');
        }
        $secondi = $parola['secondi'] ?? null;
        if ($secondi !== null && (!(is_int($secondi) || is_float($secondi)) || $secondi < 0 || $secondi > self::MASSIMO_SECONDI)) {
            throw self::nonValida('secondi');
        }
        return [
            'testo' => Valida::nome($parola['testo'] ?? null, 60, 'Parola'),
            'riprova' => $riprova,
            'secondi' => $secondi === null ? null : round((float) $secondi, 1),
        ];
    }

    private static function momento(mixed $valore): ?DateTimeImmutable
    {
        if (!is_string($valore) || preg_match(self::ISO, $valore) !== 1) {
            return null;
        }
        try {
            return new DateTimeImmutable($valore);
        } catch (Exception) {
            return null;
        }
    }

    private static function nonValida(string $campo): Errore
    {
        return new Errore(400, "Partita non valida ($campo)");
    }
}
