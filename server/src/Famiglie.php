<?php
declare(strict_types=1);

namespace ReadingChicken;

use Closure;
use DateTimeImmutable;
use PDO;
use Throwable;

// Famiglie e profili dei bambini, visti dal logopedista che ha invitato la famiglia.
// Una famiglia o un bambino di un altro logopedista risponde 404, come se non esistesse.
final class Famiglie
{
    /** @param Closure(): DateTimeImmutable $adesso */
    public function __construct(
        private PDO $db,
        private Accesso $accesso,
        private Closure $adesso,
    ) {
    }

    public function elenco(int $logopedistaId): array
    {
        $cerca = $this->db->prepare('SELECT id, email, nome FROM utenti WHERE logopedista_id = ? ORDER BY COALESCE(nome, email)');
        $cerca->execute([$logopedistaId]);
        return array_map(fn (array $famiglia): array => $this->conBambini($famiglia), $cerca->fetchAll());
    }

    /** @param list<string> $nomiBambini */
    public function invita(int $logopedistaId, string $email, ?string $nome, array $nomiBambini): array
    {
        $ora = Tempo::sql(($this->adesso)());
        $this->db->beginTransaction();
        try {
            $esiste = $this->db->prepare('SELECT 1 FROM utenti WHERE email = ?');
            $esiste->execute([$email]);
            if ($esiste->fetchColumn() !== false) {
                throw new Errore(409, 'Esiste già un account con questa email');
            }
            $this->db->prepare("INSERT INTO utenti (email, ruolo, nome, logopedista_id, creato_il) VALUES (?, 'famiglia', ?, ?, ?)")
                ->execute([$email, $nome, $logopedistaId, $ora]);
            $famigliaId = (int) $this->db->lastInsertId();
            foreach ($nomiBambini as $nomeBambino) {
                $this->inserisciBambino($famigliaId, $nomeBambino, $ora);
            }
            $this->db->commit();
        } catch (Throwable $errore) {
            $this->db->rollBack();
            throw $errore;
        }
        try {
            $this->accesso->inviaInvito($famigliaId, $email);
        } catch (Errore $errore) {
            throw new Errore($errore->stato, 'Famiglia creata, ma l\'email di invito non è partita: riprova con "Rimanda invito"');
        }
        return $this->famiglia($logopedistaId, $famigliaId);
    }

    public function rimandaInvito(int $logopedistaId, int $famigliaId): void
    {
        $famiglia = $this->famiglia($logopedistaId, $famigliaId);
        $this->accesso->inviaInvito($famigliaId, $famiglia['email']);
    }

    // le chiavi esterne cancellano anche bambini, partite, sessioni e link della famiglia
    public function elimina(int $logopedistaId, int $famigliaId): void
    {
        $this->famiglia($logopedistaId, $famigliaId);
        $this->db->prepare('DELETE FROM utenti WHERE id = ?')->execute([$famigliaId]);
    }

    public function aggiungiBambino(int $logopedistaId, int $famigliaId, string $nome): array
    {
        $this->famiglia($logopedistaId, $famigliaId);
        $id = $this->inserisciBambino($famigliaId, $nome, Tempo::sql(($this->adesso)()));
        return $this->bambino($logopedistaId, $id);
    }

    public function modificaBambino(int $logopedistaId, int $bambinoId, ?string $nome, ?bool $archiviato): array
    {
        $bambino = $this->bambino($logopedistaId, $bambinoId);
        $this->db->prepare('UPDATE bambini SET nome = ?, archiviato = ? WHERE id = ?')
            ->execute([$nome ?? $bambino['nome'], (int) ($archiviato ?? $bambino['archiviato']), $bambinoId]);
        return $this->bambino($logopedistaId, $bambinoId);
    }

    private function famiglia(int $logopedistaId, int $famigliaId): array
    {
        $cerca = $this->db->prepare("SELECT id, email, nome FROM utenti WHERE id = ? AND ruolo = 'famiglia' AND logopedista_id = ?");
        $cerca->execute([$famigliaId, $logopedistaId]);
        $famiglia = $cerca->fetch();
        if ($famiglia === false) {
            throw new Errore(404, 'Famiglia non trovata');
        }
        return $this->conBambini($famiglia);
    }

    private function bambino(int $logopedistaId, int $bambinoId): array
    {
        $cerca = $this->db->prepare(
            'SELECT b.id, b.nome, b.archiviato FROM bambini b JOIN utenti f ON f.id = b.famiglia_id WHERE b.id = ? AND f.logopedista_id = ?'
        );
        $cerca->execute([$bambinoId, $logopedistaId]);
        $bambino = $cerca->fetch();
        if ($bambino === false) {
            throw new Errore(404, 'Profilo non trovato');
        }
        return self::profilo($bambino);
    }

    private function conBambini(array $famiglia): array
    {
        $cerca = $this->db->prepare('SELECT id, nome, archiviato FROM bambini WHERE famiglia_id = ? ORDER BY nome');
        $cerca->execute([$famiglia['id']]);
        $famiglia['bambini'] = array_map(self::profilo(...), $cerca->fetchAll());
        return $famiglia;
    }

    private static function profilo(array $riga): array
    {
        return ['id' => $riga['id'], 'nome' => $riga['nome'], 'archiviato' => (bool) $riga['archiviato']];
    }

    private function inserisciBambino(int $famigliaId, string $nome, string $ora): int
    {
        $this->db->prepare('INSERT INTO bambini (famiglia_id, nome, creato_il) VALUES (?, ?, ?)')->execute([$famigliaId, $nome, $ora]);
        return (int) $this->db->lastInsertId();
    }
}
