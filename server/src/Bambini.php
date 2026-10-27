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
}
