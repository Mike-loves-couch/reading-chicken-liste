// Partite da mandare al server: restano nel browser finché il server non le ha ricevute,
// così una partita giocata senza rete parte alla prima occasione.
export const CHIAVE_CODA = 'reading-chicken.da-inviare.v1';

// risposte definitive: il server non accetterà mai quella partita (profilo archiviato o eliminato, dati rifiutati)
const DA_SCARTARE = new Set([400, 403, 404, 409]);

export function creaCoda(storage, invia) {
  let inMemoria = []; // se il browser non permette di salvare, la coda dura finché la pagina resta aperta

  function leggi() {
    try {
      const dati = JSON.parse(storage.getItem(CHIAVE_CODA) ?? '[]');
      return Array.isArray(dati) ? dati : [];
    } catch {
      return storage ? [] : inMemoria;
    }
  }

  function scrivi(partite) {
    inMemoria = partite;
    try {
      storage.setItem(CHIAVE_CODA, JSON.stringify(partite));
    } catch {
      // resta in memoria
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
          if (!DA_SCARTARE.has(errore?.stato)) break;
          console.warn('Partita scartata dal server:', errore.message);
        }
        scrivi(leggi().filter((p) => p.id_client !== partita.id_client));
      }
      return leggi().length;
    },
  };
}
