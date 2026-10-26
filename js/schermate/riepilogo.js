import { formattaDurata, formattaQuantita } from '../formato.js';
import { totaleRiprova } from '../partita.js';
import { tabellaParole } from './dom.js';

export function mostraRiepilogo({ tipo, nomeLista, maiuscolo, durataSecondi, parole, salvata }) {
  document.getElementById('riepilogo-intestazione').textContent = `${nomeLista} · ${formattaQuantita(parole.length, tipo)}`;
  document.getElementById('riepilogo-tabella').replaceChildren(tabellaParole(tipo, parole, maiuscolo));
  document.getElementById('riepilogo-totali').textContent =
    `Riprova in totale: ${totaleRiprova(parole)} · Durata: ${formattaDurata(durataSecondi)}`;
  document.getElementById('riepilogo-non-salvata').hidden = salvata;
}
