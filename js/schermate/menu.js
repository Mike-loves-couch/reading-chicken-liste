import { opzioniQuantita } from '../liste.js';

export function creaMenu({ datiListe, storico, suGioca, suStorico }) {
  const scelte = { tipo: null, lista: null, quantita: null, maiuscolo: storico.leggiMaiuscolo() };
  const elencoListe = document.getElementById('elenco-liste');
  const elencoQuantita = document.getElementById('elenco-quantita');
  const pulsanteGioca = document.getElementById('pulsante-gioca');
  // Firefox ripristina lo stato dei campi dopo un ricaricamento: si riparte sempre da zero
  for (const radio of document.querySelectorAll('input[name="tipo"]')) radio.checked = false;

  function creaScelta({ nome, valore, etichetta, attiva }) {
    const label = document.createElement('label');
    label.className = 'scelta';
    if (!attiva) label.classList.add('disattivata');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = nome;
    input.value = valore;
    input.disabled = !attiva;
    label.append(input, ` ${etichetta}`);
    return { label, input };
  }

  function aggiorna() {
    pulsanteGioca.disabled = !(scelte.tipo && scelte.lista && scelte.quantita);
  }

  function mostraQuantita() {
    if (!scelte.lista) {
      elencoQuantita.replaceChildren(suggerimento('Scegli prima una lista.'));
      return;
    }
    const opzioni = opzioniQuantita(scelte.lista.elementi.length);
    elencoQuantita.replaceChildren();
    for (const opzione of opzioni) {
      const { label, input } = creaScelta({
        nome: 'quantita',
        valore: String(opzione.valore),
        etichetta: opzione.etichetta,
        attiva: opzione.attiva,
      });
      input.addEventListener('change', () => {
        scelte.quantita = opzione.valore;
        aggiorna();
      });
      // con una sola opzione ("Tutte (N)") la scelta è già fatta
      if (opzioni.length === 1) {
        input.checked = true;
        scelte.quantita = opzione.valore;
      }
      elencoQuantita.append(label);
    }
  }

  function mostraListe(liste) {
    elencoListe.replaceChildren();
    for (const lista of liste) {
      const vuota = lista.elementi.length === 0;
      const { label, input } = creaScelta({
        nome: 'lista',
        valore: lista.nome,
        etichetta: vuota ? `${lista.nome} (vuota)` : lista.nome,
        attiva: !vuota,
      });
      input.addEventListener('change', () => {
        scelte.lista = lista;
        scelte.quantita = null;
        mostraQuantita();
        aggiorna();
      });
      elencoListe.append(label);
    }
  }

  function suggerimento(testo) {
    const p = document.createElement('p');
    p.className = 'suggerimento';
    p.textContent = testo;
    return p;
  }

  for (const tipo of ['sillabe', 'parole']) {
    const radio = document.querySelector(`input[name="tipo"][value="${tipo}"]`);
    const dati = datiListe[tipo];
    if (dati.errore) {
      radio.disabled = true;
      radio.closest('.scelta').classList.add('disattivata');
      const avviso = document.getElementById(`errore-${tipo}`);
      avviso.textContent = `Non riesco a caricare ${dati.url}: ${dati.errore}`;
      avviso.hidden = false;
      continue;
    }
    radio.addEventListener('change', () => {
      scelte.tipo = tipo;
      scelte.lista = null;
      scelte.quantita = null;
      mostraListe(dati.liste);
      mostraQuantita();
      aggiorna();
    });
  }

  document.querySelector(`input[name="maiuscolo"][value="${scelte.maiuscolo ? 'si' : 'no'}"]`).checked = true;
  for (const radio of document.querySelectorAll('input[name="maiuscolo"]')) {
    radio.addEventListener('change', () => {
      scelte.maiuscolo = radio.value === 'si';
      storico.salvaMaiuscolo(scelte.maiuscolo);
    });
  }

  pulsanteGioca.addEventListener('click', (evento) => {
    evento.currentTarget.blur();
    suGioca({ ...scelte });
  });
  document.getElementById('pulsante-storico').addEventListener('click', suStorico);
  aggiorna();
}
