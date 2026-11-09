// L'abilità in ogni lista, ricavata dalle partite già giocate: quante parole diverse della lista
// sono state lette e con che velocità (tempo mediano delle ultime letture). Serve alle barre del menu.

// Una lista è "piena" quando se ne sono lette 100 parole diverse (meno, se la lista è più corta).
export const SOGLIA_PAROLE = 100;
// La velocità è la mediana delle ultime letture: segue i progressi senza contare le prime partite.
export const ULTIME_LETTURE = 30;
// [veloce, lento] in secondi per parola, per numero di sillabe: sotto il primo valore il colore è quello
// "veloce", sopra il secondo quello "lento". Sono valori provvisori, da tarare sui bambini.
export const SOGLIE_VELOCITA = {
  Bisillabe: [2, 6],
  Trisillabe: [2.5, 7.5],
  Quadrisillabe: [3, 9],
  Pentasillabe: [3.5, 10],
};
export const SOGLIE_PREDEFINITE = [1.5, 5];

export const chiaveGruppo = (gruppo) => `gruppo:${gruppo}`;

export function mediana(valori) {
  if (valori.length === 0) return null;
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 === 1 ? ordinati[meta] : (ordinati[meta - 1] + ordinati[meta]) / 2;
}

// Da ogni parola (minuscola) i nomi delle liste che la contengono.
export function indicePerParola(liste) {
  const indice = new Map();
  for (const lista of liste) {
    for (const voce of lista.elementi) {
      const chiave = voce.toLocaleLowerCase('it-IT');
      if (!indice.has(chiave)) indice.set(chiave, []);
      indice.get(chiave).push(lista.nome);
    }
  }
  return indice;
}

// Mappa: nome della lista (e chiaveGruppo(gruppo) per i gruppi) -> { paroleDiverse, mediana, bersaglio }.
// Contano le partite del tipo dato (sillabe o parole). La categoria di una parola si ricava dal suo testo.
export function calcolaAbilita(partite, liste, tipo, { ultime = ULTIME_LETTURE, soglia = SOGLIA_PAROLE } = {}) {
  const ordinate = partite.filter((partita) => partita.tipo === tipo).sort((a, b) => a.data.localeCompare(b.data));
  const indice = indicePerParola(liste);
  const gruppoDi = new Map(liste.map((lista) => [lista.nome, lista.gruppo]));
  const accumulo = new Map();
  const prendi = (chiave) => {
    if (!accumulo.has(chiave)) accumulo.set(chiave, { viste: new Set(), tempi: [] });
    return accumulo.get(chiave);
  };
  for (const partita of ordinate) {
    for (const parola of partita.parole) {
      const minuscola = String(parola.testo).toLocaleLowerCase('it-IT');
      const nomi = indice.get(minuscola);
      if (!nomi) continue;
      const chiavi = new Set();
      for (const nome of nomi) {
        chiavi.add(nome);
        if (gruppoDi.get(nome)) chiavi.add(chiaveGruppo(gruppoDi.get(nome)));
      }
      for (const chiave of chiavi) {
        const voce = prendi(chiave);
        voce.viste.add(minuscola);
        if (Number.isFinite(parola.secondi)) voce.tempi.push(parola.secondi);
      }
    }
  }
  const bersagli = new Map();
  for (const lista of liste) {
    const bersaglio = Math.min(soglia, lista.elementi.length);
    bersagli.set(lista.nome, bersaglio);
    if (lista.gruppo) bersagli.set(chiaveGruppo(lista.gruppo), (bersagli.get(chiaveGruppo(lista.gruppo)) ?? 0) + bersaglio);
  }
  const risultato = new Map();
  for (const [chiave, bersaglio] of bersagli) {
    const voce = accumulo.get(chiave);
    risultato.set(chiave, {
      paroleDiverse: voce ? voce.viste.size : 0,
      mediana: voce ? mediana(voce.tempi.slice(-ultime)) : null,
      bersaglio,
    });
  }
  return risultato;
}

// Quanto è piena la barra, da 0 a 1.
export function quotaParole({ paroleDiverse, bersaglio }) {
  return bersaglio > 0 ? Math.min(1, paroleDiverse / bersaglio) : 0;
}

// Il colore va dal verde-azzurro (veloce) all'arancione (lento), passando per le sfumature in mezzo.
// Senza tempi misurati non c'è colore (null).
export function coloreVelocita(secondi, gruppo) {
  if (!Number.isFinite(secondi)) return null;
  const [veloce, lento] = SOGLIE_VELOCITA[gruppo] ?? SOGLIE_PREDEFINITE;
  const t = Math.min(1, Math.max(0, (secondi - veloce) / (lento - veloce)));
  return `hsl(${Math.round(175 - 140 * t)} 62% 40%)`;
}
