<?php
declare(strict_types=1);

// Carica ReadingChicken\Nome da src/Nome.php e PHPMailer dalla copia in vendor/PHPMailer.
spl_autoload_register(function (string $classe): void {
    $cartelle = [
        'ReadingChicken\\' => __DIR__ . '/',
        'PHPMailer\\PHPMailer\\' => dirname(__DIR__) . '/vendor/PHPMailer/',
    ];
    foreach ($cartelle as $prefisso => $cartella) {
        if (str_starts_with($classe, $prefisso)) {
            $file = $cartella . str_replace('\\', '/', substr($classe, strlen($prefisso))) . '.php';
            if (is_file($file)) {
                require $file;
            }
            return;
        }
    }
});
