<?php
declare(strict_types=1);

namespace ReadingChicken;

final class Valida
{
    public static function email(mixed $valore): string
    {
        $email = is_string($valore) ? mb_strtolower(trim($valore)) : '';
        if (mb_strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new Errore(400, 'Indirizzo email non valido');
        }
        return $email;
    }

    public static function nome(mixed $valore, int $massimo, string $cosa): string
    {
        $nome = is_string($valore) ? trim($valore) : '';
        if ($nome === '' || mb_strlen($nome) > $massimo) {
            throw new Errore(400, "$cosa: da 1 a $massimo caratteri");
        }
        return $nome;
    }
}
