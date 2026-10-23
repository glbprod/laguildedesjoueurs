// Îlot « sélection » : un assistant pas à pas (qui prend quoi, dans quel ordre).
// Les consignes sont rendues au build ; ici, l'étape en cours et le mode, mémorisés.
import { ouvrir } from '../partie.js';
import { borner } from '../logique/texte.js';

function initialiser(racine) {
  const partie = ouvrir(racine.dataset.stockage);
  const total = Number(racine.dataset.etapes);
  const etat = partie.lire('selection', { mode: 'hasard', etape: 0 });
  etat.mode = etat.mode === 'premiere' && racine.querySelector('[data-panneau="premiere"]') ? 'premiere' : 'hasard';
  etat.etape = borner(Math.round(etat.etape), 0, total);

  const rang = racine.querySelector('[data-rang]');
  const texte = racine.querySelector('[data-texte]');
  const precedent = racine.querySelector('[data-precedent]');
  const suivant = racine.querySelector('[data-suivant]');

  function afficher() {
    const premiere = etat.mode === 'premiere';
    for (const b of racine.querySelectorAll('[data-mode]')) {
      b.setAttribute('aria-pressed', String((b.dataset.mode === 'premiere') === premiere));
    }
    racine.querySelector('[data-panneau="hasard"]').hidden = premiere;
    const lots = racine.querySelector('[data-panneau="premiere"]');
    if (lots) lots.hidden = !premiere;

    const e = etat.etape;
    if (e >= total) {
      rang.textContent = 'Terminé';
      texte.textContent = 'Sélection faite. Bonne partie !';
    } else {
      rang.textContent = `Étape ${e + 1} sur ${total}`;
      texte.replaceChildren(...racine.querySelector(`[data-etape="${e}"]`).cloneNode(true).childNodes);
    }
    for (const li of racine.querySelectorAll('[data-etape]')) {
      const i = Number(li.dataset.etape);
      li.className = i < e ? 'fait' : i === e ? 'courant' : '';
      if (i === e) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    }
    precedent.disabled = e <= 0;
    suivant.disabled = e >= total;
  }

  racine.addEventListener('click', (ev) => {
    const bouton = ev.target.closest('button');
    if (!bouton || !racine.contains(bouton)) return;
    if (bouton.matches('[data-mode]')) etat.mode = bouton.dataset.mode;
    else if (bouton.matches('[data-suivant]')) etat.etape = Math.min(total, etat.etape + 1);
    else if (bouton.matches('[data-precedent]')) etat.etape = Math.max(0, etat.etape - 1);
    else return;
    partie.ecrire('selection', etat);
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="selection"]').forEach(initialiser);
