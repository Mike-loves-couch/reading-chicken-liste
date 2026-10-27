<?php
declare(strict_types=1);

namespace ReadingChicken;

use PDO;

final class Bambini
{
    public function __construct(private PDO $db)
    {
    }

    // I bambini che chi ha fatto l'accesso può far giocare: i suoi per una famiglia,
    // quelli delle famiglie invitate per un logopedista. Gli archiviati non compaiono.
    public function visibili(array $utente): array
    {
        $colonna = $utente['ruolo'] === 'logopedista' ? 'f.logopedista_id' : 'f.id';
        $cerca = $this->db->prepare(
            "SELECT b.id, b.nome, f.id AS famiglia_id, COALESCE(f.nome, f.email) AS famiglia
             FROM bambini b JOIN utenti f ON f.id = b.famiglia_id
             WHERE $colonna = ? AND b.archiviato = 0
             ORDER BY famiglia, b.nome"
        );
        $cerca->execute([$utente['id']]);
        return $cerca->fetchAll();
    }

    // Un profilo che chi ha fatto l'accesso può vedere: una famiglia solo i suoi non archiviati,
    // un logopedista quelli delle famiglie che ha invitato, anche archiviati, per rileggerne i risultati.
    public function leggibile(array $utente, int $bambinoId): array
    {
        $condizione = $utente['ruolo'] === 'logopedista' ? 'f.logopedista_id = ?' : 'f.id = ? AND b.archiviato = 0';
        $cerca = $this->db->prepare(
            "SELECT b.id, b.nome, b.archiviato, COALESCE(f.nome, f.email) AS famiglia
             FROM bambini b JOIN utenti f ON f.id = b.famiglia_id
             WHERE b.id = ? AND $condizione"
        );
        $cerca->execute([$bambinoId, $utente['id']]);
        $bambino = $cerca->fetch();
        if ($bambino === false) {
            throw new Errore(404, 'Profilo non trovato');
        }
        return ['id' => $bambino['id'], 'nome' => $bambino['nome'], 'archiviato' => (bool) $bambino['archiviato'], 'famiglia' => $bambino['famiglia']];
    }

    // Per registrare una partita il profilo deve poter giocare: non archiviato.
    public function giocabile(array $utente, int $bambinoId): array
    {
        $bambino = $this->leggibile($utente, $bambinoId);
        if ($bambino['archiviato']) {
            throw new Errore(404, 'Profilo non trovato');
        }
        return $bambino;
    }
}
