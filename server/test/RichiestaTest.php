<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PHPUnit\Framework\TestCase;
use ReadingChicken\Richiesta;

final class RichiestaTest extends TestCase
{
    public function testIlPercorsoPerdeTuttoFinoAApi(): void
    {
        $this->assertSame('/accesso/richiesta', Richiesta::percorsoApi('/api/accesso/richiesta?x=1'));
        $this->assertSame('/io', Richiesta::percorsoApi('/gioco/api/io'));
        $this->assertSame('/', Richiesta::percorsoApi('/api'));
    }
}
