export const CHIAVE_STORICO = 'reading-chicken.storico.v1';
export const CHIAVE_MAIUSCOLO = 'reading-chicken.maiuscolo';
export const CHIAVE_TEMA = 'reading-chicken.tema';
export const CHIAVE_SUONI = 'reading-chicken.suoni';
export const CHIAVE_BAMBINO = 'reading-chicken.bambino';

export function creaRecord({ data, tipo, lista, maiuscolo, durataSecondi, parole }) {
  return {
    data: data.toISOString(),
    tipo,
    lista,
    quantita: parole.length,
    maiuscolo,
    durataSecondi,
    parole: parole.map(({ testo, riprova, secondi }) => ({ testo, riprova, secondi })),
  };
}

// scarta voci rovinate a mano: non devono rendere inutilizzabile lo storico
function eRecord(voce) {
  return Boolean(voce) && typeof voce.data === 'string' && Array.isArray(voce.parole);
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
      return Array.isArray(dati) ? dati.filter(eRecord) : [];
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
    // il nome del mondo scelto l'ultima volta, o null
    leggiTema() {
      if (!storage) return null;
      try {
        return storage.getItem(CHIAVE_TEMA);
      } catch {
        return null;
      }
    },
    salvaTema(nome) {
      if (!storage) return;
      try {
        storage.setItem(CHIAVE_TEMA, nome);
      } catch {
        // preferenza non salvata: al prossimo avvio si riparte dal mondo predefinito
      }
    },
    leggiSuoni() {
      if (!storage) return true;
      try {
        return storage.getItem(CHIAVE_SUONI) !== 'false';
      } catch {
        return true;
      }
    },
    salvaSuoni(attivi) {
      if (!storage) return;
      try {
        storage.setItem(CHIAVE_SUONI, String(attivi));
      } catch {
        // preferenza non salvata: al prossimo avvio i suoni ripartono accesi
      }
    },
    // il profilo scelto l'ultima volta in "Chi gioca?", o null
    leggiBambino() {
      if (!storage) return null;
      try {
        const id = Number.parseInt(storage.getItem(CHIAVE_BAMBINO) ?? '', 10);
        return Number.isInteger(id) ? id : null;
      } catch {
        return null;
      }
    },
    salvaBambino(id) {
      if (!storage) return;
      try {
        storage.setItem(CHIAVE_BAMBINO, String(id));
      } catch {
        // preferenza non salvata: al prossimo avvio si riparte dal primo profilo
      }
    },
  };
}
