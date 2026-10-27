// tempo di una parola: "3,2 s"; "-" per le partite salvate prima che si misurasse
export function formattaSecondi(secondi) {
  return Number.isFinite(secondi) ? `${secondi.toFixed(1).replace('.', ',')} s` : '-';
}

export function formattaData(iso) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const NOMI_TIPO = { sillabe: ['sillaba', 'sillabe'], parole: ['parola', 'parole'] };

export function formattaQuantita(quantita, tipo) {
  const [singolare, plurale] = NOMI_TIPO[tipo];
  return `${quantita} ${quantita === 1 ? singolare : plurale}`;
}

export function etichettaTipo(tipo) {
  return tipo === 'sillabe' ? 'Sillabe' : 'Parole';
}
