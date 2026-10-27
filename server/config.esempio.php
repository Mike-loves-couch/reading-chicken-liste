<?php
// Copia questo file in server/config.php sull'hosting e inserisci i dati del pannello.
// config.php contiene password: non va mai nel repository.
return [
    'sito' => 'https://www.esempio.it',           // indirizzo del gioco, senza "/" finale
    'cookie_sicuro' => true,                       // il sito è in HTTPS
    'database' => [
        'dsn' => 'mysql:host=localhost;dbname=NOME_DATABASE;charset=utf8mb4',
        'utente' => 'UTENTE_DATABASE',
        'password' => 'PASSWORD_DATABASE',
    ],
    'posta' => [
        'host' => 'smtp.esempio.it',
        'porta' => 465,
        'sicurezza' => 'ssl',                       // 'ssl' con la porta 465, 'tls' con la 587
        'utente' => 'accesso@esempio.it',
        'password' => 'PASSWORD_CASELLA',
        'mittente' => 'accesso@esempio.it',
        'nome_mittente' => 'Reading Chicken',
    ],
];
