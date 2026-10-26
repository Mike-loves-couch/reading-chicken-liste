import { mescola } from './casuale.js';

export const FILE_LISTE = { sillabe: 'liste/sillabe.json', parole: 'liste/parole.json' };
export const QUANTITA = [5, 10, 20, 50];

// Accetta i due formati di Mike:
// - sillabe: { "<nome lista>": [...] }
// - parole:  { versione, stato, nota, liste: { "<nome lista>": [...] } }
export function normalizzaListe(dati) {
  const haListe = dati && typeof dati.liste === 'object' && dati.liste !== null && !Array.isArray(dati.liste);
  const sorgente = haListe ? dati.liste : dati;
  if (!sorgente || typeof sorgente !== 'object' || Array.isArray(sorgente)) {
    throw new Error('Formato liste non valido');
  }
  return Object.entries(sorgente)
    .filter(([, valori]) => Array.isArray(valori))
    .map(([nome, valori]) => ({ nome, elementi: pulisci(valori) }));
}

export function pulisci(valori) {
  const visti = new Set();
  const risultato = [];
  for (const valore of valori) {
    if (typeof valore !== 'string') continue;
    const testo = valore.trim();
    if (testo === '') continue;
    const chiave = testo.toLocaleLowerCase('it-IT');
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    risultato.push(testo);
  }
  return risultato;
}

export function opzioniQuantita(disponibili) {
  if (disponibili === 0) return [];
  if (disponibili < QUANTITA[0]) {
    return [{ valore: disponibili, etichetta: `Tutte (${disponibili})`, attiva: true }];
  }
  return QUANTITA.map((quantita) => ({ valore: quantita, etichetta: String(quantita), attiva: quantita <= disponibili }));
}

export function formatta(testo, maiuscolo) {
  return maiuscolo ? testo.toLocaleUpperCase('it-IT') : testo.toLocaleLowerCase('it-IT');
}

export function pescaParole(elementi, quante, casuale) {
  return mescola(casuale, elementi).slice(0, quante);
}

// no-cache: il browser ricontrolla il file, così le modifiche di Mike si vedono subito.
const fetchPredefinito = (url) => fetch(url, { cache: 'no-cache' });

async function caricaTipo(url, fetchFn) {
  const risposta = await fetchFn(url);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
  return normalizzaListe(await risposta.json());
}

// Non lancia mai: un tipo che non si carica riporta l'errore, l'altro resta giocabile.
export async function caricaTutto(fetchFn = fetchPredefinito) {
  const risultato = {};
  for (const [tipo, url] of Object.entries(FILE_LISTE)) {
    try {
      risultato[tipo] = { url, liste: await caricaTipo(url, fetchFn) };
    } catch (errore) {
      risultato[tipo] = { url, errore: errore.message };
    }
  }
  return risultato;
}
