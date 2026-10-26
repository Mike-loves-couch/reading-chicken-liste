export const CHIAVE_STORICO = 'reading-chicken.storico.v1';
export const CHIAVE_MAIUSCOLO = 'reading-chicken.maiuscolo';

export function creaRecord({ data, tipo, lista, maiuscolo, durataSecondi, parole }) {
  return {
    data: data.toISOString(),
    tipo,
    lista,
    quantita: parole.length,
    maiuscolo,
    durataSecondi,
    parole: parole.map(({ testo, riprova }) => ({ testo, riprova })),
  };
}

// storage è window.localStorage nel browser; null se il browser lo blocca.
export function creaStorico(storage) {
  // null = storico non disponibile; dati rovinati = storico vuoto (verranno sovrascritti)
  function leggi() {
    if (!storage) return null;
    let grezzo;
    try {
      grezzo = storage.getItem(CHIAVE_STORICO);
    } catch {
      return null;
    }
    if (!grezzo) return [];
    try {
      const dati = JSON.parse(grezzo);
      return Array.isArray(dati) ? dati : [];
    } catch {
      return [];
    }
  }

  return {
    elenco() {
      const partite = leggi();
      if (partite === null) return null;
      return [...partite].sort((a, b) => b.data.localeCompare(a.data));
    },
    salva(record) {
      const partite = leggi();
      if (partite === null) return false;
      try {
        storage.setItem(CHIAVE_STORICO, JSON.stringify([...partite, record]));
        return true;
      } catch {
        return false;
      }
    },
    cancella() {
      if (!storage) return false;
      try {
        storage.removeItem(CHIAVE_STORICO);
        return true;
      } catch {
        return false;
      }
    },
    leggiMaiuscolo() {
      if (!storage) return true;
      try {
        return storage.getItem(CHIAVE_MAIUSCOLO) !== 'false';
      } catch {
        return true;
      }
    },
    salvaMaiuscolo(maiuscolo) {
      if (!storage) return;
      try {
        storage.setItem(CHIAVE_MAIUSCOLO, String(maiuscolo));
      } catch {
        // preferenza non salvata: al prossimo avvio si riparte da MAIUSCOLO
      }
    },
  };
}
