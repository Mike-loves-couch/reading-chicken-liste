<?php
declare(strict_types=1);

namespace ReadingChicken\Test;

use LogicException;
use PHPUnit\Framework\TestCase;
use ReadingChicken\Errore;
use ReadingChicken\Richiesta;
use ReadingChicken\Risposta;
use ReadingChicken\Router;

final class RouterTest extends TestCase
{
    private function router(?array $utente = null): Router
    {
        $router = new Router(fn (?string $sessione): ?array => $sessione === 'buona' ? $utente : null);
        $router->aggiungi('GET', '/eco/{id}', null, fn (Richiesta $r, array $p): Risposta => Risposta::json(['id' => $p['id']]));
        $router->aggiungi('POST', '/eco', null, fn (Richiesta $r): Risposta => Risposta::json($r->corpo));
        $router->aggiungi('GET', '/privata', 'utente', fn (Richiesta $r, array $p, array $u): Risposta => Risposta::json(['email' => $u['email']]));
        $router->aggiungi('GET', '/riservata', 'logopedista', fn (): Risposta => Risposta::vuota());
        $router->aggiungi('GET', '/conflitto', null, fn (): Risposta => throw new Errore(409, 'Esiste già'));
        $router->aggiungi('GET', '/guasto', null, fn (): Risposta => throw new LogicException('guasto interno'));
        return $router;
    }

    public function testPassaIParametriNumericiDelPercorso(): void
    {
        $risposta = $this->router()->gestisci(new Richiesta('GET', '/eco/42'));

        $this->assertSame(200, $risposta->stato);
        $this->assertSame(['id' => 42], $risposta->corpo);
    }

    public function testPercorsoSconosciutoOMetodoSbagliato(): void
    {
        $this->assertSame(['errore' => 'Pagina non trovata'], $this->router()->gestisci(new Richiesta('GET', '/niente'))->corpo);
        $this->assertSame(404, $this->router()->gestisci(new Richiesta('GET', '/eco/abc'))->stato);
        $this->assertSame(405, $this->router()->gestisci(new Richiesta('DELETE', '/eco'))->stato);
    }

    public function testLeRichiesteCheModificanoDevonoEssereJson(): void
    {
        $this->assertSame(415, $this->router()->gestisci(new Richiesta('POST', '/eco', ['a' => 1], json: false))->stato);
        $this->assertSame(400, $this->router()->gestisci(new Richiesta('POST', '/eco', null))->stato);
        $this->assertSame(['a' => 1], $this->router()->gestisci(new Richiesta('POST', '/eco', ['a' => 1]))->corpo);
    }

    public function testAccessoERuolo(): void
    {
        $famiglia = ['id' => 2, 'email' => 'rossi@esempio.it', 'nome' => null, 'ruolo' => 'famiglia'];
        $logopedista = ['ruolo' => 'logopedista'] + $famiglia;

        $this->assertSame(401, $this->router($famiglia)->gestisci(new Richiesta('GET', '/privata'))->stato);
        $this->assertSame(['email' => 'rossi@esempio.it'], $this->router($famiglia)->gestisci(new Richiesta('GET', '/privata', sessione: 'buona'))->corpo);
        $this->assertSame(403, $this->router($famiglia)->gestisci(new Richiesta('GET', '/riservata', sessione: 'buona'))->stato);
        $this->assertSame(204, $this->router($logopedista)->gestisci(new Richiesta('GET', '/riservata', sessione: 'buona'))->stato);
    }

    public function testConLAccessoIlCookieVieneRinnovato(): void
    {
        $utente = ['id' => 1, 'email' => 'a@esempio.it', 'nome' => null, 'ruolo' => 'famiglia'];

        $this->assertSame('buona', $this->router($utente)->gestisci(new Richiesta('GET', '/eco/1', sessione: 'buona'))->sessione);
        $this->assertNull($this->router($utente)->gestisci(new Richiesta('GET', '/eco/1', sessione: 'scaduta'))->sessione);
    }

    public function testGliErroriDiventanoJson(): void
    {
        $this->assertSame(['errore' => 'Esiste già'], $this->router()->gestisci(new Richiesta('GET', '/conflitto'))->corpo);

        $guasto = $this->router()->gestisci(new Richiesta('GET', '/guasto'));

        $this->assertSame(500, $guasto->stato);
        $this->assertSame(['errore' => 'Errore del server: riprova più tardi'], $guasto->corpo);
    }
}
