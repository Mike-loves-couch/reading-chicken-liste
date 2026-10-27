<?php
declare(strict_types=1);

namespace ReadingChicken;

interface Posta
{
    public function invia(string $destinatario, string $oggetto, string $testo): void;
}
