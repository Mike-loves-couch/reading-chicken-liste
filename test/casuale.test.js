import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaCasuale, interoCasuale, mescola } from '../js/casuale.js';

test('stesso seme, stessa sequenza', () => {
  const a = creaCasuale(42);
  const b = creaCasuale(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('semi diversi danno sequenze diverse', () => {
  const a = creaCasuale(1);
  const b = creaCasuale(2);
  assert.notDeepEqual(Array.from({ length: 10 }, () => a()), Array.from({ length: 10 }, () => b()));
});

test('i valori stanno tra 0 incluso e 1 escluso', () => {
  const casuale = creaCasuale(7);
  for (let i = 0; i < 1000; i++) {
    const valore = casuale();
    assert.ok(valore >= 0 && valore < 1, `valore fuori intervallo: ${valore}`);
  }
});

test('interoCasuale resta tra 0 e massimo escluso', () => {
  const casuale = creaCasuale(7);
  for (let i = 0; i < 1000; i++) {
    const n = interoCasuale(casuale, 5);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 5, `valore fuori intervallo: ${n}`);
  }
});

test("mescola tiene gli stessi elementi e non modifica l'originale", () => {
  const originale = [1, 2, 3, 4, 5, 6, 7, 8];
  const mescolato = mescola(creaCasuale(3), originale);
  assert.deepEqual(originale, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...mescolato].sort((x, y) => x - y), originale);
});
