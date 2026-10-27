<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PHPUnit\Framework\TestCase;
use ReadingChicken\Risposta;
use RuntimeException;

final class RispostaTest extends TestCase
{
    public function testEseguiDopoEseguiLeAzioniInOrdine(): void
    {
        $fatte = [];
        $risposta = Risposta::vuota();
        $risposta->dopo[] = function () use (&$fatte): void { $fatte[] = 1; };
        $risposta->dopo[] = function () use (&$fatte): void { $fatte[] = 2; };

        $risposta->eseguiDopo();

        $this->assertSame([1, 2], $fatte);
    }

    public function testUnAzioneCheFallisceNonInterrompeLeAltre(): void
    {
        $fatte = [];
        $risposta = Risposta::vuota();
        $risposta->dopo[] = function (): void { throw new RuntimeException('guasto'); };
        $risposta->dopo[] = function () use (&$fatte): void { $fatte[] = 2; };

        $risposta->eseguiDopo();

        $this->assertSame([2], $fatte);
    }
}
