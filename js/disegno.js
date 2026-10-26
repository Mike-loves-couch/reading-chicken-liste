const DURATA_PASSO_MS = 120;
const DURATA_MANGIA_MS = 300;
const DURATA_RECINTO_MS = 600;
export const DURATA_FESTA_MS = 3000;

// spazio attorno al labirinto, in caselle, perché le siepi del bordo non vengano tagliate
const MARGINE = 0.2;

const COLORI = {
  prato: '#8bc34a',
  sentiero: '#f4e4b0',
  siepeScura: '#2e7d32',
  siepeChiara: '#43a047',
};
const COLORI_CORIANDOLI = ['#e53935', '#fdd835', '#1e88e5', '#8e24aa', '#fb8c00', '#00acc1'];

export function caricaImmagini() {
  const nomi = ['pollo', 'mais', 'recinto', 'pollaio'];
  return Promise.all(nomi.map((nome) => new Promise((risolvi, rifiuta) => {
    const immagine = new Image();
    immagine.onload = () => risolvi([nome, immagine]);
    immagine.onerror = () => rifiuta(new Error(`Immagine non trovata: img/${nome}.svg`));
    immagine.src = `img/${nome}.svg`;
  }))).then(Object.fromEntries);
}

export function creaDisegnatore(canvas, immagini) {
  const ctx = canvas.getContext('2d');
  let partita = null;
  let lato = 0;
  let passo = null; // { da, a, inizio }
  let versoSinistra = false;
  let mangiati = []; // { x, y, inizio }
  let aperturaRecinto = null;
  let coriandoli = [];
  let richiesta = null;

  const px = (valore) => (MARGINE + valore) * lato;
  const centro = (casella) => ({ x: px(casella.x + 0.5), y: px(casella.y + 0.5) });

  function adatta() {
    if (!partita) return;
    const { colonne, righe } = partita.labirinto;
    const area = canvas.parentElement.getBoundingClientRect();
    lato = Math.max(8, Math.floor(Math.min(area.width / (colonne + 2 * MARGINE), area.height / (righe + 2 * MARGINE))));
    const larghezza = (colonne + 2 * MARGINE) * lato;
    const altezza = (righe + 2 * MARGINE) * lato;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(larghezza * dpr);
    canvas.height = Math.round(altezza * dpr);
    canvas.style.width = `${larghezza}px`;
    canvas.style.height = `${altezza}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function disegnaImmagine(immagine, cx, cy, dimensione, specchia = false) {
    ctx.save();
    ctx.translate(cx, cy);
    if (specchia) ctx.scale(-1, 1);
    ctx.drawImage(immagine, -dimensione / 2, -dimensione / 2, dimensione, dimensione);
    ctx.restore();
  }

  function disegnaSiepi() {
    const { colonne, righe, muroDestra, muroSotto } = partita.labirinto;
    const segmenti = [[0, 0, colonne, 0], [0, righe, colonne, righe], [0, 0, 0, righe], [colonne, 0, colonne, righe]];
    for (let y = 0; y < righe; y++) {
      for (let x = 0; x < colonne; x++) {
        if (x < colonne - 1 && muroDestra[y][x]) segmenti.push([x + 1, y, x + 1, y + 1]);
        if (y < righe - 1 && muroSotto[y][x]) segmenti.push([x, y + 1, x + 1, y + 1]);
      }
    }
    ctx.lineCap = 'round';
    for (const [colore, spessore] of [[COLORI.siepeScura, 0.24], [COLORI.siepeChiara, 0.14]]) {
      ctx.strokeStyle = colore;
      ctx.lineWidth = lato * spessore;
      ctx.beginPath();
      for (const [x1, y1, x2, y2] of segmenti) {
        ctx.moveTo(px(x1), px(y1));
        ctx.lineTo(px(x2), px(y2));
      }
      ctx.stroke();
    }
  }

  function disegnaRecinto(ora) {
    const opacita = aperturaRecinto === null ? 1 : 1 - (ora - aperturaRecinto) / DURATA_RECINTO_MS;
    if (opacita <= 0) return;
    const { x, y } = centro(partita.uscita);
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacita);
    disegnaImmagine(immagini.recinto, x, y, lato * 0.95);
    ctx.restore();
  }

  function disegnaChicchi(ora) {
    for (const chicco of partita.chicchi) {
      const { x, y } = centro(chicco);
      const dondolio = Math.sin(ora / 300 + chicco.x + chicco.y) * lato * 0.04;
      disegnaImmagine(immagini.mais, x, y + dondolio, lato * 0.55);
    }
    mangiati = mangiati.filter((m) => ora - m.inizio < DURATA_MANGIA_MS);
    for (const m of mangiati) {
      const t = Math.max(0, (ora - m.inizio) / DURATA_MANGIA_MS);
      const { x, y } = centro(m);
      disegnaImmagine(immagini.mais, x, y, lato * 0.55 * (1 - t));
    }
  }

  function posizionePollo(ora) {
    if (passo) {
      const t = Math.max(0, (ora - passo.inizio) / DURATA_PASSO_MS);
      if (t < 1) {
        const da = centro(passo.da);
        const a = centro(passo.a);
        const saltello = Math.sin(t * Math.PI) * lato * 0.12;
        return { x: da.x + (a.x - da.x) * t, y: da.y + (a.y - da.y) * t - saltello };
      }
      passo = null;
    }
    return centro(partita.pollo);
  }

  function disegnaCoriandoli(ora) {
    for (const c of coriandoli) {
      const secondi = (ora - c.inizio) / 1000;
      ctx.save();
      ctx.translate(c.x + c.vx * secondi, c.y + c.vy * secondi);
      ctx.rotate(c.giro + secondi * 4);
      ctx.fillStyle = c.colore;
      ctx.fillRect(-5, -2.5, 10, 5);
      ctx.restore();
    }
  }

  function frame() {
    if (!partita) return;
    const ora = performance.now();
    const { colonne, righe } = partita.labirinto;
    ctx.fillStyle = COLORI.prato;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORI.sentiero;
    ctx.fillRect(px(0), px(0), colonne * lato, righe * lato);
    disegnaSiepi();
    const uscita = centro(partita.uscita);
    disegnaImmagine(immagini.pollaio, uscita.x, uscita.y, lato * 0.9);
    disegnaRecinto(ora);
    disegnaChicchi(ora);
    const pollo = posizionePollo(ora);
    disegnaImmagine(immagini.pollo, pollo.x, pollo.y, lato * 0.8, versoSinistra);
    disegnaCoriandoli(ora);
    richiesta = requestAnimationFrame(frame);
  }

  return {
    avvia(nuovaPartita) {
      partita = nuovaPartita;
      passo = null;
      versoSinistra = false;
      mangiati = [];
      aperturaRecinto = null;
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
    animaMangia(casella) {
      mangiati.push({ x: casella.x, y: casella.y, inizio: performance.now() });
    },
    apriRecinto() {
      aperturaRecinto = performance.now();
    },
    festa() {
      const inizio = performance.now();
      const larghezza = canvas.clientWidth;
      const altezza = canvas.clientHeight;
      coriandoli = Array.from({ length: 150 }, () => ({
        x: Math.random() * larghezza,
        y: -Math.random() * altezza * 0.5,
        vx: -30 + Math.random() * 60,
        vy: 150 + Math.random() * 250,
        giro: Math.random() * Math.PI,
        colore: COLORI_CORIANDOLI[Math.floor(Math.random() * COLORI_CORIANDOLI.length)],
        inizio,
      }));
      return new Promise((risolvi) => setTimeout(risolvi, DURATA_FESTA_MS));
    },
  };
}
