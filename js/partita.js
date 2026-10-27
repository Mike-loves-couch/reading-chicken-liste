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
  if (parole.length > libere.length) {
    throw new Error(`Troppe parole (${parole.length}) per un labirinto ${labirinto.colonne}x${labirinto.righe}`);
  }
  return {
    labirinto,
    partenza,
    uscita,
    pollo: { ...partenza },
    chicchi: mescola(casuale, libere).slice(0, parole.length),
    parole: parole.map((testo) => ({ testo, riprova: 0, secondi: null })),
    lette: 0,
    parolaDa: null, // ms in cui la parola corrente è comparsa a schermo
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

// La parola compare a schermo poco dopo l'arrivo del pollo: da lì parte il suo tempo,
// che si ferma su Corretta (i Riprova sono compresi). ora è in millisecondi.
export function parolaMostrata(partita, ora) {
  if (partita.stato === 'parola') partita.parolaDa = ora;
}

export function corretta(partita, ora) {
  if (partita.stato !== 'parola') return null;
  if (partita.parolaDa !== null) partita.parole[partita.lette].secondi = Math.round((ora - partita.parolaDa) / 100) / 10;
  partita.parolaDa = null;
  partita.chicchi = partita.chicchi.filter((chicco) => !stessaCasella(chicco, partita.pollo));
  partita.lette += 1;
  partita.stato = 'gioco';
  return { recintoAperto: recintoAperto(partita) };
}

export function totaleRiprova(parole) {
  return parole.reduce((somma, parola) => somma + parola.riprova, 0);
}

// media dei secondi per parola, con un decimale; le partite salvate prima dei tempi non ne hanno
export function tempoMedio(parole) {
  const tempi = parole.map((parola) => parola.secondi).filter(Number.isFinite);
  if (tempi.length === 0) return null;
  return Math.round((tempi.reduce((somma, secondi) => somma + secondi, 0) / tempi.length) * 10) / 10;
}
