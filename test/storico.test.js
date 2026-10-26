import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHIAVE_STORICO, creaRecord, creaStorico } from '../js/storico.js';

function storageFinto() {
  const dati = new Map();
  return {
    getItem: (chiave) => (dati.has(chiave) ? dati.get(chiave) : null),
    setItem: (chiave, valore) => dati.set(chiave, String(valore)),
    removeItem: (chiave) => dati.delete(chiave),
  };
}

function storageBloccato() {
  const errore = () => { throw new Error('SecurityError'); };
  return { getItem: errore, setItem: errore, removeItem: errore };
}

function storagePieno() {
  const storage = storageFinto();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  return storage;
}

function record(data, lista = '01') {
  return creaRecord({
    data: new Date(data),
    tipo: 'parole',
    lista,
    maiuscolo: true,
    durataSecondi: 60,
    parole: [{ testo: 'pane', riprova: 1 }],
  });
}

test('creaRecord prepara il record da salvare', () => {
  const r = creaRecord({
    data: new Date('2026-10-26T21:40:12.345Z'),
    tipo: 'parole',
    lista: '01 - Bisillabe - Facili',
    maiuscolo: false,
    durataSecondi: 312,
    parole: [{ testo: 'pane', riprova: 0, altro: 'x' }, { testo: 'sole', riprova: 2 }],
  });
  assert.deepEqual(r, {
    data: '2026-10-26T21:40:12.345Z',
    tipo: 'parole',
    lista: '01 - Bisillabe - Facili',
    quantita: 2,
    maiuscolo: false,
    durataSecondi: 312,
    parole: [{ testo: 'pane', riprova: 0 }, { testo: 'sole', riprova: 2 }],
  });
});

test('storico vuoto restituisce un elenco vuoto', () => {
  assert.deepEqual(creaStorico(storageFinto()).elenco(), []);
});

test('salva e rilegge le partite, dalla più recente', () => {
  const storico = creaStorico(storageFinto());
  assert.equal(storico.salva(record('2026-10-20T10:00:00Z', 'vecchia')), true);
  assert.equal(storico.salva(record('2026-10-26T10:00:00Z', 'nuova')), true);
  assert.deepEqual(storico.elenco().map((r) => r.lista), ['nuova', 'vecchia']);
});

test('cancella svuota lo storico', () => {
  const storico = creaStorico(storageFinto());
  storico.salva(record('2026-10-26T10:00:00Z'));
  assert.equal(storico.cancella(), true);
  assert.deepEqual(storico.elenco(), []);
});

test('dati rovinati vengono trattati come storico vuoto', () => {
  const storage = storageFinto();
  storage.setItem(CHIAVE_STORICO, '{non json');
  assert.deepEqual(creaStorico(storage).elenco(), []);
});

test('senza storage lo storico non è disponibile', () => {
  const storico = creaStorico(null);
  assert.equal(storico.elenco(), null);
  assert.equal(storico.salva(record('2026-10-26T10:00:00Z')), false);
  assert.equal(storico.cancella(), false);
  assert.equal(storico.leggiMaiuscolo(), true);
  assert.doesNotThrow(() => storico.salvaMaiuscolo(false));
});

test('con storage bloccato lo storico non è disponibile e non lancia errori', () => {
  const storico = creaStorico(storageBloccato());
  assert.equal(storico.elenco(), null);
  assert.equal(storico.salva(record('2026-10-26T10:00:00Z')), false);
  assert.equal(storico.cancella(), false);
  assert.equal(storico.leggiMaiuscolo(), true);
  assert.doesNotThrow(() => storico.salvaMaiuscolo(false));
});

test('con storage pieno il salvataggio fallisce senza lanciare errori', () => {
  const storico = creaStorico(storagePieno());
  assert.equal(storico.salva(record('2026-10-26T10:00:00Z')), false);
  assert.deepEqual(storico.elenco(), []);
});

test('la preferenza maiuscolo parte da true e viene ricordata', () => {
  const storico = creaStorico(storageFinto());
  assert.equal(storico.leggiMaiuscolo(), true);
  storico.salvaMaiuscolo(false);
  assert.equal(storico.leggiMaiuscolo(), false);
  storico.salvaMaiuscolo(true);
  assert.equal(storico.leggiMaiuscolo(), true);
});

test('le voci rovinate vengono scartate', () => {
  const storage = storageFinto();
  storage.setItem(CHIAVE_STORICO, JSON.stringify([{}, null, 3, record('2026-10-26T10:00:00Z', 'buona')]));
  assert.deepEqual(creaStorico(storage).elenco().map((r) => r.lista), ['buona']);
});
