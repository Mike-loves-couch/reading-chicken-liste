import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creaCasuale } from '../js/casuale.js';
import { bilancioDelleListe, caricaTutto, elementiDelleListe, ripartisci, senzaNumero, filtraDoppie, filtraFrequenze, filtraGruppi, nomeDelleListe, unisciListe, formatta, gruppiPresenti, haDigramma, haTrigramma, normalizzaListe, opzioniQuantita, pescaParole, pulisci } from '../js/liste.js';

function leggiJson(percorso) {
  return JSON.parse(readFileSync(new URL(percorso, import.meta.url), 'utf8'));
}

function creaFetchFinto(risposte) {
  return async (url) => {
    const risposta = risposte[url];
    return {
      ok: risposta.ok ?? true,
      status: risposta.status ?? 200,
      json: async () => {
        if (risposta.json instanceof Error) throw risposta.json;
        return risposta.json;
      },
    };
  };
}

test("formato sillabe: le liste sono le chiavi dell'oggetto", () => {
  assert.deepEqual(normalizzaListe({ '01 - Vocali': ['A', 'E'], '02 - CV': ['PA'] }), [
    { nome: '01 - Vocali', elementi: ['A', 'E'] },
    { nome: '02 - CV', elementi: ['PA'] },
  ]);
});

test('formato parole: le liste stanno sotto "liste"', () => {
  const dati = { versione: 'prova-1', stato: 'bozza', nota: 'x', liste: { '01 - Facili': ['ala', 'ape'] } };
  assert.deepEqual(normalizzaListe(dati), [{ nome: '01 - Facili', elementi: ['ala', 'ape'] }]);
});

test('le chiavi che non contengono liste vengono ignorate', () => {
  assert.deepEqual(normalizzaListe({ versione: 'x', '01 - A': ['A'] }), [{ nome: '01 - A', elementi: ['A'] }]);
});

test('un formato non valido lancia un errore', () => {
  assert.throws(() => normalizzaListe(null), /Formato liste non valido/);
  assert.throws(() => normalizzaListe(['A']), /Formato liste non valido/);
});

test('pulisci toglie spazi, vuoti, non-stringhe e doppioni ignorando maiuscole', () => {
  assert.deepEqual(pulisci([' pane ', '', '   ', 3, null, 'UFO', 'ufo', 'pane', 'sole']), ['pane', 'UFO', 'sole']);
});

test('opzioniQuantita: lista vuota non offre niente', () => {
  assert.deepEqual(opzioniQuantita(0), []);
});

test('opzioniQuantita: 2 elementi offrono solo "Tutte (2)"', () => {
  assert.deepEqual(opzioniQuantita(2), [{ valore: 2, etichetta: 'Tutte (2)', attiva: true }]);
});

test('opzioniQuantita: 5 elementi attivano solo il 5', () => {
  assert.deepEqual(opzioniQuantita(5).map((o) => [o.valore, o.attiva]), [[5, true], [10, false], [20, false], [50, false]]);
});

test('opzioniQuantita: 14 elementi attivano 5 e 10', () => {
  assert.deepEqual(opzioniQuantita(14).map((o) => [o.valore, o.attiva]), [[5, true], [10, true], [20, false], [50, false]]);
});

test('opzioniQuantita: 63 elementi attivano tutto', () => {
  assert.deepEqual(opzioniQuantita(63).map((o) => o.attiva), [true, true, true, true]);
});

test('formatta converte con le regole italiane, accentate comprese', () => {
  assert.equal(formatta('perché', true), 'PERCHÉ');
  assert.equal(formatta('UFO', false), 'ufo');
  assert.equal(formatta('PA', true), 'PA');
});

test('pescaParole pesca senza ripetizioni e non modifica la lista', () => {
  const elementi = ['a', 'b', 'c', 'd', 'e', 'f'];
  const pescate = pescaParole(elementi, 4, creaCasuale(9));
  assert.equal(pescate.length, 4);
  assert.equal(new Set(pescate).size, 4);
  assert.ok(pescate.every((p) => elementi.includes(p)));
  assert.deepEqual(elementi, ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('caricaTutto carica i due tipi e segnala quello che non si scarica', async () => {
  const dati = await caricaTutto(creaFetchFinto({
    'liste/sillabe.json': { json: { '01 - Vocali': ['A'] } },
    'liste/parole.json': { ok: false, status: 404 },
  }));
  assert.deepEqual(dati.sillabe, { url: 'liste/sillabe.json', liste: [{ nome: '01 - Vocali', elementi: ['A'] }] });
  assert.equal(dati.parole.url, 'liste/parole.json');
  assert.match(dati.parole.errore, /404/);
});

test('caricaTutto segnala un JSON non valido', async () => {
  const dati = await caricaTutto(creaFetchFinto({
    'liste/sillabe.json': { json: new SyntaxError('Unexpected token') },
    'liste/parole.json': { json: { liste: { '01': ['ala'] } } },
  }));
  assert.match(dati.sillabe.errore, /Unexpected token/);
  assert.deepEqual(dati.parole.liste, [{ nome: '01', elementi: ['ala'] }]);
});

test('i file veri delle liste si caricano', () => {
  for (const percorso of ['../liste/sillabe.json', '../liste/parole.json']) {
    const liste = normalizzaListe(leggiJson(percorso));
    assert.ok(liste.length > 0, percorso);
    for (const lista of liste) {
      assert.ok(lista.elementi.every((e) => typeof e === 'string' && e.length > 0), lista.nome);
    }
  }
});

test('trigrammi: gli e sci', () => {
  for (const voce of ['figlio', 'foglia', 'scia', 'sciame', 'GLIA', 'SCI']) assert.equal(haTrigramma(voce), true, voce);
  for (const voce of ['casa', 'sceso', 'chi', 'gnomo', 'figli', 'GLI']) assert.equal(haTrigramma(voce), false, voce);
});

test('digrammi: ch, gh, gn, sce/sci davanti a e/i, ci/gi davanti a a/o/u', () => {
  for (const voce of ['chiave', 'ghiro', 'gnomo', 'pesce', 'bacio', 'giusto', 'CIAO', 'figli', 'agli', 'GLI']) assert.equal(haDigramma(voce), true, voce);
  for (const voce of ['casa', 'cena', 'goco', 'scia', 'sciame', 'figlio']) assert.equal(haDigramma(voce), false, voce);
});

test('gruppiPresenti dice quali digrammi e trigrammi ha una voce', () => {
  assert.deepEqual(gruppiPresenti('casa'), []);
  assert.deepEqual(gruppiPresenti('scia'), ['sci']);
  assert.deepEqual(gruppiPresenti('sceso'), ['sc']);
  assert.deepEqual(gruppiPresenti('bacio'), ['ci']);
  assert.deepEqual(gruppiPresenti('GIUSTO'), ['gi']);
  assert.deepEqual(gruppiPresenti('chiave'), ['ch']);
  assert.deepEqual(gruppiPresenti('ghiro'), ['gh']);
  assert.deepEqual(gruppiPresenti('gnomo'), ['gn']);
  assert.deepEqual(gruppiPresenti('figlio'), ['gli']);
  assert.deepEqual(gruppiPresenti('figli'), ['gl']);
  assert.deepEqual(gruppiPresenti('tigli'), ['gl']);
  assert.deepEqual(gruppiPresenti('AGLI'), ['gl']);
  assert.deepEqual(gruppiPresenti('GLIE'), ['gli']);
  assert.deepEqual(gruppiPresenti('scioglie'), ['sci', 'gli']);
  assert.deepEqual(gruppiPresenti('sciogli'), ['sci', 'gl']);
});

test('filtraGruppi esclude solo i gruppi spenti', () => {
  const voci = ['casa', 'chiave', 'scia', 'gnomo', 'sciocco chiaro'];
  assert.deepEqual(filtraGruppi(voci), voci);
  assert.deepEqual(filtraGruppi(voci, { ch: false }), ['casa', 'scia', 'gnomo']);
  assert.deepEqual(filtraGruppi(voci, { sci: false }), ['casa', 'chiave', 'gnomo']);
  assert.deepEqual(filtraGruppi(voci, { ch: false, gn: false, sci: false }), ['casa']);
});

test('filtraGruppi: una voce con due gruppi resta solo se sono ammessi entrambi', () => {
  assert.deepEqual(filtraGruppi(['scioglie', 'scia', 'figlio'], { gli: false }), ['scia']);
  assert.deepEqual(filtraGruppi(['scioglie', 'scia', 'figlio'], { sci: false }), ['figlio']);
});

test('una lista con alta e bassa frequenza tiene le due parti; una voce in entrambe resta tra le alte', () => {
  const [lista] = normalizzaListe({ liste: { '01 - Facili': { alta: ['casa', 'sole'], bassa: ['Sole', 'tarlo'] } } });
  assert.deepEqual(lista, {
    nome: '01 - Facili',
    elementi: ['casa', 'sole', 'tarlo'],
    frequenze: { alta: ['casa', 'sole'], bassa: ['tarlo'] },
  });
});

test('filtraFrequenze: sceglie alta, bassa o tutte e due; senza frequenza restano tutte', () => {
  const [divisa] = normalizzaListe({ a: { alta: ['casa'], bassa: ['tarlo'] } });
  const [semplice] = normalizzaListe({ b: ['ala', 'ape'] });
  assert.deepEqual(filtraFrequenze(divisa), ['casa', 'tarlo']);
  assert.deepEqual(filtraFrequenze(divisa, { alta: true, bassa: false }), ['casa']);
  assert.deepEqual(filtraFrequenze(divisa, { alta: false, bassa: true }), ['tarlo']);
  assert.deepEqual(filtraFrequenze(semplice, { alta: true, bassa: false }), ['ala', 'ape']);
});

test('più liste insieme: le voci si uniscono senza ripetizioni e rispettano frequenza e gruppi', () => {
  const liste = normalizzaListe({
    a: { alta: ['casa', 'chiave'], bassa: ['tarlo'] },
    b: ['Casa', 'gnomo', 'sole'],
  });
  assert.deepEqual(elementiDelleListe(liste), ['casa', 'chiave', 'tarlo', 'gnomo', 'sole']);
  assert.deepEqual(elementiDelleListe(liste, { frequenze: { alta: true, bassa: false } }), ['casa', 'chiave', 'gnomo', 'sole']);
  assert.deepEqual(elementiDelleListe(liste, { gruppi: { ch: false, gn: false } }), ['casa', 'tarlo', 'sole']);
  assert.deepEqual(unisciListe(liste, { frequenze: { alta: true, bassa: false } }).elementi.length, 4);
});

test('nomeDelleListe: nomi senza numero; più liste unite, o un riassunto se sono troppo lunghe', () => {
  assert.equal(nomeDelleListe([{ nome: '01 - Facili' }]), 'Facili');
  assert.equal(nomeDelleListe([{ nome: '01 - Facili' }, { nome: '02 - Gruppi' }]), 'Facili + Gruppi');
  const lunghe = Array.from({ length: 6 }, (_, i) => ({ nome: `0${i} - Una categoria con un nome piuttosto lungo` }));
  const nome = nomeDelleListe(lunghe);
  assert.ok(nome.length <= 120);
  assert.match(nome, /altre 5 liste$/);
});

test('senzaNumero toglie il numero davanti al nome', () => {
  assert.equal(senzaNumero('01 - Solo vocali (A)'), 'Solo vocali (A)');
  assert.equal(senzaNumero('16 - Tre consonanti + dittongo + ponte (SPRIAM)'), 'Tre consonanti + dittongo + ponte (SPRIAM)');
  assert.equal(senzaNumero('Facili'), 'Facili');
});

test('doppie: una lista con l\'elenco "doppie" le toglie su richiesta, una senza elenco resta intera', () => {
  const [conElenco, senza] = normalizzaListe({
    a: { alta: ['casa', 'mamma'], bassa: ['gatto', 'tarlo'], doppie: ['Mamma', 'gatto'] },
    b: ['pappa', 'sole'],
  });
  assert.deepEqual(elementiDelleListe([conElenco]), ['casa', 'mamma', 'gatto', 'tarlo']);
  assert.deepEqual(elementiDelleListe([conElenco], { doppie: false }), ['casa', 'tarlo']);
  assert.deepEqual(elementiDelleListe([conElenco], { doppie: false, frequenze: { alta: false, bassa: true } }), ['tarlo']);
  assert.deepEqual(elementiDelleListe([senza], { doppie: false }), ['pappa', 'sole']);
  assert.deepEqual(filtraDoppie(conElenco, ['mamma', 'sole'], false), ['sole']);
});

test('formatta: in MAIUSCOLO tutto maiuscolo; in minuscolo solo i nomi propri tengono l\'iniziale', () => {
  assert.equal(formatta('Gianni', true), 'GIANNI');
  assert.equal(formatta('Gianni', false), 'Gianni');
  assert.equal(formatta('Roma', false), 'Roma');
  assert.equal(formatta('casa', false), 'casa');
  assert.equal(formatta('casa', true), 'CASA');
  // sillabe e sigle: sempre minuscole
  assert.equal(formatta('PA', false), 'pa');
  assert.equal(formatta('UFO', false), 'ufo');
  assert.equal(formatta('A', false), 'a');
  assert.equal(formatta('Àncora', false), 'Àncora');
});

const DATI_GRUPPI = {
  proporzioni: { Bi: { sostantivi: 0.5, verbi: 0.5, aggettivi: 0, altro: 0 } },
  liste: {
    Bi: {
      Facili: { alta: ['casa', 'sole', 'mare', 'canta'], bassa: [], classi: { verbi: ['canta'] } },
      Gruppi: { alta: ['pasta', 'corre'], bassa: ['tarlo'], classi: { verbi: ['corre'] } },
    },
    Tri: { Facili: { alta: ['banana'], bassa: [] } },
  },
};

test('le liste dentro un gruppo si mostrano sotto il suo nome', () => {
  const liste = normalizzaListe(DATI_GRUPPI);
  assert.deepEqual(liste.map((l) => [l.nome, l.gruppo, l.etichetta]), [
    ['Bi - Facili', 'Bi', 'Facili'],
    ['Bi - Gruppi', 'Bi', 'Gruppi'],
    ['Tri - Facili', 'Tri', 'Facili'],
  ]);
  assert.deepEqual(liste[0].classi, { verbi: ['canta'] });
  assert.deepEqual(liste[0].proporzioni, { sostantivi: 0.5, verbi: 0.5, aggettivi: 0, altro: 0 });
  assert.equal(liste[2].proporzioni, undefined);
});

test('nomeDelleListe con i gruppi: "Bi" se sono scelte tutte le sue liste, altrimenti le sue liste', () => {
  const liste = normalizzaListe(DATI_GRUPPI);
  assert.equal(nomeDelleListe([liste[0], liste[1]], liste), 'Bi');
  assert.equal(nomeDelleListe([liste[0]], liste), 'Bi: Facili');
  assert.equal(nomeDelleListe([liste[0], liste[1], liste[2]], liste), 'Bi + Tri');
  assert.equal(nomeDelleListe([liste[1], liste[2]], liste), 'Bi: Gruppi + Tri');
});

test('ripartisci divide i posti per quota senza superare le voci disponibili', () => {
  const pesi = { sostantivi: 0.36, verbi: 0.5, aggettivi: 0.1, altro: 0.04 };
  const molte = { sostantivi: 100, verbi: 100, aggettivi: 100, altro: 100 };
  assert.deepEqual(ripartisci(50, molte, pesi), { sostantivi: 18, verbi: 25, aggettivi: 5, altro: 2 });
  assert.deepEqual(ripartisci(5, molte, pesi), { sostantivi: 2, verbi: 3, aggettivi: 0, altro: 0 });
  // pochi verbi disponibili: i posti che avanzano vanno alle altre classi
  const pochiVerbi = { sostantivi: 100, verbi: 2, aggettivi: 100, altro: 100 };
  const quote = ripartisci(20, pochiVerbi, pesi);
  assert.equal(quote.verbi, 2);
  assert.equal(Object.values(quote).reduce((a, b) => a + b, 0), 20);
});

test('pescaParole con le quote rispetta le percentuali di sostantivi e verbi', () => {
  const liste = normalizzaListe({
    proporzioni: { Bi: { sostantivi: 0.5, verbi: 0.5, aggettivi: 0, altro: 0 } },
    liste: {
      Bi: {
        A: {
          alta: [...Array.from({ length: 20 }, (_, i) => `nome${i}`), ...Array.from({ length: 80 }, (_, i) => `verbo${i}`)],
          bassa: [],
          classi: { verbi: Array.from({ length: 80 }, (_, i) => `verbo${i}`) },
        },
      },
    },
  });
  const unita = unisciListe(liste, {});
  assert.ok(unita.bilancio);
  const scelte = pescaParole(unita.elementi, 20, creaCasuale(7), unita.bilancio);
  assert.equal(scelte.length, 20);
  assert.equal(scelte.filter((v) => v.startsWith('verbo')).length, 10);
  assert.equal(new Set(scelte).size, 20);
  // senza classi o con voci sconosciute non c'è bilancio e si pesca a caso
  assert.equal(bilancioDelleListe(normalizzaListe({ a: ['casa'] }), ['casa']), null);
});

test('le proporzioni dei gruppi si mescolano in base a quante voci ha ciascun gruppo', () => {
  const liste = normalizzaListe({
    proporzioni: {
      Bi: { sostantivi: 1, verbi: 0, aggettivi: 0, altro: 0 },
      Tri: { sostantivi: 0, verbi: 1, aggettivi: 0, altro: 0 },
    },
    liste: {
      Bi: { A: { alta: ['casa', 'mare', 'sole', 'luna'], bassa: [], classi: {} } },
      Tri: { A: { alta: ['canto', 'corro', 'salto', 'vado'], bassa: [], classi: { verbi: ['canto', 'corro', 'salto', 'vado'] } } },
    },
  });
  const { obiettivo } = bilancioDelleListe(liste, liste.flatMap((l) => l.elementi));
  assert.deepEqual(obiettivo, { sostantivi: 0.5, verbi: 0.5, aggettivi: 0, altro: 0 });
});
