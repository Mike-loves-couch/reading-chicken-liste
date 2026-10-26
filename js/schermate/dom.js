import { formatta } from '../liste.js';

export function creaRiga(celle, tag = 'td') {
  const riga = document.createElement('tr');
  for (const testo of celle) {
    const cella = document.createElement(tag);
    cella.textContent = testo;
    riga.append(cella);
  }
  return riga;
}

export function paragrafo(testo, classe) {
  const p = document.createElement('p');
  p.textContent = testo;
  if (classe) p.className = classe;
  return p;
}

export function tabellaParole(tipo, parole, maiuscolo) {
  const tabella = document.createElement('table');
  tabella.className = 'tabella';
  const testata = document.createElement('thead');
  testata.append(creaRiga([tipo === 'sillabe' ? 'Sillaba' : 'Parola', 'Riprova'], 'th'));
  const corpo = document.createElement('tbody');
  for (const parola of parole) corpo.append(creaRiga([formatta(parola.testo, maiuscolo), String(parola.riprova)]));
  tabella.append(testata, corpo);
  return tabella;
}
