import { chiama } from '../api.js';

// Riquadro dell'accesso nel menu e scelta di chi gioca. Senza server non compare niente.
export function collegaAccount({ account, storico }) {
  const scelta = document.getElementById('scelta-bambino');
  const perId = new Map(account.bambini.map((bambino) => [bambino.id, bambino]));

  if (account.stato !== 'senza-server') {
    document.getElementById('account').hidden = false;
    document.getElementById('link-accedi').hidden = account.stato !== 'fuori';
    const nome = document.getElementById('account-nome');
    const esci = document.getElementById('pulsante-esci-account');
    nome.hidden = account.stato !== 'dentro';
    esci.hidden = account.stato !== 'dentro';
    if (account.stato === 'dentro') {
      nome.textContent = account.utente.nome ?? account.utente.email;
      esci.addEventListener('click', async () => {
        await chiama('POST', '/esci').catch(() => {});
        window.location.reload();
      });
    }
  }

  if (account.bambini.length > 0) {
    const logopedista = account.utente.ruolo === 'logopedista';
    if (logopedista) {
      // il logopedista sceglie a ogni avvio: di default si prova senza salvare niente
      const nessuno = document.createElement('option');
      nessuno.value = '';
      nessuno.textContent = 'Nessuno (prova, non si salva)';
      scelta.append(nessuno);
    }
    const etichetta = (bambino) => (logopedista && bambino.famiglia ? `${bambino.nome} · ${bambino.famiglia}` : bambino.nome);
    const occorrenze = new Map();
    for (const bambino of account.bambini) occorrenze.set(etichetta(bambino), (occorrenze.get(etichetta(bambino)) ?? 0) + 1);
    for (const bambino of account.bambini) {
      const opzione = document.createElement('option');
      opzione.value = String(bambino.id);
      // senza l'email due famiglie senza nome con lo stesso bambino avrebbero la stessa voce
      opzione.textContent = occorrenze.get(etichetta(bambino)) > 1 ? `${etichetta(bambino)} · famiglia n. ${bambino.famiglia_id}` : etichetta(bambino);
      scelta.append(opzione);
    }
    if (logopedista) {
      scelta.value = '';
    } else {
      const ricordato = storico.leggiBambino();
      scelta.value = String(perId.has(ricordato) ? ricordato : account.bambini[0].id);
      scelta.addEventListener('change', () => storico.salvaBambino(Number(scelta.value)));
    }
    document.getElementById('chi-gioca').hidden = false;
  }

  return {
    // il profilo che gioca, o null se si gioca senza accesso o senza profili
    bambino: () => (scelta.value === '' ? null : perId.get(Number(scelta.value)) ?? null),
  };
}
