// Effetti sonori dai pacchetti audio di Kenney (CC0). Ogni momento del gioco ha uno o più file:
// se sono più d'uno se ne sceglie uno a caso, così i passi non suonano tutti uguali.
// pausaMs: tempo minimo tra due suoni uguali (tenendo premuta una freccia contro un muro
// il pollo ci sbatte ogni 150 ms).
export const SUONI = {
  passo: { file: ['audio/passo-1.wav', 'audio/passo-2.wav', 'audio/passo-3.wav'], volume: 0.3 },
  muro: { file: ['audio/muro-1.wav', 'audio/muro-2.wav', 'audio/muro-3.wav'], volume: 0.25, pausaMs: 450 },
  parola: { file: ['audio/parola.wav'], volume: 1 },
  corretta: { file: ['audio/corretta.wav'], volume: 0.6 },
  riprova: { file: ['audio/riprova.wav'], volume: 0.5 },
  uscita: { file: ['audio/uscita.wav'], volume: 0.6 },
  festa: { file: ['audio/festa.wav'], volume: 0.6 },
};

export function fileDeiSuoni() {
  return [...new Set(Object.values(SUONI).flatMap((suono) => suono.file))];
}

async function scaricaFile(percorso) {
  const risposta = await fetch(percorso);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
  return risposta.arrayBuffer();
}

// I file si scaricano subito ma si decodificano al primo clic o tasto: i browser fanno partire
// l'audio solo dopo un gesto di chi usa la pagina. Un file che manca lascia muto solo il suo momento.
export function creaSuoni({
  attivi = true,
  Contesto = globalThis.AudioContext,
  scarica = scaricaFile,
  adesso = () => performance.now(),
} = {}) {
  const avvisa = (percorso) => () => console.warn(`Suono non disponibile: ${percorso}`);
  const scaricati = fileDeiSuoni().map((percorso) => [percorso, scarica(percorso).catch(avvisa(percorso))]);
  const decodificati = new Map();
  const ultimaVolta = new Map();
  let contesto = null;

  return {
    // da chiamare dentro un clic o un tasto: crea l'audio la prima volta, poi lo riattiva se sospeso
    sblocca() {
      if (!Contesto) return;
      if (!contesto) {
        contesto = new Contesto();
        for (const [percorso, byte] of scaricati) {
          byte
            .then((dati) => dati && contesto.decodeAudioData(dati))
            .then((audio) => audio && decodificati.set(percorso, audio))
            .catch(avvisa(percorso));
        }
      }
      if (contesto.state === 'suspended') contesto.resume();
    },
    suona(nome) {
      const { file, volume, pausaMs = 0 } = SUONI[nome];
      const ora = adesso();
      if (!attivi || !contesto || ora - (ultimaVolta.get(nome) ?? -Infinity) < pausaMs) return;
      const audio = decodificati.get(file[Math.floor(Math.random() * file.length)]);
      if (!audio) return;
      ultimaVolta.set(nome, ora);
      const sorgente = contesto.createBufferSource();
      sorgente.buffer = audio;
      const guadagno = contesto.createGain();
      guadagno.gain.value = volume;
      sorgente.connect(guadagno).connect(contesto.destination);
      sorgente.start();
    },
    impostaAttivi(valore) {
      attivi = valore;
    },
  };
}
