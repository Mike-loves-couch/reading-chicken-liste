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
