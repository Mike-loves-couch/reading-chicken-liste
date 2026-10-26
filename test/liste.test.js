import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creaCasuale } from '../js/casuale.js';
import { caricaTutto, formatta, normalizzaListe, opzioniQuantita, pescaParole, pulisci } from '../js/liste.js';

function leggiJson(percorso) {
  return JSON.parse(readFileSync(new URL(percorso, import.meta.url), 'utf8'));
}

function creaFetchFinto(risposte) {
  return async (url) => {
    const risposta = risposte[url];
    return {
      ok: risposta.ok ?? true,
      status: risposta.status ?? 200,
      json: async () => {
        if (risposta.json instanceof Error) throw risposta.json;
        return risposta.json;
      },
    };
  };
}

test("formato sillabe: le liste sono le chiavi dell'oggetto", () => {
  assert.deepEqual(normalizzaListe({ '01 - Vocali': ['A', 'E'], '02 - CV': ['PA'] }), [
    { nome: '01 - Vocali', elementi: ['A', 'E'] },
    { nome: '02 - CV', elementi: ['PA'] },
  ]);
});

test('formato parole: le liste stanno sotto "liste"', () => {
  const dati = { versione: 'prova-1', stato: 'bozza', nota: 'x', liste: { '01 - Facili': ['ala', 'ape'] } };
  assert.deepEqual(normalizzaListe(dati), [{ nome: '01 - Facili', elementi: ['ala', 'ape'] }]);
});

test('le chiavi che non contengono liste vengono ignorate', () => {
  assert.deepEqual(normalizzaListe({ versione: 'x', '01 - A': ['A'] }), [{ nome: '01 - A', elementi: ['A'] }]);
});

test('un formato non valido lancia un errore', () => {
  assert.throws(() => normalizzaListe(null), /Formato liste non valido/);
  assert.throws(() => normalizzaListe(['A']), /Formato liste non valido/);
});

test('pulisci toglie spazi, vuoti, non-stringhe e doppioni ignorando maiuscole', () => {
  assert.deepEqual(pulisci([' pane ', '', '   ', 3, null, 'UFO', 'ufo', 'pane', 'sole']), ['pane', 'UFO', 'sole']);
});

test('opzioniQuantita: lista vuota non offre niente', () => {
  assert.deepEqual(opzioniQuantita(0), []);
});

test('opzioniQuantita: 2 elementi offrono solo "Tutte (2)"', () => {
  assert.deepEqual(opzioniQuantita(2), [{ valore: 2, etichetta: 'Tutte (2)', attiva: true }]);
});

test('opzioniQuantita: 5 elementi attivano solo il 5', () => {
  assert.deepEqual(opzioniQuantita(5).map((o) => [o.valore, o.attiva]), [[5, true], [10, false], [20, false], [50, false]]);
});

test('opzioniQuantita: 14 elementi attivano 5 e 10', () => {
  assert.deepEqual(opzioniQuantita(14).map((o) => [o.valore, o.attiva]), [[5, true], [10, true], [20, false], [50, false]]);
});

test('opzioniQuantita: 63 elementi attivano tutto', () => {
  assert.deepEqual(opzioniQuantita(63).map((o) => o.attiva), [true, true, true, true]);
});

test('formatta converte con le regole italiane, accentate comprese', () => {
  assert.equal(formatta('perché', true), 'PERCHÉ');
  assert.equal(formatta('UFO', false), 'ufo');
  assert.equal(formatta('PA', true), 'PA');
});

test('pescaParole pesca senza ripetizioni e non modifica la lista', () => {
  const elementi = ['a', 'b', 'c', 'd', 'e', 'f'];
  const pescate = pescaParole(elementi, 4, creaCasuale(9));
  assert.equal(pescate.length, 4);
  assert.equal(new Set(pescate).size, 4);
  assert.ok(pescate.every((p) => elementi.includes(p)));
  assert.deepEqual(elementi, ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('caricaTutto carica i due tipi e segnala quello che non si scarica', async () => {
  const dati = await caricaTutto(creaFetchFinto({
    'liste/sillabe.json': { json: { '01 - Vocali': ['A'] } },
    'liste/parole.json': { ok: false, status: 404 },
  }));
  assert.deepEqual(dati.sillabe, { url: 'liste/sillabe.json', liste: [{ nome: '01 - Vocali', elementi: ['A'] }] });
  assert.equal(dati.parole.url, 'liste/parole.json');
  assert.match(dati.parole.errore, /404/);
});

test('caricaTutto segnala un JSON non valido', async () => {
  const dati = await caricaTutto(creaFetchFinto({
    'liste/sillabe.json': { json: new SyntaxError('Unexpected token') },
    'liste/parole.json': { json: { liste: { '01': ['ala'] } } },
  }));
  assert.match(dati.sillabe.errore, /Unexpected token/);
  assert.deepEqual(dati.parole.liste, [{ nome: '01', elementi: ['ala'] }]);
});

test('i file veri delle liste si caricano', () => {
  for (const percorso of ['../liste/sillabe.json', '../liste/parole.json']) {
    const liste = normalizzaListe(leggiJson(percorso));
    assert.ok(liste.length > 0, percorso);
    for (const lista of liste) {
      assert.ok(lista.elementi.every((e) => typeof e === 'string' && e.length > 0), lista.nome);
    }
  }
});
