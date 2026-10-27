import { formattaQuantita, formattaSecondi } from '../formato.js';
import { tempoMedio, totaleRiprova } from '../partita.js';
import { tabellaParole } from './dom.js';

export function mostraRiepilogo({ tipo, nomeLista, maiuscolo, parole, salvata }) {
  document.getElementById('riepilogo-intestazione').textContent = `${nomeLista} · ${formattaQuantita(parole.length, tipo)}`;
  document.getElementById('riepilogo-tabella').replaceChildren(tabellaParole(tipo, parole, maiuscolo));
  document.getElementById('riepilogo-totali').textContent =
    `Riprova in totale: ${totaleRiprova(parole)} · Tempo medio: ${formattaSecondi(tempoMedio(parole))}`;
  document.getElementById('riepilogo-non-salvata').hidden = salvata;
  document.getElementById('riepilogo-invio').hidden = true;
}

// rimaste: partite ancora da inviare dopo l'ultimo tentativo (0 = arrivato tutto)
export function mostraInvio(nome, rimaste) {
  const riga = document.getElementById('riepilogo-invio');
  riga.textContent = rimaste === 0
    ? `Risultato di ${nome} inviato.`
    : `Risultato di ${nome} non ancora inviato: partirà appena c'è la connessione.`;
  riga.classList.toggle('avviso', rimaste !== 0);
  riga.hidden = false;
}
