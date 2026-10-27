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

// esito: 'inviato', 'in-attesa' (partirà appena c'è la connessione) o 'rifiutato' (il server non la accetta)
export function mostraInvio(nome, esito) {
  const riga = document.getElementById('riepilogo-invio');
  riga.textContent = {
    inviato: `Risultato di ${nome} inviato.`,
    'in-attesa': `Risultato di ${nome} non ancora inviato: partirà appena c'è la connessione.`,
    rifiutato: `Il server non ha accettato il risultato di ${nome}: resta solo nello storico di questo computer.`,
  }[esito];
  riga.classList.toggle('avviso', esito !== 'inviato');
  riga.hidden = false;
}
