export function formattaDurata(secondi) {
  const minuti = Math.floor(secondi / 60);
  const resto = secondi % 60;
  return minuti === 0 ? `${resto} s` : `${minuti} min ${resto} s`;
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
