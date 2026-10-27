import { chiaveCasella, piastrellaDi, piastrelle } from './mappa.js';

const DURATA_PASSO_MS = 120;
const DURATA_PRESA_MS = 450;
const DURATA_USCITA_MS = 600;
const FOTOGRAMMA_USCITA_MS = 250;
export const DURATA_FESTA_MS = 3000;

const LATO_FOGLIO = 16; // pixel di una piastrella nei fogli
const COLONNE_FOGLIO = 12;
// personaggi un po' più grandi della piastrella, appoggiati sul fondo: in vista a tre quarti
// la testa sporge sul muro dietro
const SCALA_PERSONAGGI = 1.25;

export function caricaImmagini(percorsi) {
  return Promise.all(percorsi.map((percorso) => new Promise((risolvi, rifiuta) => {
    const immagine = new Image();
    immagine.onload = () => risolvi([percorso, immagine]);
    immagine.onerror = () => rifiuta(new Error(`Immagine non trovata: ${percorso}`));
    immagine.src = percorso;
  }))).then(Object.fromEntries);
}

// Lato della piastrella in pixel del dispositivo. Da 32 px in su si scende al multiplo di 16
// (ogni pixel dello sprite diventa un quadrato intero) solo se si perde al massimo un ottavo.
export function latoPiastrella(massimo) {
  const lato = Math.max(8, Math.floor(massimo));
  const multiplo = lato - (lato % LATO_FOGLIO);
  return lato >= 32 && (lato - multiplo) * 8 <= lato ? multiplo : lato;
}

// Si disegna in pixel del dispositivo, così le piastrelle combaciano senza righe sottili;
// il CSS del canvas usa image-rendering: pixelated per non sfumare quando il canvas cade
// a metà di un pixel (schermo ingrandito al 125%).
export function creaDisegnatore(canvas, immagini) {
  const ctx = canvas.getContext('2d');
  const sfondo = document.createElement('canvas'); // mappa fissa, ridisegnata solo quando cambia la misura
  let tema = null;
  let partita = null;
  let guardiani = new Map();
  let mappa = [];
  let lato = 0;
  let passo = null; // { da, a, inizio }
  let versoSinistra = false;
  let presi = []; // { x, y, guardiano, inizio }
  let aperturaUscita = null;
  let coriandoli = [];
  let richiesta = null;

  const angolo = (casella) => {
    const p = piastrellaDi(casella);
    return { x: p.x * lato, y: p.y * lato };
  };

  function adatta() {
    if (!partita) return;
    const dpr = window.devicePixelRatio || 1;
    const area = canvas.parentElement.getBoundingClientRect();
    const colonne = mappa[0].length;
    const righe = mappa.length;
    lato = latoPiastrella(Math.min((area.width * dpr) / colonne, (area.height * dpr) / righe));
    for (const tela of [canvas, sfondo]) {
      tela.width = colonne * lato;
      tela.height = righe * lato;
    }
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    disegnaSfondo();
  }

  function disegnaDalFoglio(destinazione, indice, x, y, dimensione = lato) {
    const sx = (indice % COLONNE_FOGLIO) * LATO_FOGLIO;
    const sy = Math.floor(indice / COLONNE_FOGLIO) * LATO_FOGLIO;
    destinazione.drawImage(immagini[tema.foglio], sx, sy, LATO_FOGLIO, LATO_FOGLIO, x, y, dimensione, dimensione);
  }

  function disegnaSfondo() {
    const c = sfondo.getContext('2d');
    c.imageSmoothingEnabled = false;
    const spessore = Math.max(2, Math.round((lato * 3) / LATO_FOGLIO));
    const linea = Math.max(1, Math.round(lato / LATO_FOGLIO));
    mappa.forEach((riga, y) => riga.forEach(({ strati, bordi }, x) => {
      const px = x * lato;
      const py = y * lato;
      for (const indice of strati) disegnaDalFoglio(c, indice, px, py);
      for (const verso of bordi) {
        const [luce, scuro] = {
          su: [[px, py, lato, spessore], [px, py, lato, linea]],
          sinistra: [[px, py, spessore, lato], [px, py, linea, lato]],
          destra: [[px + lato - spessore, py, spessore, lato], [px + lato - linea, py, linea, lato]],
        }[verso];
        c.fillStyle = tema.piastrelle.bordi.luce;
        c.fillRect(...luce);
        c.fillStyle = tema.piastrelle.bordi.scuro;
        c.fillRect(...scuro);
      }
    }));
  }

  function disegnaImmagine(immagine, x, y, dimensione, specchia = false) {
    ctx.save();
    ctx.translate(x + dimensione / 2, y + dimensione / 2);
    if (specchia) ctx.scale(-1, 1);
    ctx.drawImage(immagine, -dimensione / 2, -dimensione / 2, dimensione, dimensione);
    ctx.restore();
  }

  // un personaggio (eroe, guardiano, uscita) sulla piastrella con angolo (x, y):
  // centrato in orizzontale, appoggiato sul fondo
  function posizionePersonaggio(x, y) {
    const dimensione = Math.round(lato * SCALA_PERSONAGGI);
    return { x: x + Math.round((lato - dimensione) / 2), y: y + lato - dimensione, dimensione };
  }

  function disegnaUscita(ora) {
    const p = posizionePersonaggio(angolo(partita.uscita).x, angolo(partita.uscita).y);
    disegnaImmagine(immagini[tema.uscita.base], p.x, p.y, p.dimensione);
    const t = aperturaUscita === null ? 0 : Math.min(1, Math.max(0, (ora - aperturaUscita) / DURATA_USCITA_MS));
    if (tema.uscita.chiusa !== null && t < 1) {
      // il coperchio (lo steccato) copre solo la parte bassa: il tetto del pollaio si vede
      const dimensione = Math.round(p.dimensione * 0.8);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      disegnaDalFoglio(ctx, tema.uscita.chiusa, p.x + (p.dimensione - dimensione) / 2, p.y + p.dimensione - dimensione * 0.85, dimensione);
      ctx.restore();
    }
    if (tema.uscita.aperta.length > 0 && t > 0) {
      const fotogramma = Math.floor((ora - aperturaUscita) / FOTOGRAMMA_USCITA_MS) % tema.uscita.aperta.length;
      ctx.save();
      ctx.globalAlpha = t;
      disegnaImmagine(immagini[tema.uscita.aperta[fotogramma]], p.x, p.y, p.dimensione);
      ctx.restore();
    }
  }

  // Con un guardiano: il mostro un po' a sinistra e l'oggetto davanti in basso a destra,
  // così si vedono tutti e due. Senza guardiano: l'oggetto da solo, al centro.
  function disegnaGuardiano({ mostro, oggetto }, x, y, ondeggio, scalaOggetto = 1) {
    if (mostro === null) {
      const dimensione = Math.round(lato * 0.9 * scalaOggetto);
      disegnaImmagine(immagini[oggetto], x + (lato - dimensione) / 2, y + (lato - dimensione) / 2 + ondeggio, dimensione);
      return;
    }
    const p = posizionePersonaggio(x, y);
    disegnaDalFoglio(ctx, mostro, p.x - Math.round(lato * 0.18), p.y + ondeggio, p.dimensione);
    const dimensione = Math.round(lato * 0.65 * scalaOggetto);
    disegnaImmagine(immagini[oggetto], x + lato * 0.72 - dimensione / 2, y + lato * 0.68 - dimensione / 2, dimensione);
  }

  function disegnaGuardiani(ora) {
    for (const chicco of partita.chicchi) {
      const { x, y } = angolo(chicco);
      const ondeggio = Math.round(Math.sin(ora / 300 + chicco.x + chicco.y) * (lato / 16));
      disegnaGuardiano(guardiani.get(chiaveCasella(chicco)), x, y, ondeggio);
    }
    presi = presi.filter((p) => ora - p.inizio < DURATA_PRESA_MS);
    for (const p of presi) {
      const t = Math.max(0, (ora - p.inizio) / DURATA_PRESA_MS);
      const { x, y } = angolo(p);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      disegnaGuardiano(p.guardiano, x, y - Math.round(t * lato * 0.5), 0, 1 + t * 0.8);
      ctx.restore();
    }
  }

  function angoloEroe(ora) {
    if (passo) {
      const t = Math.max(0, (ora - passo.inizio) / DURATA_PASSO_MS);
      if (t < 1) {
        const da = angolo(passo.da);
        const a = angolo(passo.a);
        const saltello = Math.sin(t * Math.PI) * lato * 0.2;
        return { x: da.x + (a.x - da.x) * t, y: da.y + (a.y - da.y) * t - saltello };
      }
      passo = null;
    }
    return angolo(partita.pollo);
  }

  function disegnaCoriandoli(ora) {
    for (const c of coriandoli) {
      const secondi = (ora - c.inizio) / 1000;
      ctx.save();
      ctx.translate(c.x + c.vx * secondi, c.y + c.vy * secondi);
      ctx.rotate(c.giro + secondi * 4);
      ctx.fillStyle = c.colore;
      ctx.fillRect(-c.lato / 2, -c.lato / 4, c.lato, c.lato / 2);
      ctx.restore();
    }
  }

  function frame() {
    if (!partita) return;
    const ora = performance.now();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sfondo, 0, 0);
    disegnaUscita(ora);
    disegnaGuardiani(ora);
    const eroe = angoloEroe(ora);
    const p = posizionePersonaggio(eroe.x, eroe.y);
    disegnaImmagine(immagini[tema.eroe], p.x, p.y, p.dimensione, versoSinistra);
    disegnaCoriandoli(ora);
    richiesta = requestAnimationFrame(frame);
  }

  return {
    avvia(nuovoTema, nuovaPartita, nuoviGuardiani, casuale) {
      tema = nuovoTema;
      partita = nuovaPartita;
      guardiani = nuoviGuardiani;
      mappa = piastrelle(partita.labirinto, casuale, tema.piastrelle);
      passo = null;
      versoSinistra = false;
      presi = [];
      aperturaUscita = null;
      coriandoli = [];
      canvas.style.background = tema.sfondo;
      adatta();
      cancelAnimationFrame(richiesta);
      richiesta = requestAnimationFrame(frame);
    },
    ferma() {
      cancelAnimationFrame(richiesta);
      richiesta = null;
      partita = null;
    },
    adatta,
    animaPasso(da, a) {
      if (a.x !== da.x) versoSinistra = a.x < da.x;
      passo = { da, a, inizio: performance.now() };
    },
    animaPresa(casella) {
      const guardiano = guardiani.get(chiaveCasella(casella));
      if (guardiano) presi.push({ x: casella.x, y: casella.y, guardiano, inizio: performance.now() });
    },
    apriUscita() {
      aperturaUscita = performance.now();
    },
    festa() {
      const inizio = performance.now();
      coriandoli = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * lato * 2,
        vy: canvas.height * (0.3 + Math.random() * 0.4),
        giro: Math.random() * Math.PI,
        lato: lato * 0.45,
        colore: tema.coriandoli[Math.floor(Math.random() * tema.coriandoli.length)],
        inizio,
      }));
      return new Promise((risolvi) => setTimeout(risolvi, DURATA_FESTA_MS));
    },
  };
}
