// Frecce della tastiera → direzioni. Una pressione = un passo; tenendo premuto,
// un passo ogni INTERVALLO_MS. Separato dal resto per poter aggiungere il touch.
const TASTI = { ArrowUp: 'su', ArrowDown: 'giu', ArrowLeft: 'sinistra', ArrowRight: 'destra' };
export const INTERVALLO_MS = 150;

export function collegaTastiera(bersaglio, suDirezione) {
  let premuta = null;
  let timer = null;

  function ferma() {
    clearInterval(timer);
    timer = null;
    premuta = null;
  }

  function suKeydown(evento) {
    const direzione = TASTI[evento.key];
    if (!direzione) return;
    evento.preventDefault();
    if (direzione === premuta) return; // ripetizione automatica del sistema operativo
    ferma();
    premuta = direzione;
    suDirezione(direzione);
    timer = setInterval(() => suDirezione(direzione), INTERVALLO_MS);
  }

  function suKeyup(evento) {
    if (TASTI[evento.key] === premuta) ferma();
  }

  bersaglio.addEventListener('keydown', suKeydown);
  bersaglio.addEventListener('keyup', suKeyup);
  bersaglio.addEventListener('blur', ferma);
  return function scollega() {
    ferma();
    bersaglio.removeEventListener('keydown', suKeydown);
    bersaglio.removeEventListener('keyup', suKeyup);
    bersaglio.removeEventListener('blur', ferma);
  };
}
