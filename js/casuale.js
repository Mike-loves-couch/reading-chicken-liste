// Generatore pseudo-casuale con seme (algoritmo mulberry32):
// a parità di seme produce la stessa sequenza, così i test sono ripetibili.
export function creaCasuale(seme) {
  let stato = seme >>> 0;
  return function casuale() {
    stato = (stato + 0x6d2b79f5) >>> 0;
    let t = stato;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function semeCasuale() {
  return Math.floor(Math.random() * 4294967296);
}

// Intero tra 0 (incluso) e massimo (escluso).
export function interoCasuale(casuale, massimo) {
  return Math.floor(casuale() * massimo);
}

// Fisher-Yates su una copia: l'array originale non viene toccato.
export function mescola(casuale, elementi) {
  const copia = [...elementi];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = interoCasuale(casuale, i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
