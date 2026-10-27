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
        $router = new Router($accesso->utenteDellaSessione(...));

        $router->aggiungi('POST', '/accesso/richiesta', null, function (Richiesta $r) use ($accesso): Risposta {
            $accesso->richiediLink(Valida::email($r->corpo['email'] ?? null), $r->ip);
            return Risposta::vuota();
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

        return $router;
    }
}
