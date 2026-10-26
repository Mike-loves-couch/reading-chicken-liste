import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaCasuale } from '../js/casuale.js';
import { DIREZIONI, dimensioniPer, generaLabirinto, puoPassare } from '../js/labirinto.js';

function raggiungibili(labirinto, partenza) {
  const viste = new Set([`${partenza.x},${partenza.y}`]);
  const coda = [partenza];
  while (coda.length > 0) {
    const { x, y } = coda.shift();
    for (const [nome, { dx, dy }] of Object.entries(DIREZIONI)) {
      const chiave = `${x + dx},${y + dy}`;
      if (puoPassare(labirinto, x, y, nome) && !viste.has(chiave)) {
        viste.add(chiave);
        coda.push({ x: x + dx, y: y + dy });
      }
    }
  }
  return viste;
}

function contaPassaggi(labirinto) {
  let aperti = 0;
  for (let y = 0; y < labirinto.righe; y++) {
    for (let x = 0; x < labirinto.colonne; x++) {
      if (puoPassare(labirinto, x, y, 'destra')) aperti++;
      if (puoPassare(labirinto, x, y, 'giu')) aperti++;
    }
  }
  return aperti;
}

const DIMENSIONI = [
  { colonne: 9, righe: 7 },
  { colonne: 11, righe: 8 },
  { colonne: 15, righe: 10 },
  { colonne: 21, righe: 15 },
];

test('dimensioniPer segue la tabella del design', () => {
  assert.deepEqual(dimensioniPer(2), { colonne: 9, righe: 7 });
  assert.deepEqual(dimensioniPer(5), { colonne: 9, righe: 7 });
  assert.deepEqual(dimensioniPer(10), { colonne: 11, righe: 8 });
  assert.deepEqual(dimensioniPer(20), { colonne: 15, righe: 10 });
  assert.deepEqual(dimensioniPer(50), { colonne: 21, righe: 15 });
});

test('ogni casella è raggiungibile dalla partenza', () => {
  for (const { colonne, righe } of DIMENSIONI) {
    for (const seme of [1, 2, 3, 99, 12345]) {
      const labirinto = generaLabirinto(colonne, righe, creaCasuale(seme));
      assert.equal(raggiungibili(labirinto, { x: 0, y: 0 }).size, colonne * righe, `${colonne}x${righe}, seme ${seme}`);
    }
  }
});

test('i muri sono coerenti nei due versi', () => {
  const labirinto = generaLabirinto(15, 10, creaCasuale(5));
  for (let y = 0; y < labirinto.righe; y++) {
    for (let x = 0; x < labirinto.colonne; x++) {
      if (x < labirinto.colonne - 1) {
        assert.equal(puoPassare(labirinto, x, y, 'destra'), puoPassare(labirinto, x + 1, y, 'sinistra'));
      }
      if (y < labirinto.righe - 1) {
        assert.equal(puoPassare(labirinto, x, y, 'giu'), puoPassare(labirinto, x, y + 1, 'su'));
      }
    }
  }
});

test('il bordo esterno è sempre chiuso', () => {
  const labirinto = generaLabirinto(9, 7, creaCasuale(8));
  for (let x = 0; x < 9; x++) {
    assert.equal(puoPassare(labirinto, x, 0, 'su'), false);
    assert.equal(puoPassare(labirinto, x, 6, 'giu'), false);
  }
  for (let y = 0; y < 7; y++) {
    assert.equal(puoPassare(labirinto, 0, y, 'sinistra'), false);
    assert.equal(puoPassare(labirinto, 8, y, 'destra'), false);
  }
});

test('dopo il backtracking si abbattono muri pari a un decimo delle caselle', () => {
  for (const { colonne, righe } of DIMENSIONI) {
    const labirinto = generaLabirinto(colonne, righe, creaCasuale(11));
    const caselle = colonne * righe;
    // un labirinto perfetto ha (caselle - 1) passaggi, poi se ne aggiungono floor(caselle / 10)
    assert.equal(contaPassaggi(labirinto), caselle - 1 + Math.floor(caselle / 10), `${colonne}x${righe}`);
  }
});

test('stesso seme, stesso labirinto', () => {
  assert.deepEqual(generaLabirinto(11, 8, creaCasuale(77)), generaLabirinto(11, 8, creaCasuale(77)));
});
