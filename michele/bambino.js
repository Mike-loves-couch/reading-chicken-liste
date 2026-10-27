import { chiama } from '../js/api.js';
import { etichettaTipo, formattaData, formattaSecondi } from '../js/formato.js';
import { graficoAndamento } from '../js/grafico.js';
import { tempoMedio, totaleRiprova } from '../js/partita.js';
import { partitaDalServer } from '../js/risultati.js';
import { creaRiga, paragrafo, tabellaParole } from '../js/schermate/dom.js';

function tabella(intestazioni, righe) {
  const elemento = document.createElement('table');
  elemento.className = 'tabella';
  const testata = document.createElement('thead');
  testata.append(creaRiga(intestazioni, 'th'));
  const corpo = document.createElement('tbody');
  corpo.append(...righe);
  elemento.append(testata, corpo);
  return elemento;
}

function mostraPartite(partite) {
  const contenitore = document.getElementById('partite-bambino');
  if (partite.length === 0) {
    contenitore.replaceChildren(paragrafo('Nessuna partita ancora.'));
    return;
  }
  const righe = partite.map((partita) => {
    const riga = creaRiga([
      formattaData(partita.data),
      etichettaTipo(partita.tipo),
      partita.lista,
      String(partita.quantita),
      String(totaleRiprova(partita.parole)),
      formattaSecondi(tempoMedio(partita.parole)),
    ]);
    riga.classList.add('cliccabile');
    riga.addEventListener('click', () => {
      const indietro = document.createElement('button');
      indietro.type = 'button';
      indietro.className = 'pulsante secondario piccolo';
      indietro.textContent = "Torna all'elenco";
      indietro.addEventListener('click', () => mostraPartite(partite));
      contenitore.replaceChildren(
        paragrafo(`${formattaData(partita.data)} · ${partita.lista}`, 'intestazione'),
        tabellaParole(partita.tipo, partita.parole, partita.maiuscolo),
        indietro,
      );
    });
    return riga;
  });
  contenitore.replaceChildren(tabella(['Data', 'Tipo', 'Lista', 'Quante', 'Riprova', 'Tempo medio'], righe));
}

// Risultati di un profilo: andamento, parole difficili e partite con il dettaglio parola per parola.
export async function mostraBambino(id) {
  const titolo = document.getElementById('titolo-bambino');
  const messaggio = document.getElementById('messaggio-bambino');
  titolo.textContent = 'Caricamento…';
  messaggio.textContent = '';
  messaggio.classList.remove('avviso');
  try {
    const [statistiche, { partite }] = await Promise.all([
      chiama('GET', `/bambini/${id}/statistiche`),
      chiama('GET', `/bambini/${id}/partite`),
    ]);
    const { bambino, andamento, parole_difficili: difficili } = statistiche;
    titolo.textContent = `${bambino.nome} · ${bambino.famiglia}`;
    document.getElementById('grafico-bambino').replaceChildren(
      andamento.length > 0 ? graficoAndamento(andamento) : paragrafo('Nessuna partita ancora.'),
    );
    document.getElementById('parole-riprova').replaceChildren(difficili.per_riprova.length > 0
      ? tabella(['Parola', 'Letture', 'Riprova', 'Tempo medio'], difficili.per_riprova.map((p) =>
        creaRiga([p.testo, String(p.letture), String(p.riprova), formattaSecondi(p.tempo_medio)])))
      : paragrafo('Nessun Riprova finora.'));
    document.getElementById('parole-lente').replaceChildren(difficili.per_tempo.length > 0
      ? tabella(['Parola', 'Letture', 'Tempo medio'], difficili.per_tempo.map((p) =>
        creaRiga([p.testo, String(p.letture), formattaSecondi(p.tempo_medio)])))
      : paragrafo('Nessun tempo registrato.'));
    mostraPartite(partite.map(partitaDalServer));
  } catch (errore) {
    titolo.textContent = 'Risultati';
    messaggio.textContent = errore.message;
    messaggio.classList.add('avviso');
  }
}
