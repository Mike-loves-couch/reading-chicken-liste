<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use ReadingChicken\Posta;
use RuntimeException;

final class PostaInMemoria implements Posta
{
    /** @var list<array{a: string, oggetto: string, testo: string}> */
    public array $inviate = [];
    public bool $guasta = false;

    public function invia(string $destinatario, string $oggetto, string $testo): void
    {
        if ($this->guasta) {
            throw new RuntimeException('server SMTP non raggiungibile');
        }
        $this->inviate[] = ['a' => $destinatario, 'oggetto' => $oggetto, 'testo' => $testo];
    }
}
