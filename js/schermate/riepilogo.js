import { formattaQuantita, formattaSecondi } from '../formato.js';
import { tempoMedio, totaleRiprova } from '../partita.js';
import { tabellaParole } from './dom.js';

export function mostraRiepilogo({ tipo, nomeLista, maiuscolo, parole, salvata }) {
  document.getElementById('riepilogo-intestazione').textContent = `${nomeLista} · ${formattaQuantita(parole.length, tipo)}`;
  document.getElementById('riepilogo-tabella').replaceChildren(tabellaParole(tipo, parole, maiuscolo));
  document.getElementById('riepilogo-totali').textContent =
    `Riprova in totale: ${totaleRiprova(parole)} · Tempo medio: ${formattaSecondi(tempoMedio(parole))}`;
  document.getElementById('riepilogo-non-salvata').hidden = salvata;
}
