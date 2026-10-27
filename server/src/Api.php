<?php
declare(strict_types=1);

namespace ReadingChicken;

use Closure;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

// Le rotte delle API e i servizi che usano.
final class Api
{
    public static function daConfig(array $config): Router
    {
        $database = $config['database'];
        return self::crea(
            Database::connetti($database['dsn'], $database['utente'], $database['password']),
            new PostaSmtp($config['posta']),
            $config['sito'],
            fn (): DateTimeImmutable => new DateTimeImmutable('now', new DateTimeZone('UTC')),
        );
    }

    /** @param Closure(): DateTimeImmutable $adesso */
    public static function crea(PDO $db, Posta $posta, string $sito, Closure $adesso): Router
    {
        $accesso = new Accesso($db, $posta, $sito, $adesso);
        $bambini = new Bambini($db);
        $famiglie = new Famiglie($db, $accesso, $adesso);
        $partite = new Partite($db, $adesso);
        $router = new Router($accesso->utenteDellaSessione(...));

        $router->aggiungi('POST', '/accesso/richiesta', null, function (Richiesta $r) use ($accesso): Risposta {
            $risposta = Risposta::vuota();
            $azione = $accesso->richiediLink(Valida::email($r->corpo['email'] ?? null), $r->ip);
            if ($azione !== null) {
                $risposta->dopo[] = $azione;
            }
            return $risposta;
        });
        $router->aggiungi('POST', '/accesso/conferma', null, function (Richiesta $r) use ($accesso): Risposta {
            $token = $r->corpo['token'] ?? null;
            if (!is_string($token) || preg_match('/^[0-9a-f]{64}$/', $token) !== 1) {
                throw new Errore(400, 'Link non valido');
            }
            ['utente' => $utente, 'sessione' => $sessione] = $accesso->conferma($token);
            return new Risposta(200, ['utente' => $utente], $sessione);
        });
        $router->aggiungi('POST', '/esci', null, function (Richiesta $r) use ($accesso): Risposta {
            $accesso->esci($r->sessione);
            return new Risposta(204, null, '');
        });
        $router->aggiungi('GET', '/io', 'utente', fn (Richiesta $r, array $p, array $utente): Risposta =>
            Risposta::json(['utente' => $utente, 'bambini' => $bambini->visibili($utente)]));

        $router->aggiungi('GET', '/famiglie', 'logopedista', fn (Richiesta $r, array $p, array $utente): Risposta =>
            Risposta::json(['famiglie' => $famiglie->elenco($utente['id'])]));
        $router->aggiungi('POST', '/famiglie', 'logopedista', function (Richiesta $r, array $p, array $utente) use ($famiglie): Risposta {
            $nomi = $r->corpo['bambini'] ?? null;
            if (!is_array($nomi) || count($nomi) < 1 || count($nomi) > 10) {
                throw new Errore(400, 'Indica da 1 a 10 profili');
            }
            $nome = $r->corpo['nome'] ?? null;
            $famiglia = $famiglie->invita(
                $utente['id'],
                Valida::email($r->corpo['email'] ?? null),
                is_string($nome) && trim($nome) !== '' ? Valida::nome($nome, 80, 'Nome della famiglia') : null,
                array_map(fn (mixed $n): string => Valida::nome($n, 40, 'Nome di fantasia'), array_values($nomi)),
            );
            return Risposta::json(['famiglia' => $famiglia], 201);
        });
        $router->aggiungi('POST', '/famiglie/{id}/invito', 'logopedista', function (Richiesta $r, array $p, array $utente) use ($famiglie): Risposta {
            $famiglie->rimandaInvito($utente['id'], $p['id']);
            return Risposta::vuota();
        });
        $router->aggiungi('DELETE', '/famiglie/{id}', 'logopedista', function (Richiesta $r, array $p, array $utente) use ($famiglie): Risposta {
            $famiglie->elimina($utente['id'], $p['id']);
            return Risposta::vuota();
        });
        $router->aggiungi('POST', '/famiglie/{id}/bambini', 'logopedista', function (Richiesta $r, array $p, array $utente) use ($famiglie): Risposta {
            $nome = Valida::nome($r->corpo['nome'] ?? null, 40, 'Nome di fantasia');
            return Risposta::json(['bambino' => $famiglie->aggiungiBambino($utente['id'], $p['id'], $nome)], 201);
        });
        $router->aggiungi('PATCH', '/bambini/{id}', 'logopedista', function (Richiesta $r, array $p, array $utente) use ($famiglie): Risposta {
            $nome = array_key_exists('nome', $r->corpo) ? Valida::nome($r->corpo['nome'], 40, 'Nome di fantasia') : null;
            $archiviato = $r->corpo['archiviato'] ?? null;
            if ($archiviato !== null && !is_bool($archiviato)) {
                throw new Errore(400, 'archiviato deve essere true o false');
            }
            return Risposta::json(['bambino' => $famiglie->modificaBambino($utente['id'], $p['id'], $nome, $archiviato)]);
        });
        $router->aggiungi('POST', '/partite', 'utente', function (Richiesta $r, array $p, array $utente) use ($bambini, $partite): Risposta {
            $bambinoId = $r->corpo['bambino_id'] ?? null;
            if (!is_int($bambinoId)) {
                throw new Errore(400, 'Partita non valida (bambino_id)');
            }
            $bambini->giocabile($utente, $bambinoId);
            $nuova = $partite->registra($bambinoId, $partite->valida($r->corpo));
            return new Risposta($nuova ? 201 : 200, ['id_client' => $r->corpo['id_client']]);
        });
        $router->aggiungi('GET', '/bambini/{id}/partite', 'utente', function (Richiesta $r, array $p, array $utente) use ($bambini, $partite): Risposta {
            $bambini->leggibile($utente, $p['id']);
            return Risposta::json(['partite' => $partite->elenco($p['id'])]);
        });
        return $router;
    }
}
