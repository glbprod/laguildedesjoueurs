// Îlot « possession » : chaque jeton va à un seul camp (ou à personne).
// L'attribution est la règle de logique/possession.js ; les autres îlots lisent la section.
import { ouvrir } from '../partie.js';
import { attribuer } from '../logique/possession.js';

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const partie = ouvrir(racine.dataset.stockage);

  // Dictionnaire id de jeton → id de camp ; une valeur inconnue retombe sur « personne ».
  const stocke = partie.brut(config.section) ?? {};
  let possession = Object.fromEntries(config.ids.map((id) => [id, config.camps.includes(stocke[id]) ? stocke[id] : '']));

  function afficher() {
    for (const b of racine.querySelectorAll('[data-fiche]')) {
      b.setAttribute('aria-pressed', String(possession[b.dataset.fiche] === b.dataset.camp));
    }
    const n = config.ids.filter((id) => possession[id]).length;
    racine.querySelector('[data-compte]').textContent = `${n} jeton${n > 1 ? 's' : ''} attribué${n > 1 ? 's' : ''} sur ${config.ids.length}.`;
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('[data-fiche]');
    if (!bouton || !racine.contains(bouton)) return;
    possession = attribuer(possession, bouton.dataset.fiche, bouton.dataset.camp);
    partie.ecrire(config.section, possession);
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="possession"]').forEach(initialiser);
