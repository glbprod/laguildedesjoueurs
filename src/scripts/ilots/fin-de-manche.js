// Îlot « fin de manche » : qui choisit le premier joueur de la manche suivante.
// Il lit la position du marqueur dans la section de la piste (écrite par l'îlot piste).
import { ouvrir, ecouter } from '../partie.js';
import { quiChoisit } from '../logique/piste.js';
import { gab } from '../logique/texte.js';

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const partie = ouvrir(racine.dataset.stockage);
  const nom = (id) => config.noms[id];
  // Jamais mémorisé : « qui a joué la dernière carte » ne vaut que pour la manche en cours.
  let dernierActif = null;

  const position = () => partie.lire(config.section, { pos: 0, pris: [], historique: [] }).pos;

  function afficher() {
    const r = quiChoisit(position(), dernierActif, config.camps);
    const m = config.messages;
    const texte = r.raison === 'mene'
      ? gab(m.mene, { joueur: nom(r.choisit) })
      : r.choisit ? gab(m.centreChoisi, { joueur: nom(r.choisit) }) : m.centre;
    const alerte = racine.querySelector('[data-alerte]');
    alerte.className = r.choisit ? 'alerte gagne' : 'alerte';
    alerte.textContent = texte;
    racine.querySelector('[data-question]').hidden = r.raison !== 'dernier-actif';
    for (const b of racine.querySelectorAll('[data-dernier]')) b.setAttribute('aria-pressed', String(dernierActif === b.dataset.dernier));
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('[data-dernier]');
    if (!bouton || !racine.contains(bouton)) return;
    dernierActif = dernierActif === bouton.dataset.dernier ? null : bouton.dataset.dernier;
    afficher();
  });

  // Le marqueur a bougé : la réponse précédente ne vaut plus.
  ecouter([config.section], () => {
    dernierActif = null;
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="fin-de-manche"]').forEach(initialiser);
