// Partite da mandare al server: restano nel browser finché il server non le ha ricevute,
// così una partita giocata senza rete parte alla prima occasione.
export const CHIAVE_CODA = 'reading-chicken.da-inviare.v1';

// Risposte definitive del nostro server: dati rifiutati (400), partita già registrata per un altro profilo (409),
// profilo archiviato, eliminato o di altri (404 con questo messaggio). Un 404 o un 403 diverso può venire
// dall'hosting (pagina d'errore durante un aggiornamento): la partita resta in coda.
const PROFILO_NON_TROVATO = 'Profilo non trovato';
const daScartare = (errore) =>
  errore?.stato === 400 || errore?.stato === 409 || (errore?.stato === 404 && errore.message === PROFILO_NON_TROVATO);

export function creaCoda(storage, invia) {
  let inMemoria = [];
  let soloInMemoria = false; // il browser non permette di salvare: la coda dura finché la pagina resta aperta

  function leggi() {
    if (soloInMemoria) return inMemoria;
    let grezzo;
    try {
      grezzo = storage.getItem(CHIAVE_CODA);
    } catch {
      soloInMemoria = true;
      return inMemoria;
    }
    try {
      const dati = JSON.parse(grezzo ?? '[]');
      return Array.isArray(dati) ? dati : [];
    } catch {
      return [];
    }
  }

  function scrivi(partite) {
    inMemoria = partite;
    if (soloInMemoria) return;
    try {
      storage.setItem(CHIAVE_CODA, JSON.stringify(partite));
    } catch {
      soloInMemoria = true;
    }
  }

  return {
    aggiungi(partita) {
      scrivi([...leggi(), partita]);
    },
    inAttesa() {
      return leggi().length;
    },
    // Manda le partite una alla volta, nell'ordine; al primo errore temporaneo (rete, accesso scaduto,
    // server in errore) si ferma e riprova la volta dopo. Restituisce quante ne restano.
    async inviaTutto() {
      for (const partita of leggi()) {
        try {
          await invia(partita);
        } catch (errore) {
          if (!daScartare(errore)) break;
          console.warn('Partita scartata dal server:', errore.message);
        }
        scrivi(leggi().filter((p) => p.id_client !== partita.id_client));
      }
      return leggi().length;
    },
  };
}
