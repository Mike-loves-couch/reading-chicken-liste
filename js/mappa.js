import { interoCasuale } from './casuale.js';

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

// Per ogni piastrella: gli indici del foglio da disegnare uno sopra l'altro e i lati su cui
// va il bordo. Vista dall'alto "a tre quarti": un muro con il pavimento sotto mostra la sua
// faccia, gli altri la cima; il pavimento sotto un muro è in ombra. Fuori dalla mappa è muro.
// `schema` è la voce `piastrelle` di un tema (vedi temi.js).
export function piastrelle(labirinto, casuale, schema) {
  const muri = grigliaMuri(labirinto);
  const muro = (x, y) => muri[y]?.[x] ?? true;
  const strati = (voce) => voce.map((scelte) => scelte[interoCasuale(casuale, scelte.length)]);
  return muri.map((riga, y) => riga.map((eMuro, x) => {
    if (!eMuro) {
      return { strati: strati(muro(x, y - 1) ? schema.pavimentoOmbra : schema.pavimento), bordi: [] };
    }
    if (!muro(x, y + 1)) {
      return { strati: strati(schema.muroFronte), bordi: schema.bordi && !muro(x, y - 1) ? ['su'] : [] };
    }
    const bordi = [];
    if (schema.bordi) {
      if (!muro(x, y - 1)) bordi.push('su');
      if (!muro(x - 1, y)) bordi.push('sinistra');
      if (!muro(x + 1, y)) bordi.push('destra');
    }
    return { strati: strati(schema.muroCima), bordi };
  }));
}

// A ogni casella con un oggetto da raccogliere: il guardiano (indice nel foglio, o null se il
// mondo non ne ha) e l'immagine dell'oggetto, scelti a caso.
export function scegliGuardiani(chicchi, casuale, tema) {
  return new Map(chicchi.map((chicco) => [
    chiaveCasella(chicco),
    {
      mostro: tema.guardiani.length > 0 ? tema.guardiani[interoCasuale(casuale, tema.guardiani.length)] : null,
      oggetto: tema.oggetti[interoCasuale(casuale, tema.oggetti.length)],
    },
  ]));
}

export function chiaveCasella(casella) {
  return `${casella.x},${casella.y}`;
}
