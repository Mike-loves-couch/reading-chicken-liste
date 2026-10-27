import { formattaSecondi } from './formato.js';

// Andamento di un profilo: una colonna per partita con i Riprova e una linea con il tempo medio
// per parola. SVG disegnato a mano, senza librerie; i colori vengono dal CSS.
const LARGHEZZA = 640;
const ALTEZZA = 240;
const MARGINE = { sopra: 24, sotto: 36, lati: 48 };
const SVG = 'http://www.w3.org/2000/svg';

// Posizioni nel disegno: x di ogni partita, y del tempo (null se manca), altezza della colonna.
export function puntiAndamento(andamento, larghezza = LARGHEZZA, altezza = ALTEZZA) {
  const area = {
    x: MARGINE.lati,
    y: MARGINE.sopra,
    larghezza: larghezza - 2 * MARGINE.lati,
    altezza: altezza - MARGINE.sopra - MARGINE.sotto,
  };
  const massimoTempo = Math.max(0, ...andamento.map((p) => p.tempo_medio ?? 0));
  const massimoRiprova = Math.max(0, ...andamento.map((p) => p.riprova));
  const passo = andamento.length > 1 ? area.larghezza / (andamento.length - 1) : 0;
  return {
    massimoTempo,
    massimoRiprova,
    punti: andamento.map((partita, indice) => ({
      x: andamento.length > 1 ? area.x + indice * passo : area.x + area.larghezza / 2,
      yTempo: partita.tempo_medio === null || massimoTempo === 0
        ? null
        : area.y + area.altezza * (1 - partita.tempo_medio / massimoTempo),
      altezzaRiprova: massimoRiprova === 0 ? 0 : (area.altezza * partita.riprova) / massimoRiprova,
      fondo: area.y + area.altezza,
      partita,
    })),
  };
}

function nodo(tag, attributi = {}, descrizione = null) {
  const elemento = document.createElementNS(SVG, tag);
  for (const [nome, valore] of Object.entries(attributi)) elemento.setAttribute(nome, String(valore));
  if (descrizione) {
    const titolo = document.createElementNS(SVG, 'title');
    titolo.textContent = descrizione;
    elemento.append(titolo);
  }
  return elemento;
}

function testo(contenuto, x, y, ancora) {
  const elemento = nodo('text', { x, y, 'text-anchor': ancora });
  elemento.textContent = contenuto;
  return elemento;
}

const giorno = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

export function graficoAndamento(andamento) {
  const { punti, massimoTempo, massimoRiprova } = puntiAndamento(andamento);
  const fondo = ALTEZZA - MARGINE.sotto;
  const svg = nodo('svg', {
    viewBox: `0 0 ${LARGHEZZA} ${ALTEZZA}`,
    class: 'grafico',
    role: 'img',
    'aria-label': `Andamento di ${andamento.length} partite`,
  });
  svg.append(nodo('line', { x1: MARGINE.lati, y1: fondo, x2: LARGHEZZA - MARGINE.lati, y2: fondo, class: 'asse' }));
  const larghezzaColonna = Math.min(24, punti.length > 1 ? (punti[1].x - punti[0].x) * 0.6 : 24);
  const descrizione = ({ partita }) =>
    `${giorno(partita.giocata_il)}: tempo medio ${formattaSecondi(partita.tempo_medio)}, Riprova ${partita.riprova}`;
  let tratto = '';
  let continua = false;
  for (const punto of punti) {
    svg.append(nodo('rect', {
      x: punto.x - larghezzaColonna / 2,
      y: punto.fondo - punto.altezzaRiprova,
      width: larghezzaColonna,
      height: punto.altezzaRiprova,
      class: 'colonna-riprova',
    }, descrizione(punto)));
    // una partita senza tempo interrompe la linea
    if (punto.yTempo === null) {
      continua = false;
      continue;
    }
    tratto += `${continua ? 'L' : 'M'}${punto.x} ${punto.yTempo} `;
    continua = true;
  }
  svg.append(nodo('path', { d: tratto.trim(), class: 'linea-tempo' }));
  for (const punto of punti.filter((p) => p.yTempo !== null)) {
    svg.append(nodo('circle', { cx: punto.x, cy: punto.yTempo, r: 5, class: 'punto-tempo' }, descrizione(punto)));
  }
  if (punti.length > 0) {
    svg.append(
      testo(formattaSecondi(massimoTempo), 4, MARGINE.sopra - 8, 'start'),
      testo(`${massimoRiprova} Riprova`, LARGHEZZA - 4, MARGINE.sopra - 8, 'end'),
      testo(giorno(punti[0].partita.giocata_il), punti[0].x, fondo + 22, 'middle'),
    );
  }
  if (punti.length > 1) svg.append(testo(giorno(punti.at(-1).partita.giocata_il), punti.at(-1).x, fondo + 22, 'middle'));
  return svg;
}
