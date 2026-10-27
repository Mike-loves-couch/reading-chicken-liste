import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puntiAndamento } from '../js/grafico.js';

const partita = (tempo, riprova) => ({ giocata_il: '2026-10-27T10:00:00Z', tempo_medio: tempo, riprova });

test('le partite sono distribuite tra i margini, da sinistra a destra', () => {
  const { punti } = puntiAndamento([partita(2, 1), partita(3, 0), partita(4, 2)]);
  assert.deepEqual(punti.map((p) => p.x), [48, 320, 592]);
});

test('una sola partita sta al centro', () => {
  assert.equal(puntiAndamento([partita(2, 1)]).punti[0].x, 320);
});

test('il tempo più alto tocca la cima, la metà sta a metà, senza tempo non c\'è punto', () => {
  const { punti, massimoTempo } = puntiAndamento([partita(4, 0), partita(2, 0), partita(null, 0)]);
  assert.equal(massimoTempo, 4);
  assert.deepEqual(punti.map((p) => p.yTempo), [24, 114, null]);
});

test('le colonne dei Riprova sono proporzionali al massimo', () => {
  const { punti, massimoRiprova } = puntiAndamento([partita(1, 4), partita(1, 2), partita(1, 0)]);
  assert.equal(massimoRiprova, 4);
  assert.deepEqual(punti.map((p) => p.altezzaRiprova), [180, 90, 0]);
  assert.ok(punti.every((p) => p.fondo === 204));
});

test('senza partite non ci sono punti', () => {
  assert.deepEqual(puntiAndamento([]), { massimoTempo: 0, massimoRiprova: 0, punti: [] });
});
