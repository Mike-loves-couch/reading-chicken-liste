<?php
declare(strict_types=1);

namespace ReadingChicken;

use Closure;
use Throwable;

// Associa metodo e percorso a un gestore; controlla JSON, accesso e ruolo; trasforma gli errori in JSON.
final class Router
{
    /** @var list<array{string, string, ?string, Closure}> */
    private array $rotte = [];

    /** @param Closure(?string): ?array $utenteDellaSessione */
    public function __construct(private Closure $utenteDellaSessione)
    {
    }

    // $chi: null = chiunque, 'utente' = serve l'accesso, 'logopedista' = solo logopedisti.
    // Nel percorso {nome} è un numero, passato al gestore in $parametri['nome'].
    public function aggiungi(string $metodo, string $percorso, ?string $chi, Closure $gestore): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>\d+)', $percorso) . '$#';
        $this->rotte[] = [$metodo, $regex, $chi, $gestore];
    }

    public function gestisci(Richiesta $richiesta): Risposta
    {
        try {
            [$chi, $gestore, $parametri] = $this->trova($richiesta);
            if ($richiesta->metodo !== 'GET' && !$richiesta->json) {
                throw new Errore(415, 'Le richieste devono essere in JSON');
            }
            if ($richiesta->metodo !== 'GET' && $richiesta->corpo === null) {
                throw new Errore(400, 'JSON non valido');
            }
            $utente = ($this->utenteDellaSessione)($richiesta->sessione);
            if ($chi !== null && $utente === null) {
                throw new Errore(401, 'Serve l\'accesso');
            }
            if ($chi === 'logopedista' && $utente['ruolo'] !== 'logopedista') {
                throw new Errore(403, 'Riservato al logopedista');
            }
            $risposta = $gestore($richiesta, $parametri, $utente);
            // con l'accesso il cookie riparte a ogni richiesta: scade dopo 180 giorni senza usarlo
            if ($utente !== null && $risposta->sessione === null) {
                $risposta->sessione = $richiesta->sessione;
            }
            return $risposta;
        } catch (Errore $errore) {
            return Risposta::errore($errore->stato, $errore->getMessage());
        } catch (Throwable $guasto) {
            error_log((string) $guasto);
            return Risposta::errore(500, 'Errore del server: riprova più tardi');
        }
    }

    /** @return array{?string, Closure, array<string, int>} */
    private function trova(Richiesta $richiesta): array
    {
        $altroMetodo = false;
        foreach ($this->rotte as [$metodo, $regex, $chi, $gestore]) {
            if (preg_match($regex, $richiesta->percorso, $trovati) !== 1) {
                continue;
            }
            if ($metodo !== $richiesta->metodo) {
                $altroMetodo = true;
                continue;
            }
            $parametri = array_map('intval', array_filter($trovati, 'is_string', ARRAY_FILTER_USE_KEY));
            return [$chi, $gestore, $parametri];
        }
        throw $altroMetodo ? new Errore(405, 'Metodo non permesso') : new Errore(404, 'Pagina non trovata');
    }
}
