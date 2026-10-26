import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaCasuale } from '../js/casuale.js';
import { generaLabirinto, puoPassare } from '../js/labirinto.js';
import {
  GEMME, MOSTRI, PIASTRELLE, chiaveCasella, grigliaMuri, piastrellaDi, piastrelle, scegliGuardiani,
} from '../js/mappa.js';

function labirintoAperto(colonne, righe) {
  return {
    colonne,
    righe,
    muroDestra: Array.from({ length: righe }, () => Array(colonne).fill(false)),
    muroSotto: Array.from({ length: righe }, () => Array(colonne).fill(false)),
  };
}

test('ogni casella occupa la piastrella dispari corrispondente', () => {
  assert.deepEqual(piastrellaDi({ x: 0, y: 0 }), { x: 1, y: 1 });
  assert.deepEqual(piastrellaDi({ x: 3, y: 2 }), { x: 7, y: 5 });
});

test('la griglia dei muri rispecchia il labirinto', () => {
  const labirinto = generaLabirinto(11, 8, creaCasuale(4));
  const muri = grigliaMuri(labirinto);
  assert.equal(muri.length, 17);
  assert.ok(muri.every((riga) => riga.length === 23));
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 11; x++) {
      assert.equal(muri[y * 2 + 1][x * 2 + 1], false, `casella ${x},${y}`);
      if (x < 10) assert.equal(muri[y * 2 + 1][x * 2 + 2], !puoPassare(labirinto, x, y, 'destra'));
      if (y < 7) assert.equal(muri[y * 2 + 2][x * 2 + 1], !puoPassare(labirinto, x, y, 'giu'));
    }
  }
  for (let y = 0; y < 17; y += 2) {
    for (let x = 0; x < 23; x += 2) assert.equal(muri[y][x], true, `angolo ${x},${y}`);
  }
  assert.ok(muri[0].every(Boolean) && muri[16].every(Boolean));
  assert.ok(muri.every((riga) => riga[0] && riga[22]));
});

test('muri: faccia di mattoni sopra il pavimento, cima scura con i bordi verso il pavimento', () => {
  // 2 caselle affiancate e collegate: griglia 5x3, pavimento in (1..3, 1)
  const mappa = piastrelle(labirintoAperto(2, 1), () => 0.5);
  assert.deepEqual(mappa[0][1], { indice: PIASTRELLE.muroFronte, bordi: [] });
  assert.deepEqual(mappa[0][0], { indice: PIASTRELLE.muroCima, bordi: [] });
  assert.deepEqual(mappa[1][0], { indice: PIASTRELLE.muroCima, bordi: ['destra'] });
  assert.deepEqual(mappa[1][4], { indice: PIASTRELLE.muroCima, bordi: ['sinistra'] });
  assert.deepEqual(mappa[2][1], { indice: PIASTRELLE.muroCima, bordi: ['su'] });
});

test("un muro isolato sopra e sotto il pavimento ha la faccia e il bordo in alto", () => {
  // 1 colonna, 3 righe, muro tra la riga 1 e la 2: la piastrella (1, 4) ha pavimento sopra e sotto
  const labirinto = labirintoAperto(1, 3);
  labirinto.muroSotto[1][0] = true;
  assert.deepEqual(piastrelle(labirinto, () => 0.5)[4][1], { indice: PIASTRELLE.muroFronte, bordi: ['su'] });
});

test("pavimento: ombra sotto un muro, altrimenti liscio o con i sassi", () => {
  const labirinto = labirintoAperto(1, 2); // griglia 3x5, pavimento in (1, 1..3)
  assert.equal(piastrelle(labirinto, () => 0.5)[1][1].indice, PIASTRELLE.pavimentoOmbra);
  assert.equal(piastrelle(labirinto, () => 0.5)[2][1].indice, PIASTRELLE.pavimento);
  assert.equal(piastrelle(labirinto, () => 0.1)[2][1].indice, PIASTRELLE.pavimentoSassi);
});

test('ogni gemma ha un mostro di guardia e un colore validi', () => {
  const chicchi = [{ x: 1, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 5 }];
  const guardiani = scegliGuardiani(chicchi, creaCasuale(8));
  assert.deepEqual([...guardiani.keys()], chicchi.map(chiaveCasella));
  for (const { mostro, gemma } of guardiani.values()) {
    assert.ok(MOSTRI.includes(mostro));
    assert.ok(GEMME.includes(gemma));
  }
  assert.deepEqual(scegliGuardiani(chicchi, creaCasuale(8)), guardiani);
});
