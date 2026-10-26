import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaCasuale } from '../js/casuale.js';
import { generaLabirinto } from '../js/labirinto.js';
import {
  corretta, creaPartita, muovi, parolaCorrente, recintoAperto, riprova, stessaCasella, totaleRiprova,
} from '../js/partita.js';

// Labirinto senza muri interni: il movimento dipende solo dal bordo, dai chicchi e dal recinto.
function labirintoAperto(colonne, righe) {
  return {
    colonne,
    righe,
    muroDestra: Array.from({ length: righe }, () => Array(colonne).fill(false)),
    muroSotto: Array.from({ length: righe }, () => Array(colonne).fill(false)),
  };
}

// Griglia 3x2: partenza (0,0), uscita (2,1).
function partitaDiProva({ parole = ['pane', 'sole'], chicchi, labirinto = labirintoAperto(3, 2) } = {}) {
  const partita = creaPartita({ labirinto, parole, casuale: creaCasuale(1) });
  if (chicchi) partita.chicchi = chicchi;
  return partita;
}

test('un chicco per parola, mai su partenza o uscita, mai due sulla stessa casella', () => {
  for (let seme = 1; seme <= 20; seme++) {
    const casuale = creaCasuale(seme);
    const labirinto = generaLabirinto(9, 7, casuale);
    const partita = creaPartita({ labirinto, parole: ['a', 'b', 'c', 'd', 'e'], casuale });
    assert.equal(partita.chicchi.length, 5);
    assert.equal(new Set(partita.chicchi.map((c) => `${c.x},${c.y}`)).size, 5);
    for (const chicco of partita.chicchi) {
      assert.ok(!stessaCasella(chicco, partita.partenza), `seme ${seme}: chicco sulla partenza`);
      assert.ok(!stessaCasella(chicco, partita.uscita), `seme ${seme}: chicco sull'uscita`);
    }
  }
});

test('la partita parte dalla casella in alto a sinistra con il recinto chiuso', () => {
  const partita = partitaDiProva();
  assert.deepEqual(partita.pollo, { x: 0, y: 0 });
  assert.deepEqual(partita.uscita, { x: 2, y: 1 });
  assert.deepEqual(partita.parole, [{ testo: 'pane', riprova: 0 }, { testo: 'sole', riprova: 0 }]);
  assert.equal(partita.stato, 'gioco');
  assert.equal(recintoAperto(partita), false);
});

test('il bordo blocca il pollo', () => {
  const partita = partitaDiProva({ chicchi: [] });
  assert.deepEqual(muovi(partita, 'su'), { tipo: 'bloccato' });
  assert.deepEqual(partita.pollo, { x: 0, y: 0 });
});

test('i muri bloccano il pollo', () => {
  const labirinto = labirintoAperto(3, 2);
  labirinto.muroDestra[0][0] = true;
  const partita = partitaDiProva({ labirinto, chicchi: [] });
  assert.deepEqual(muovi(partita, 'destra'), { tipo: 'bloccato' });
  assert.deepEqual(partita.pollo, { x: 0, y: 0 });
});

test('muoversi su una casella vuota sposta il pollo', () => {
  const partita = partitaDiProva({ chicchi: [{ x: 2, y: 0 }] });
  assert.deepEqual(muovi(partita, 'destra'), { tipo: 'mosso', da: { x: 0, y: 0 }, a: { x: 1, y: 0 } });
  assert.deepEqual(partita.pollo, { x: 1, y: 0 });
});

test('entrare su un chicco apre la parola successiva', () => {
  const partita = partitaDiProva({ chicchi: [{ x: 1, y: 0 }] });
  assert.deepEqual(muovi(partita, 'destra'), { tipo: 'parola', da: { x: 0, y: 0 }, a: { x: 1, y: 0 }, testo: 'pane' });
  assert.equal(partita.stato, 'parola');
  assert.equal(parolaCorrente(partita), 'pane');
});

test('con la parola aperta i movimenti sono ignorati', () => {
  const partita = partitaDiProva({ chicchi: [{ x: 1, y: 0 }] });
  muovi(partita, 'destra');
  assert.deepEqual(muovi(partita, 'giu'), { tipo: 'ignorato' });
  assert.deepEqual(partita.pollo, { x: 1, y: 0 });
});

test('Riprova conta i tentativi sulla parola corrente e la lascia aperta', () => {
  const partita = partitaDiProva({ chicchi: [{ x: 1, y: 0 }] });
  assert.equal(riprova(partita), false); // nessuna parola aperta
  muovi(partita, 'destra');
  assert.equal(riprova(partita), true);
  assert.equal(riprova(partita), true);
  assert.equal(partita.parole[0].riprova, 2);
  assert.equal(partita.stato, 'parola');
});

test('Corretta mangia il chicco e passa alla parola successiva', () => {
  const partita = partitaDiProva({ chicchi: [{ x: 1, y: 0 }, { x: 0, y: 1 }] });
  assert.equal(corretta(partita), null); // nessuna parola aperta
  muovi(partita, 'destra');
  assert.deepEqual(corretta(partita), { recintoAperto: false });
  assert.deepEqual(partita.chicchi, [{ x: 0, y: 1 }]);
  assert.equal(partita.lette, 1);
  assert.equal(partita.stato, 'gioco');
  assert.equal(parolaCorrente(partita), null);
});

test("il recinto chiuso blocca l'uscita", () => {
  const partita = partitaDiProva({ parole: ['pane'], chicchi: [{ x: 0, y: 1 }] });
  muovi(partita, 'destra');
  muovi(partita, 'giu');
  assert.deepEqual(muovi(partita, 'destra'), { tipo: 'bloccato' });
  assert.deepEqual(partita.pollo, { x: 1, y: 1 });
});

test("dopo l'ultimo chicco il recinto si apre e si può uscire", () => {
  const partita = partitaDiProva({ parole: ['pane'], chicchi: [{ x: 1, y: 0 }] });
  muovi(partita, 'destra');
  assert.deepEqual(corretta(partita), { recintoAperto: true });
  assert.equal(muovi(partita, 'giu').tipo, 'mosso');
  assert.deepEqual(muovi(partita, 'destra'), { tipo: 'uscita', da: { x: 1, y: 1 }, a: { x: 2, y: 1 } });
  assert.equal(partita.stato, 'finita');
  assert.deepEqual(muovi(partita, 'su'), { tipo: 'ignorato' });
});

test('totaleRiprova somma i tentativi', () => {
  assert.equal(totaleRiprova([{ testo: 'a', riprova: 2 }, { testo: 'b', riprova: 0 }, { testo: 'c', riprova: 1 }]), 3);
  assert.equal(totaleRiprova([]), 0);
});
