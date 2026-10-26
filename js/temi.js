// Ogni mondo descrive solo la grafica: piastrelle, eroe, guardiani, oggetti da raccogliere,
// uscita e colori. Le regole del gioco sono le stesse per tutti.
//
// Piastrelle: ogni voce è un elenco di strati, dal basso verso l'alto; ogni strato è un elenco
// di indici del foglio tra cui se ne sceglie uno a caso (ripetere un indice lo rende più frequente).
// I fogli sono griglie di piastrelle da 16 px, 12 per riga.

export const TEMA_PREDEFINITO = 'fattoria';

export const TEMI = {
  fattoria: {
    nome: 'fattoria',
    etichetta: 'Fattoria',
    foglio: 'img/fattoria/tilemap_packed.png',
    piastrelle: {
      // erba con sopra un cespuglio o un albero; sentiero di terra, ogni tanto con sassi o ciuffi
      muroCima: [[0, 0, 0, 1, 2], [5, 5, 5, 4, 16]],
      muroFronte: [[0, 0, 0, 1, 2], [5, 5, 5, 4, 16]],
      pavimento: [[40, 40, 40, 40, 40, 39, 41, 42]],
      pavimentoOmbra: [[40, 40, 40, 40, 40, 39, 41, 42]],
      bordi: null,
    },
    eroe: 'img/sprite/pollo.png',
    guardiani: [],
    oggetti: ['img/sprite/mais.png'],
    uscita: { base: 'img/sprite/pollaio.png', chiusa: 81, aperta: [] },
    sfondo: '#63c74d',
    coriandoli: ['#e84537', '#feae34', '#fee761', '#63c74d', '#0099db', '#ffffff'],
    icone: { mascotte: 'img/sprite/pollo.png', contatore: 'img/sprite/mais.png' },
  },
  dungeon: {
    nome: 'dungeon',
    etichetta: 'Dungeon',
    foglio: 'img/dungeon/tilemap_packed.png',
    piastrelle: {
      muroCima: [[0]],
      muroFronte: [[40]],
      pavimento: [[48, 48, 48, 48, 48, 48, 49]],
      pavimentoOmbra: [[50]],
      bordi: { luce: '#c0cbdc', scuro: '#3f2631' },
    },
    eroe: 'img/sprite/pollo.png',
    guardiani: [108, 120, 121, 122], // slime, pipistrello, fantasmino, ragno
    oggetti: [
      'img/sprite/gemma-rubino.png',
      'img/sprite/gemma-ametista.png',
      'img/sprite/gemma-topazio.png',
      'img/sprite/gemma-smeraldo.png',
      'img/sprite/gemma-zaffiro.png',
    ],
    uscita: {
      base: 'img/sprite/portale-chiuso.png',
      chiusa: null,
      aperta: ['img/sprite/portale-aperto-1.png', 'img/sprite/portale-aperto-2.png'],
    },
    sfondo: '#181425',
    coriandoli: ['#e84537', '#9b4ca3', '#fee761', '#25956a', '#0099db', '#ffffff'],
    icone: { mascotte: 'img/sprite/pollo.png', contatore: 'img/sprite/gemma-zaffiro.png' },
  },
  spazio: {
    nome: 'spazio',
    etichetta: 'Spazio',
    foglio: 'img/spazio/foglio.png',
    piastrelle: {
      // muri: finestre sulle stelle; pavimento: lamiera della stazione, ogni tanto una grata
      muroCima: [[0, 1, 2, 11]],
      muroFronte: [[3]],
      pavimento: [[4, 4, 4, 4, 5]],
      pavimentoOmbra: [[6]],
      bordi: { luce: '#75e3ff', scuro: '#0099db' },
    },
    eroe: 'img/sprite/pollo-astronauta.png',
    guardiani: [7, 8, 9, 10], // alieno verde, alieno viola, polpo, robot
    oggetti: ['img/sprite/stella.png'],
    uscita: {
      base: 'img/sprite/razzo-spento.png',
      chiusa: null,
      aperta: ['img/sprite/razzo-acceso-1.png', 'img/sprite/razzo-acceso-2.png'],
    },
    sfondo: '#181425',
    coriandoli: ['#75e3ff', '#d176d0', '#fee761', '#43e1b3', '#ffffff', '#ff706d'],
    icone: { mascotte: 'img/sprite/pollo-astronauta.png', contatore: 'img/sprite/stella.png' },
  },
};

export function temaDa(nome) {
  return Object.hasOwn(TEMI, nome ?? '') ? TEMI[nome] : TEMI[TEMA_PREDEFINITO];
}

// Tutte le immagini di tutti i mondi, senza doppioni: si caricano una volta all'avvio.
export function immaginiDeiTemi() {
  const percorsi = new Set();
  for (const tema of Object.values(TEMI)) {
    percorsi.add(tema.foglio);
    percorsi.add(tema.eroe);
    percorsi.add(tema.uscita.base);
    for (const percorso of [...tema.oggetti, ...tema.uscita.aperta, ...Object.values(tema.icone)]) percorsi.add(percorso);
  }
  return [...percorsi];
}
