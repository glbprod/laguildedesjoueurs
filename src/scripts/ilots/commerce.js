// Îlot « commerce » : le balisage est rendu au build (components/modules/Commerce.astro).
// Ici : la saisie, le calcul (logique/commerce.js) et le total affiché.
//  - mémorisés dans la partie : ma production, la production adverse, les prix fixés ;
//  - jamais mémorisés : le coût de la carte en cours (besoin et pièces).
import { ouvrir } from '../partie.js';
import { calculerCommerce, resumeCommerce } from '../logique/commerce.js';
import { borner } from '../logique/texte.js';

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const partie = ouvrir(racine.dataset.stockage);
  const ids = config.ressources.map((r) => r.id);
  const parRessource = (v) => Object.fromEntries(ids.map((id) => [id, v]));

  const defaut = { mienne: parRessource(0), adverse: parRessource(0), fixe: parRessource(false) };
  const memoire = partie.lire('commerce', defaut);
  const cout = { pieces: 0, besoin: parRessource(0) };

  // « mienne.bois », « besoin.bois », « pieces » → la valeur correspondante
  const lire = (cle) => {
    if (cle === 'pieces') return cout.pieces;
    const [champ, id] = cle.split('.');
    return champ === 'besoin' ? cout.besoin[id] : memoire[champ][id];
  };
  const ecrire = (cle, v) => {
    if (cle === 'pieces') cout.pieces = v;
    else {
      const [champ, id] = cle.split('.');
      if (champ === 'besoin') cout.besoin[id] = v;
      else memoire[champ][id] = v;
    }
  };

  function afficher() {
    for (const rangee of racine.querySelectorAll('.compte[data-champ]')) {
      const v = lire(rangee.dataset.champ);
      rangee.querySelector('[data-val]').textContent = v;
      for (const pas of rangee.querySelectorAll('[data-pas]')) {
        const suivant = v + Number(pas.dataset.pas);
        pas.disabled = suivant < Number(rangee.dataset.min) || suivant > Number(rangee.dataset.max);
      }
    }
    for (const b of racine.querySelectorAll('[data-fixe]')) {
      b.setAttribute('aria-pressed', String(memoire.fixe[b.dataset.fixe]));
    }
    const r = calculerCommerce(
      { pieces: cout.pieces, besoin: cout.besoin, mienne: memoire.mienne, adverse: memoire.adverse, fixe: memoire.fixe },
      config.ressources, config.prixBase, config.prixFixe,
    );
    const t = resumeCommerce(r, config.libelles);
    const total = racine.querySelector('[data-total]');
    const grand = document.createElement('div');
    grand.className = 'grand';
    grand.textContent = t.grand;
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.textContent = t.detail;
    total.replaceChildren(grand, detail);
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('button');
    if (!bouton || !racine.contains(bouton)) return;
    if (bouton.matches('[data-pas]')) {
      const rangee = bouton.closest('.compte');
      const v = borner(lire(rangee.dataset.champ) + Number(bouton.dataset.pas), Number(rangee.dataset.min), Number(rangee.dataset.max));
      ecrire(rangee.dataset.champ, v);
    } else if (bouton.matches('[data-fixe]')) {
      memoire.fixe[bouton.dataset.fixe] = !memoire.fixe[bouton.dataset.fixe];
    } else if (bouton.matches('[data-effacer]')) {
      cout.pieces = 0;
      cout.besoin = parRessource(0);
    } else {
      return;
    }
    partie.ecrire('commerce', memoire);
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="commerce"]').forEach(initialiser);
