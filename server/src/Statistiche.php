<?php
declare(strict_types=1);

namespace ReadingChicken;

use PDO;

// Quello che il logopedista guarda di un profilo: l'andamento partita per partita
// e le parole più difficili su tutte le partite.
final class Statistiche
{
    private const PAROLE_DIFFICILI = 10;

    public function __construct(private PDO $db)
    {
    }

    public function delBambino(int $bambinoId): array
    {
        return [
            'andamento' => $this->andamento($bambinoId),
            'parole_difficili' => [
                'per_riprova' => $this->paroleDifficili($bambinoId, 'HAVING SUM(w.riprova) > 0 ORDER BY riprova DESC, tempo_medio DESC, w.testo'),
                'per_tempo' => $this->paroleDifficili($bambinoId, 'HAVING AVG(w.secondi) IS NOT NULL ORDER BY tempo_medio DESC, w.testo'),
            ],
        ];
    }

    // una riga per partita, dalla più vecchia
    private function andamento(int $bambinoId): array
    {
        $cerca = $this->db->prepare(
            'SELECT p.giocata_il, p.tipo, p.lista, p.quantita, SUM(w.riprova) AS riprova, ROUND(AVG(w.secondi), 1) AS tempo_medio
             FROM partite p JOIN parole_partita w ON w.partita_id = p.id
             WHERE p.bambino_id = ?
             GROUP BY p.id, p.giocata_il, p.tipo, p.lista, p.quantita
             ORDER BY p.giocata_il, p.id'
        );
        $cerca->execute([$bambinoId]);
        return array_map(fn (array $riga): array => [
            'giocata_il' => Partite::iso($riga['giocata_il']),
            'tipo' => $riga['tipo'],
            'lista' => $riga['lista'],
            'quantita' => (int) $riga['quantita'],
            'riprova' => (int) $riga['riprova'],
            'tempo_medio' => self::numero($riga['tempo_medio']),
        ], $cerca->fetchAll());
    }

    private function paroleDifficili(int $bambinoId, string $filtroEOrdine): array
    {
        $cerca = $this->db->prepare(
            "SELECT w.testo, COUNT(*) AS letture, SUM(w.riprova) AS riprova, ROUND(AVG(w.secondi), 1) AS tempo_medio
             FROM parole_partita w JOIN partite p ON p.id = w.partita_id
             WHERE p.bambino_id = ?
             GROUP BY w.testo
             $filtroEOrdine
             LIMIT " . self::PAROLE_DIFFICILI
        );
        $cerca->execute([$bambinoId]);
        return array_map(fn (array $riga): array => [
            'testo' => $riga['testo'],
            'letture' => (int) $riga['letture'],
            'riprova' => (int) $riga['riprova'],
            'tempo_medio' => self::numero($riga['tempo_medio']),
        ], $cerca->fetchAll());
    }

    private static function numero(mixed $valore): ?float
    {
        return $valore === null ? null : (float) $valore;
    }
}
