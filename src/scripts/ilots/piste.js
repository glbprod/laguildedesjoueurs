// Îlot « piste » : le marqueur, les jetons, l'annulation et les messages.
// Le dessin est rendu au build (components/Piste.astro) ; la règle est dans logique/piste.js.
import { ouvrir } from '../partie.js';
import { deplacer, textePion, demiPiste } from '../logique/piste.js';
import { borner, gab } from '../logique/texte.js';

const HISTORIQUE_MAX = 30;

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const partie = ouvrir(racine.dataset.stockage);
  const demi = demiPiste(config.casesTotal);
  const { CX, CW, CY, CH } = config.geometrie;
  const nom = (id) => config.noms[id];

  const etat = partie.lire(config.section, { pos: 0, pris: [], historique: [] });
  etat.pos = borner(Math.round(etat.pos), -demi, demi);
  etat.pris = etat.pris.filter((x) => typeof x === 'string');
  etat.historique = etat.historique.filter((h) => h && Number.isFinite(h.pos) && Array.isArray(h.pris) && Math.abs(h.pos) <= demi);
  // Message du dernier coup : jamais mémorisé, il ne vaut que pour l'instant.
  let evenement = { niveau: '', texte: '' };

  const pion = racine.querySelector('[data-pion]');
  const svg = racine.querySelector('[data-svg]');
  const message = racine.querySelector('[data-evenement]');

  function afficher() {
    pion.style.transform = `translate(${CX + (etat.pos + demi) * CW + CW / 2}px, ${CY + CH / 2}px)`;
    for (const g of racine.querySelectorAll('[data-jeton]')) g.classList.toggle('pris', etat.pris.includes(g.dataset.jeton));
    const texte = textePion(etat.pos, config, config.messages, nom);
    racine.querySelector('[data-etat]').textContent = texte;
    svg.setAttribute('aria-label', `Piste. ${texte}`);
    for (const b of racine.querySelectorAll('[data-camp]')) b.disabled = Math.abs(etat.pos) >= demi;
    racine.querySelector('[data-annuler]').disabled = etat.historique.length === 0;
    message.className = evenement.niveau ? `alerte ${evenement.niveau}` : 'alerte';
    message.textContent = evenement.texte;
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('button');
    if (!bouton || !racine.contains(bouton)) return;

    if (bouton.matches('[data-camp]')) {
      const r = deplacer(etat, bouton.dataset.camp, config);
      if (!r) return;
      etat.historique.push({ pos: etat.pos, pris: etat.pris.slice() });
      if (etat.historique.length > HISTORIQUE_MAX) etat.historique.shift();
      etat.pos = r.pos;
      etat.pris = r.pris;
      const lignes = r.evenements.map((ev) =>
        ev.type === 'jeton'
          ? gab(config.messages.jeton, { perdant: nom(ev.perdant), valeur: ev.valeur })
          : gab(config.messages.victoire, { perdant: nom(ev.perdant), gagnant: nom(ev.gagnant) }),
      );
      const victoire = r.evenements.some((ev) => ev.type === 'victoire');
      evenement = { niveau: victoire ? 'gagne' : lignes.length ? 'chaud' : '', texte: lignes.join(' ') };
    } else if (bouton.matches('[data-annuler]')) {
      const dernier = etat.historique.pop();
      if (!dernier) return;
      etat.pos = dernier.pos;
      etat.pris = dernier.pris;
      evenement = { niveau: '', texte: config.messages.annule };
    } else {
      return;
    }
    partie.ecrire(config.section, etat);
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="piste"]').forEach(initialiser);
