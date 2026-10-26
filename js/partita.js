import { mescola } from './casuale.js';
import { DIREZIONI, puoPassare } from './labirinto.js';

// Le funzioni modificano la partita e restituiscono cosa è successo,
// così chi disegna sa quale animazione mostrare.
export function creaPartita({ labirinto, parole, casuale }) {
  const partenza = { x: 0, y: 0 };
  const uscita = { x: labirinto.colonne - 1, y: labirinto.righe - 1 };
  const libere = [];
  for (let y = 0; y < labirinto.righe; y++) {
    for (let x = 0; x < labirinto.colonne; x++) {
      const casella = { x, y };
      if (!stessaCasella(casella, partenza) && !stessaCasella(casella, uscita)) libere.push(casella);
    }
  }
  return {
    labirinto,
    partenza,
    uscita,
    pollo: { ...partenza },
    chicchi: mescola(casuale, libere).slice(0, parole.length),
    parole: parole.map((testo) => ({ testo, riprova: 0 })),
    lette: 0,
    stato: 'gioco',
  };
}

export function stessaCasella(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function recintoAperto(partita) {
  return partita.lette === partita.parole.length;
}

export function parolaCorrente(partita) {
  return partita.stato === 'parola' ? partita.parole[partita.lette].testo : null;
}

export function muovi(partita, direzione) {
  if (partita.stato !== 'gioco') return { tipo: 'ignorato' };
  const da = { ...partita.pollo };
  if (!puoPassare(partita.labirinto, da.x, da.y, direzione)) return { tipo: 'bloccato' };
  const { dx, dy } = DIREZIONI[direzione];
  const a = { x: da.x + dx, y: da.y + dy };
  if (stessaCasella(a, partita.uscita) && !recintoAperto(partita)) return { tipo: 'bloccato' };
  partita.pollo = a;
  if (partita.chicchi.some((chicco) => stessaCasella(chicco, a))) {
    partita.stato = 'parola';
    return { tipo: 'parola', da, a, testo: parolaCorrente(partita) };
  }
  if (stessaCasella(a, partita.uscita)) {
    partita.stato = 'finita';
    return { tipo: 'uscita', da, a };
  }
  return { tipo: 'mosso', da, a };
}

export function riprova(partita) {
  if (partita.stato !== 'parola') return false;
  partita.parole[partita.lette].riprova += 1;
  return true;
}

export function corretta(partita) {
  if (partita.stato !== 'parola') return null;
  partita.chicchi = partita.chicchi.filter((chicco) => !stessaCasella(chicco, partita.pollo));
  partita.lette += 1;
  partita.stato = 'gioco';
  return { recintoAperto: recintoAperto(partita) };
}

export function totaleRiprova(parole) {
  return parole.reduce((somma, parola) => somma + parola.riprova, 0);
}
