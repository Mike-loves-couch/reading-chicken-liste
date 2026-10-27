import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuovoId, partitaDalServer, partitaPerIlServer } from '../js/risultati.js';
import { creaRecord } from '../js/storico.js';

test('nuovoId usa crypto.randomUUID quando c\'è', () => {
  assert.equal(nuovoId({ randomUUID: () => 'id-dal-browser' }), 'id-dal-browser');
});

test('senza crypto.randomUUID (pagina non https) costruisce un UUID versione 4', () => {
  const cripto = { getRandomValues: (byte) => byte.fill(0xff) };
  assert.equal(nuovoId(cripto), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});

const record = creaRecord({
  data: new Date('2026-10-27T09:30:00.000Z'),
  tipo: 'parole',
  lista: '01 - Bisillabe - Facili',
  maiuscolo: true,
  durataSecondi: 42,
  parole: [{ testo: 'pane', riprova: 1, secondi: 3.2 }, { testo: 'sole', riprova: 0, secondi: null }],
});

test('dal record dello storico al corpo di POST /api/partite', () => {
  assert.deepEqual(partitaPerIlServer(record, 7, 'id-1'), {
    id_client: 'id-1',
    bambino_id: 7,
    giocata_il: '2026-10-27T09:30:00.000Z',
    tipo: 'parole',
    lista: '01 - Bisillabe - Facili',
    maiuscolo: true,
    durata_secondi: 42,
    parole: [{ testo: 'pane', riprova: 1, secondi: 3.2 }, { testo: 'sole', riprova: 0, secondi: null }],
  });
});

test('da una partita del server al formato dello storico', () => {
  const dalServer = {
    id_client: 'id-1',
    giocata_il: '2026-10-27T09:30:00Z',
    tipo: 'parole',
    lista: '01 - Bisillabe - Facili',
    maiuscolo: true,
    quantita: 2,
    durata_secondi: 42,
    parole: [{ testo: 'pane', riprova: 1, secondi: 3.2 }, { testo: 'sole', riprova: 0, secondi: null }],
  };
  assert.deepEqual(partitaDalServer(dalServer), { ...record, data: '2026-10-27T09:30:00Z' });
});
