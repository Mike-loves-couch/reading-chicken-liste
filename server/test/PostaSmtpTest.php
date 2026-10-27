<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use PHPUnit\Framework\TestCase;
use ReadingChicken\PostaSmtp;

final class PostaSmtpTest extends TestCase
{
    private const MAILPIT = 'http://posta:8025/api/v1';

    public function testInviaUnEmailInUtf8AlServerSmtp(): void
    {
        $this->mailpit('DELETE', '/messages');
        $config = require dirname(__DIR__) . '/sviluppo/config.php';

        (new PostaSmtp($config['posta']))->invia('rossi@esempio.it', 'Più è meglio', "Ciao,\nè una prova.");

        $messaggi = json_decode($this->mailpit('GET', '/messages'), true)['messages'];
        $this->assertCount(1, $messaggi);
        $this->assertSame('Più è meglio', $messaggi[0]['Subject']);
        $this->assertSame('rossi@esempio.it', $messaggi[0]['To'][0]['Address']);
        $this->assertSame('accesso@reading-chicken.test', $messaggi[0]['From']['Address']);
    }

    private function mailpit(string $metodo, string $percorso): string
    {
        return (string) file_get_contents(self::MAILPIT . $percorso, false, stream_context_create(['http' => ['method' => $metodo]]));
    }
}
