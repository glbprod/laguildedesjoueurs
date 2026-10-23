// Îlot « cartes » : recherche par nom et filtre par groupe. Rien n'est mémorisé : une
// recherche ne vaut que pour l'instant. Le filtrage est dans logique/recherche.js.
import { filtrerCartes } from '../logique/recherche.js';

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const champ = racine.querySelector('[data-recherche]');
  let filtre = 'tout';

  function afficher() {
    const resultat = filtrerCartes(config.groupes, champ.value, filtre);
    const visibles = new Set(resultat.flatMap((g) => g.fiches.map((f) => `${g.id}:${f.nom}`)));
    let n = 0;
    for (const fiche of document.querySelectorAll('[data-fiche]')) {
      const visible = visibles.has(fiche.dataset.fiche);
      fiche.hidden = !visible;
      if (visible) n++;
    }
    for (const section of document.querySelectorAll('[data-groupe]')) {
      const g = resultat.find((x) => x.id === section.dataset.groupe);
      section.hidden = !g || g.fiches.length === 0;
      const compte = section.querySelector('[data-compte-fiches]');
      if (compte && g) compte.textContent = ` (${g.fiches.length})`;
    }
    for (const b of racine.querySelectorAll('[data-filtre]')) b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre));
    racine.querySelector('[data-resultats]').textContent = n ? `${n} ${n > 1 ? 'fiches' : 'fiche'}` : 'Aucune fiche ne correspond.';
  }

  champ.addEventListener('input', afficher);
  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('button');
    if (!bouton || !racine.contains(bouton)) return;
    if (bouton.matches('[data-filtre]')) filtre = bouton.dataset.filtre;
    else if (bouton.matches('[data-effacer]')) champ.value = '';
    else return;
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="cartes"]').forEach(initialiser);
