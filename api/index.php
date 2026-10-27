<?php
declare(strict_types=1);

use ReadingChicken\Api;
use ReadingChicken\Richiesta;
use ReadingChicken\Risposta;

// Gli errori vanno solo nel log, mai nella risposta
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Il codice del server sta in ../server, oppure fuori dalla radice web: in quel caso
// api/percorso.php (non nel repository) restituisce il percorso della cartella server.
$server = is_file(__DIR__ . '/percorso.php') ? require __DIR__ . '/percorso.php' : dirname(__DIR__) . '/server';
// La cartella server è protetta da .htaccess o fuori dalla radice web: il browser non può aprire il log
ini_set('error_log', "$server/errori.log");
require $server . '/src/avvio.php';

// sull'hosting c'è server/config.php; in sviluppo (docker compose) si usa la configurazione di prova
$config = require (is_file("$server/config.php") ? "$server/config.php" : "$server/sviluppo/config.php");

try {
    $router = Api::daConfig($config);
} catch (Throwable $guasto) {
    error_log((string) $guasto);
    Risposta::errore(500, 'Errore del server: riprova più tardi')->invia($config['cookie_sicuro']);
    return;
}
$router->gestisci(Richiesta::daGlobali())->invia($config['cookie_sicuro']);
