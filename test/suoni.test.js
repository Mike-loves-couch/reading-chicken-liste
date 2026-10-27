import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SUONI, creaSuoni, fileDeiSuoni } from '../js/suoni.js';

const radice = new URL('../', import.meta.url);

// lascia finire scaricamento e decodifica finti
const attendi = () => new Promise((risolvi) => setImmediate(risolvi));

// AudioContext finto: ogni suono fatto partire finisce in registro, con il file e il volume
function contestoFinto(registro) {
  return class {
    state = 'running';
    destination = {};
    async decodeAudioData(byte) {
      return { file: byte };
    }
    resume() {
      this.state = 'running';
    }
    createGain() {
      return { gain: { value: 1 }, connect: (nodo) => nodo };
    }
    createBufferSource() {
      const sorgente = {
        buffer: null,
        connect(guadagno) {
          sorgente.volume = guadagno.gain.value;
          return guadagno;
        },
        start: () => registro.push({ file: sorgente.buffer.file, volume: sorgente.volume }),
      };
      return sorgente;
    }
  };
}

// lo "scaricamento" finto restituisce il percorso stesso come contenuto del file
function suoniFinti({ attivi = true, manca = null, adesso = () => 0 } = {}) {
  const registro = [];
  const suoni = creaSuoni({
    attivi,
    Contesto: contestoFinto(registro),
    scarica: async (percorso) => {
      if (percorso === manca) throw new Error('404');
      return percorso;
    },
    adesso,
  });
  return { suoni, registro };
}

test('tutti i file dei suoni esistono', () => {
  for (const percorso of fileDeiSuoni()) assert.ok(existsSync(new URL(percorso, radice)), percorso);
});

test('prima del primo clic o tasto non suona niente', async () => {
  const { suoni, registro } = suoniFinti();
  await attendi();
  suoni.suona('corretta');
  assert.deepEqual(registro, []);
});

test('dopo il primo gesto suona il file del momento con il suo volume', async () => {
  const { suoni, registro } = suoniFinti();
  suoni.sblocca();
  await attendi();
  suoni.suona('corretta');
  suoni.suona('passo');
  assert.deepEqual(registro[0], { file: 'audio/corretta.wav', volume: SUONI.corretta.volume });
  assert.ok(SUONI.passo.file.includes(registro[1].file));
});

test('con i suoni spenti non suona niente finché non si riaccendono', async () => {
  const { suoni, registro } = suoniFinti({ attivi: false });
  suoni.sblocca();
  await attendi();
  suoni.suona('riprova');
  assert.equal(registro.length, 0);
  suoni.impostaAttivi(true);
  suoni.suona('riprova');
  assert.equal(registro.length, 1);
});

test('contro il muro suona al massimo una volta ogni pausa', async () => {
  let ora = 0;
  const { suoni, registro } = suoniFinti({ adesso: () => ora });
  suoni.sblocca();
  await attendi();
  suoni.suona('muro');
  ora = 150; // tenendo premuta la freccia il pollo ci sbatte ogni 150 ms
  suoni.suona('muro');
  assert.equal(registro.length, 1);
  ora = SUONI.muro.pausaMs;
  suoni.suona('muro');
  assert.equal(registro.length, 2);
});

test('un file che manca lascia muto solo il suo momento', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const { suoni, registro } = suoniFinti({ manca: 'audio/parola.wav' });
  suoni.sblocca();
  await attendi();
  suoni.suona('parola');
  suoni.suona('corretta');
  assert.deepEqual(registro.map((r) => r.file), ['audio/corretta.wav']);
});

test('senza audio nel browser il gioco resta muto senza errori', async () => {
  const suoni = creaSuoni({ Contesto: undefined, scarica: async (percorso) => percorso });
  assert.doesNotThrow(() => {
    suoni.sblocca();
    suoni.suona('festa');
  });
});
