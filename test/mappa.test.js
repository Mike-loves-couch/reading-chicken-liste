import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaCasuale } from '../js/casuale.js';
import { generaLabirinto, puoPassare } from '../js/labirinto.js';
import { chiaveCasella, grigliaMuri, piastrellaDi, piastrelle, scegliGuardiani } from '../js/mappa.js';

const SCHEMA = {
  muroCima: [[0]],
  muroFronte: [[40]],
  pavimento: [[48, 49]],
  pavimentoOmbra: [[50]],
  bordi: { luce: '#fff', scuro: '#000' },
};

// casuale fisso: 0.2 sceglie il primo di due, 0.7 il secondo
const sempre = (valore) => () => valore;

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

test('muri: faccia sopra il pavimento, cima con i bordi verso il pavimento', () => {
  // 2 caselle affiancate e collegate: griglia 5x3, pavimento in (1..3, 1)
  const mappa = piastrelle(labirintoAperto(2, 1), sempre(0.2), SCHEMA);
  assert.deepEqual(mappa[0][1], { strati: [40], bordi: [] });
  assert.deepEqual(mappa[0][0], { strati: [0], bordi: [] });
  assert.deepEqual(mappa[1][0], { strati: [0], bordi: ['destra'] });
  assert.deepEqual(mappa[1][4], { strati: [0], bordi: ['sinistra'] });
  assert.deepEqual(mappa[2][1], { strati: [0], bordi: ['su'] });
});

test('un muro con il pavimento sopra e sotto ha la faccia e il bordo in alto', () => {
  // 1 colonna, 3 righe, muro tra la riga 1 e la 2: la piastrella (1, 4) ha pavimento sopra e sotto
  const labirinto = labirintoAperto(1, 3);
  labirinto.muroSotto[1][0] = true;
  assert.deepEqual(piastrelle(labirinto, sempre(0.2), SCHEMA)[4][1], { strati: [40], bordi: ['su'] });
});

test('pavimento: in ombra sotto un muro, altrimenti una delle varianti', () => {
  const labirinto = labirintoAperto(1, 2); // griglia 3x5, pavimento in (1, 1..3)
  assert.deepEqual(piastrelle(labirinto, sempre(0.2), SCHEMA)[1][1].strati, [50]);
  assert.deepEqual(piastrelle(labirinto, sempre(0.2), SCHEMA)[2][1].strati, [48]);
  assert.deepEqual(piastrelle(labirinto, sempre(0.7), SCHEMA)[2][1].strati, [49]);
});

test('senza bordi nello schema nessuna piastrella ha bordi', () => {
  const mappa = piastrelle(labirintoAperto(2, 2), sempre(0.2), { ...SCHEMA, bordi: null });
  assert.ok(mappa.flat().every((p) => p.bordi.length === 0));
});

test('gli strati si scelgono uno per livello, dal basso verso l alto', () => {
  const schema = { ...SCHEMA, muroCima: [[0, 1], [5, 4]] };
  assert.deepEqual(piastrelle(labirintoAperto(1, 1), sempre(0.7), schema)[0][0].strati, [1, 4]);
});

test('ogni oggetto ha un guardiano e un immagine del mondo', () => {
  const chicchi = [{ x: 1, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 5 }];
  const tema = { guardiani: [108, 120], oggetti: ['a.png', 'b.png'] };
  const guardiani = scegliGuardiani(chicchi, creaCasuale(8), tema);
  assert.deepEqual([...guardiani.keys()], chicchi.map(chiaveCasella));
  for (const { mostro, oggetto } of guardiani.values()) {
    assert.ok(tema.guardiani.includes(mostro));
    assert.ok(tema.oggetti.includes(oggetto));
  }
  assert.deepEqual(scegliGuardiani(chicchi, creaCasuale(8), tema), guardiani);
});

test('un mondo senza guardiani lascia solo gli oggetti', () => {
  const guardiani = scegliGuardiani([{ x: 1, y: 1 }], creaCasuale(1), { guardiani: [], oggetti: ['mais.png'] });
  assert.deepEqual(guardiani.get('1,1'), { mostro: null, oggetto: 'mais.png' });
});
