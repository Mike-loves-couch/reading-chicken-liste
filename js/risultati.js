// Identificativo di una partita: il server lo usa per non registrarla due volte.
// crypto.randomUUID esiste solo su https e localhost; altrimenti si costruisce a mano (UUID versione 4).
export function nuovoId(cripto = globalThis.crypto) {
  if (typeof cripto.randomUUID === 'function') return cripto.randomUUID();
  const byte = cripto.getRandomValues(new Uint8Array(16));
  byte[6] = (byte[6] & 0x0f) | 0x40;
  byte[8] = (byte[8] & 0x3f) | 0x80;
  const esadecimale = [...byte].map((b) => b.toString(16).padStart(2, '0')).join('');
  return [8, 12, 16, 20].reduceRight((testo, posizione) => `${testo.slice(0, posizione)}-${testo.slice(posizione)}`, esadecimale);
}

// Dal record dello storico del browser (creaRecord) al corpo di POST /api/partite.
export function partitaPerIlServer(record, bambinoId, idClient) {
  return {
    id_client: idClient,
    bambino_id: bambinoId,
    giocata_il: record.data,
    tipo: record.tipo,
    lista: record.lista,
    maiuscolo: record.maiuscolo,
    durata_secondi: record.durataSecondi,
    parole: record.parole.map(({ testo, riprova, secondi }) => ({ testo, riprova, secondi })),
  };
}

// Da una partita di GET /api/bambini/{id}/partite al formato dello storico del browser.
export function partitaDalServer(partita) {
  return {
    data: partita.giocata_il,
    tipo: partita.tipo,
    lista: partita.lista,
    quantita: partita.quantita,
    maiuscolo: partita.maiuscolo,
    durataSecondi: partita.durata_secondi,
    parole: partita.parole,
  };
}
