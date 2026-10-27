<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PHPUnit\Framework\TestCase;
use ReadingChicken\Errore;
use ReadingChicken\Valida;

final class ValidaTest extends TestCase
{
    public function testEmailInMinuscoloESenzaSpazi(): void
    {
        $this->assertSame('rossi@esempio.it', Valida::email('  Rossi@Esempio.IT '));
    }

    public function testEmailNonValide(): void
    {
        foreach (['', 'rossi', 'rossi@', null, 42, ['a@b.it']] as $valore) {
            try {
                Valida::email($valore);
                $this->fail('accettata: ' . var_export($valore, true));
            } catch (Errore $errore) {
                $this->assertSame(400, $errore->stato);
                $this->assertSame('Indirizzo email non valido', $errore->getMessage());
            }
        }
    }

    public function testNomeSenzaSpaziAiLatiEConLunghezzaMassima(): void
    {
        $this->assertSame('Pulcino', Valida::nome('  Pulcino ', 40, 'Nome di fantasia'));
        $this->assertSame(str_repeat('è', 40), Valida::nome(str_repeat('è', 40), 40, 'Nome di fantasia'));

        $this->expectExceptionObject(new Errore(400, 'Nome di fantasia: da 1 a 40 caratteri'));
        Valida::nome(str_repeat('a', 41), 40, 'Nome di fantasia');
    }

    public function testNomeVuoto(): void
    {
        $this->expectExceptionObject(new Errore(400, 'Nome della famiglia: da 1 a 80 caratteri'));
        Valida::nome('   ', 80, 'Nome della famiglia');
    }
}
