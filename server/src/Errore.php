<?php
declare(strict_types=1);

namespace ReadingChicken;

use RuntimeException;

// Errore previsto, con lo stato HTTP e il messaggio da mostrare all'utente.
final class Errore extends RuntimeException
{
    public function __construct(public readonly int $stato, string $messaggio)
    {
        parent::__construct($messaggio);
    }
}
