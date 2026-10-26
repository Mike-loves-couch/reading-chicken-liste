import { interoCasuale } from './casuale.js';

// Indici nel foglio Kenney "Tiny Dungeon" (img/dungeon/tilemap_packed.png, 12 colonne da 16 px).
export const PIASTRELLE = {
  muroCima: 0,
  muroFronte: 40,
  pavimento: 48,
  pavimentoSassi: 49,
  pavimentoOmbra: 50,
};
export const MOSTRI = [108, 120, 121, 122]; // slime, pipistrello, fantasmino, ragno
export const GEMME = ['rubino', 'ametista', 'topazio', 'smeraldo', 'zaffiro'];

// La casella (x, y) del labirinto occupa la piastrella (2x+1, 2y+1); le piastrelle in mezzo
// sono muri o passaggi, quelle con entrambe le coordinate pari sono sempre muro.
export function piastrellaDi(casella) {
  return { x: casella.x * 2 + 1, y: casella.y * 2 + 1 };
}

export function grigliaMuri(labirinto) {
  const muri = Array.from({ length: labirinto.righe * 2 + 1 }, () => Array(labirinto.colonne * 2 + 1).fill(true));
  for (let y = 0; y < labirinto.righe; y++) {
    for (let x = 0; x < labirinto.colonne; x++) {
      muri[y * 2 + 1][x * 2 + 1] = false;
      if (x < labirinto.colonne - 1 && !labirinto.muroDestra[y][x]) muri[y * 2 + 1][x * 2 + 2] = false;
      if (y < labirinto.righe - 1 && !labirinto.muroSotto[y][x]) muri[y * 2 + 2][x * 2 + 1] = false;
    }
  }
  return muri;
}

// Per ogni piastrella: quale disegno del foglio usare e su quali lati va il bordo di pietra.
// Vista dall'alto "a tre quarti": un muro con il pavimento sotto mostra la faccia di mattoni,
// gli altri mostrano la cima scura. Fuori dalla mappa conta come muro.
export function piastrelle(labirinto, casuale) {
  const muri = grigliaMuri(labirinto);
  const muro = (x, y) => muri[y]?.[x] ?? true;
  return muri.map((riga, y) => riga.map((eMuro, x) => {
    if (!eMuro) {
      if (muro(x, y - 1)) return { indice: PIASTRELLE.pavimentoOmbra, bordi: [] };
      return { indice: casuale() < 0.15 ? PIASTRELLE.pavimentoSassi : PIASTRELLE.pavimento, bordi: [] };
    }
    if (!muro(x, y + 1)) return { indice: PIASTRELLE.muroFronte, bordi: muro(x, y - 1) ? [] : ['su'] };
    const bordi = [];
    if (!muro(x, y - 1)) bordi.push('su');
    if (!muro(x - 1, y)) bordi.push('sinistra');
    if (!muro(x + 1, y)) bordi.push('destra');
    return { indice: PIASTRELLE.muroCima, bordi };
  }));
}

// A ogni chicco (ora: gemma) un mostro di guardia e il colore della gemma, scelti a caso.
export function scegliGuardiani(chicchi, casuale) {
  return new Map(chicchi.map((chicco) => [
    chiaveCasella(chicco),
    { mostro: MOSTRI[interoCasuale(casuale, MOSTRI.length)], gemma: GEMME[interoCasuale(casuale, GEMME.length)] },
  ]));
}

export function chiaveCasella(casella) {
  return `${casella.x},${casella.y}`;
}
