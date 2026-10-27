<?php
// Configurazione per docker compose. Sull'hosting si usa server/config.php (vedi config.esempio.php).
return [
    'sito' => 'http://localhost:8080',
    'cookie_sicuro' => false,
    'database' => [
        'dsn' => 'mysql:host=db;dbname=rc;charset=utf8mb4',
        'utente' => 'rc',
        'password' => 'rc',
    ],
    'posta' => [
        'host' => 'posta',
        'porta' => 1025,
        'sicurezza' => '',
        'utente' => '',
        'password' => '',
        'mittente' => 'accesso@reading-chicken.test',
        'nome_mittente' => 'Reading Chicken',
    ],
];
