<?php
declare(strict_types=1);

namespace ReadingChicken;

use Closure;
use Throwable;

final class Risposta
{
    public const COOKIE = 'rc_sessione';
    public const DURATA_COOKIE = 180 * 24 * 3600;

    /** @var list<Closure> azioni da fare dopo aver mandato la risposta */
    public array $dopo = [];

    // $sessione: null = il cookie non cambia, '' = il cookie viene cancellato, altrimenti il token da salvare
    public function __construct(
        public int $stato,
        public ?array $corpo = null,
        public ?string $sessione = null,
    ) {
    }

    public static function json(array $corpo, int $stato = 200): self
    {
        return new self($stato, $corpo);
    }

    public static function vuota(): self
    {
        return new self(204);
    }

    public static function errore(int $stato, string $messaggio): self
    {
        return new self($stato, ['errore' => $messaggio]);
    }

    public function invia(bool $cookieSicuro): void
    {
        http_response_code($this->stato);
        header('Cache-Control: no-store');
        if ($this->sessione !== null) {
            setcookie(self::COOKIE, $this->sessione, [
                'expires' => $this->sessione === '' ? 1 : time() + self::DURATA_COOKIE,
                'path' => '/',
                'secure' => $cookieSicuro,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
        if ($this->corpo !== null) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($this->corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        }
        if ($this->dopo !== []) {
            // così i tempi di risposta non dicono se l'indirizzo è registrato (con PHP-FPM o LiteSpeed;
            // con mod_php la risposta parte comunque a fine script)
            ignore_user_abort(true);
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            } elseif (function_exists('litespeed_finish_request')) {
                litespeed_finish_request();
            }
            $this->eseguiDopo();
        }
    }

    public function eseguiDopo(): void
    {
        foreach ($this->dopo as $azione) {
            try {
                $azione();
            } catch (Throwable $guasto) {
                error_log((string) $guasto);
            }
        }
    }
}
