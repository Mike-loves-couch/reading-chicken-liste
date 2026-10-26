import { interoCasuale, mescola } from './casuale.js';

export const DIREZIONI = {
  su: { dx: 0, dy: -1 },
  giu: { dx: 0, dy: 1 },
  sinistra: { dx: -1, dy: 0 },
  destra: { dx: 1, dy: 0 },
};

export function dimensioniPer(n) {
  if (n <= 5) return { colonne: 9, righe: 7 };
  if (n <= 10) return { colonne: 11, righe: 8 };
  if (n <= 20) return { colonne: 15, righe: 10 };
  return { colonne: 21, righe: 15 };
}

function creaGriglia(colonne, righe, valore) {
  return Array.from({ length: righe }, () => Array(colonne).fill(valore));
}

// Labirinto perfetto con backtracking ricorsivo (versione con pila esplicita) su tutte
// le caselle tranne l'uscita, poi qualche muro in meno per creare anelli e ridurre i
// vicoli ciechi. L'uscita (in basso a destra) viene collegata per ultima con una sola
// apertura: così non divide mai il labirinto in due, e con il recinto chiuso ogni
// altra casella resta raggiungibile.
export function generaLabirinto(colonne, righe, casuale) {
  const labirinto = {
    colonne,
    righe,
    muroDestra: creaGriglia(colonne, righe, true),
    muroSotto: creaGriglia(colonne, righe, true),
  };
  const uscita = { x: colonne - 1, y: righe - 1 };
  const visitate = creaGriglia(colonne, righe, false);
  visitate[uscita.y][uscita.x] = true; // esclusa dal backtracking
  const pila = [{ x: 0, y: 0 }];
  visitate[0][0] = true;
  while (pila.length > 0) {
    const corrente = pila[pila.length - 1];
    const vicini = Object.values(DIREZIONI)
      .map(({ dx, dy }) => ({ x: corrente.x + dx, y: corrente.y + dy }))
      .filter(({ x, y }) => x >= 0 && x < colonne && y >= 0 && y < righe && !visitate[y][x]);
    if (vicini.length === 0) {
      pila.pop();
      continue;
    }
    const scelto = vicini[interoCasuale(casuale, vicini.length)];
    apriPassaggio(labirinto, corrente, scelto);
    visitate[scelto.y][scelto.x] = true;
    pila.push(scelto);
  }
  const ingressi = [{ x: uscita.x - 1, y: uscita.y }, { x: uscita.x, y: uscita.y - 1 }];
  apriPassaggio(labirinto, uscita, ingressi[interoCasuale(casuale, ingressi.length)]);
  abbattiMuri(labirinto, Math.floor((colonne * righe) / 10), casuale);
  return labirinto;
}

function apriPassaggio(labirinto, a, b) {
  if (a.y === b.y) labirinto.muroDestra[a.y][Math.min(a.x, b.x)] = false;
  else labirinto.muroSotto[Math.min(a.y, b.y)][a.x] = false;
}

function abbattiMuri(labirinto, quanti, casuale) {
  const { colonne, righe } = labirinto;
  const interni = [];
  for (let y = 0; y < righe; y++) {
    for (let x = 0; x < colonne; x++) {
      // i muri attorno all'uscita restano: deve avere una sola apertura
      const toccaUscitaDestra = x === colonne - 2 && y === righe - 1;
      const toccaUscitaSotto = x === colonne - 1 && y === righe - 2;
      if (x < colonne - 1 && labirinto.muroDestra[y][x] && !toccaUscitaDestra) interni.push({ verso: 'destra', x, y });
      if (y < righe - 1 && labirinto.muroSotto[y][x] && !toccaUscitaSotto) interni.push({ verso: 'sotto', x, y });
    }
  }
  for (const muro of mescola(casuale, interni).slice(0, quanti)) {
    if (muro.verso === 'destra') labirinto.muroDestra[muro.y][muro.x] = false;
    else labirinto.muroSotto[muro.y][muro.x] = false;
  }
}

export function puoPassare(labirinto, x, y, direzione) {
  const { dx, dy } = DIREZIONI[direzione];
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || nx >= labirinto.colonne || ny < 0 || ny >= labirinto.righe) return false;
  if (dx === 1) return !labirinto.muroDestra[y][x];
  if (dx === -1) return !labirinto.muroDestra[y][nx];
  if (dy === 1) return !labirinto.muroSotto[y][x];
  return !labirinto.muroSotto[ny][x];
}
