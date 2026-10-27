<?php
declare(strict_types=1);

namespace ReadingChicken;

final class Richiesta
{
    // $percorso: senza la parte fino a /api ("/accesso/richiesta"); $corpo: null se il JSON non è valido;
    // $sessione: il cookie rc_sessione; $json: la richiesta dichiara Content-Type: application/json
    public function __construct(
        public string $metodo,
        public string $percorso,
        public ?array $corpo = [],
        public string $ip = '',
        public ?string $sessione = null,
        public bool $json = true,
    ) {
    }

    public static function daGlobali(): self
    {
        $grezzo = (string) file_get_contents('php://input');
        $corpo = $grezzo === '' ? [] : json_decode($grezzo, true);
        return new self(
            $_SERVER['REQUEST_METHOD'] ?? 'GET',
            self::percorsoApi($_SERVER['REQUEST_URI'] ?? '/'),
            is_array($corpo) ? $corpo : null,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_COOKIE[Risposta::COOKIE] ?? null,
            str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json'),
        );
    }

    public static function percorsoApi(string $uri): string
    {
        $percorso = parse_url($uri, PHP_URL_PATH) ?: '/';
        return preg_replace('#^.*?/api(?=/|$)#', '', $percorso) ?: '/';
    }
}
