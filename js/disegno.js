import { chiaveCasella, piastrellaDi, piastrelle } from './mappa.js';

const DURATA_PASSO_MS = 120;
const DURATA_SCONFITTA_MS = 450;
const DURATA_PORTALE_MS = 600;
const FOTOGRAMMA_PORTALE_MS = 250;
export const DURATA_FESTA_MS = 3000;

const LATO_FOGLIO = 16; // pixel di una piastrella nel foglio Kenney
const COLONNE_FOGLIO = 12;
const COLORI = { sfondo: '#181425', bordoLuce: '#c0cbdc', bordoScuro: '#3f2631' };
const COLORI_CORIANDOLI = ['#e84537', '#9b4ca3', '#fee761', '#25956a', '#0099db', '#ffffff'];

const IMMAGINI = {
  foglio: 'img/dungeon/tilemap_packed.png',
  pollo: 'img/sprite/pollo.png',
  portaleChiuso: 'img/sprite/portale-chiuso.png',
  portaleAperto1: 'img/sprite/portale-aperto-1.png',
  portaleAperto2: 'img/sprite/portale-aperto-2.png',
  rubino: 'img/sprite/gemma-rubino.png',
  ametista: 'img/sprite/gemma-ametista.png',
  topazio: 'img/sprite/gemma-topazio.png',
  smeraldo: 'img/sprite/gemma-smeraldo.png',
  zaffiro: 'img/sprite/gemma-zaffiro.png',
};

export function caricaImmagini() {
  return Promise.all(Object.entries(IMMAGINI).map(([nome, percorso]) => new Promise((risolvi, rifiuta) => {
    const immagine = new Image();
    immagine.onload = () => risolvi([nome, immagine]);
    immagine.onerror = () => rifiuta(new Error(`Immagine non trovata: ${percorso}`));
    immagine.src = percorso;
  }))).then(Object.fromEntries);
}

// Si disegna in pixel del dispositivo, così le piastrelle combaciano senza righe
// sottili tra l'una e l'altra anche con lo schermo ingrandito.
export function creaDisegnatore(canvas, immagini) {
  const ctx = canvas.getContext('2d');
  const sfondo = document.createElement('canvas'); // mappa fissa, ridisegnata solo quando cambia la misura
  let partita = null;
  let guardiani = new Map();
  let mappa = [];
  let lato = 0; // pixel del dispositivo per piastrella
  let passo = null; // { da, a, inizio }
  let versoSinistra = false;
  let sconfitti = []; // { x, y, guardiano, inizio }
  let aperturaPortale = null;
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
    let nuovoLato = Math.floor(Math.min((area.width * dpr) / colonne, (area.height * dpr) / righe));
    // pixel art: da 24 px in su si scende al multiplo di 8, così i pixel ingranditi restano regolari
    if (nuovoLato >= 24) nuovoLato -= nuovoLato % 8;
    lato = Math.max(8, nuovoLato);
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
    destinazione.drawImage(immagini.foglio, sx, sy, LATO_FOGLIO, LATO_FOGLIO, x, y, dimensione, dimensione);
  }

  function disegnaSfondo() {
    const c = sfondo.getContext('2d');
    c.imageSmoothingEnabled = false;
    const spessore = Math.max(2, Math.round((lato * 3) / LATO_FOGLIO));
    const linea = Math.max(1, Math.round(lato / LATO_FOGLIO));
    mappa.forEach((riga, y) => riga.forEach(({ indice, bordi }, x) => {
      const px = x * lato;
      const py = y * lato;
      disegnaDalFoglio(c, indice, px, py);
      for (const verso of bordi) {
        const [luce, scuro] = {
          su: [[px, py, lato, spessore], [px, py, lato, linea]],
          sinistra: [[px, py, spessore, lato], [px, py, linea, lato]],
          destra: [[px + lato - spessore, py, spessore, lato], [px + lato - linea, py, linea, lato]],
        }[verso];
        c.fillStyle = COLORI.bordoLuce;
        c.fillRect(...luce);
        c.fillStyle = COLORI.bordoScuro;
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

  function disegnaPortale(ora) {
    const { x, y } = angolo(partita.uscita);
    disegnaImmagine(immagini.portaleChiuso, x, y, lato);
    if (aperturaPortale === null) return;
    const aperto = Math.floor((ora - aperturaPortale) / FOTOGRAMMA_PORTALE_MS) % 2 === 0
      ? immagini.portaleAperto1
      : immagini.portaleAperto2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, (ora - aperturaPortale) / DURATA_PORTALE_MS));
    disegnaImmagine(aperto, x, y, lato);
    ctx.restore();
  }

  // mostro un po' a sinistra, gemma davanti in basso a destra: si vedono tutti e due
  function disegnaGuardiano({ mostro, gemma }, x, y, ondeggio, scalaGemma = 1) {
    disegnaDalFoglio(ctx, mostro, x - Math.round((lato * 3) / 16), y - Math.round((lato * 2) / 16) + ondeggio);
    const dimensione = Math.round(((lato * 10) / 16) * scalaGemma);
    const centroX = x + (lato * 12) / 16;
    const centroY = y + (lato * 11) / 16;
    disegnaImmagine(immagini[gemma], centroX - dimensione / 2, centroY - dimensione / 2, dimensione);
  }

  function disegnaGuardiani(ora) {
    for (const chicco of partita.chicchi) {
      const { x, y } = angolo(chicco);
      const ondeggio = Math.round(Math.sin(ora / 300 + chicco.x + chicco.y) * (lato / 16));
      disegnaGuardiano(guardiani.get(chiaveCasella(chicco)), x, y, ondeggio);
    }
    sconfitti = sconfitti.filter((s) => ora - s.inizio < DURATA_SCONFITTA_MS);
    for (const s of sconfitti) {
      const t = Math.max(0, (ora - s.inizio) / DURATA_SCONFITTA_MS);
      const { x, y } = angolo(s);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      disegnaGuardiano(s.guardiano, x, y - Math.round(t * lato * 0.5), 0, 1 + t * 0.8);
      ctx.restore();
    }
  }

  function posizionePollo(ora) {
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
    ctx.fillStyle = COLORI.sfondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sfondo, 0, 0);
    disegnaPortale(ora);
    disegnaGuardiani(ora);
    const pollo = posizionePollo(ora);
    disegnaImmagine(immagini.pollo, pollo.x, pollo.y, lato, versoSinistra);
    disegnaCoriandoli(ora);
    richiesta = requestAnimationFrame(frame);
  }

  return {
    avvia(nuovaPartita, nuoviGuardiani) {
      partita = nuovaPartita;
      guardiani = nuoviGuardiani;
      mappa = piastrelle(partita.labirinto, Math.random);
      passo = null;
      versoSinistra = false;
      sconfitti = [];
      aperturaPortale = null;
      coriandoli = [];
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
    animaSconfitta(casella) {
      const guardiano = guardiani.get(chiaveCasella(casella));
      if (guardiano) sconfitti.push({ x: casella.x, y: casella.y, guardiano, inizio: performance.now() });
    },
    apriPortale() {
      aperturaPortale = performance.now();
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
        colore: COLORI_CORIANDOLI[Math.floor(Math.random() * COLORI_CORIANDOLI.length)],
        inizio,
      }));
      return new Promise((risolvi) => setTimeout(risolvi, DURATA_FESTA_MS));
    },
  };
}
