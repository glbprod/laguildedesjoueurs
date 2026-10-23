// Îlot « symboles » : un compteur par symbole et par camp, l'alerte de paire (au passage
// au seuil seulement) et la victoire à N symboles différents. Un jeton attribué à un camp
// (section d'une possession) peut ajouter un symbole : l'îlot suit son propriétaire.
import { ouvrir, ecouter } from '../partie.js';
import { compteursEffectifs, symbolesDifferents, paireAtteinte } from '../logique/symboles.js';
import { borner, gab } from '../logique/texte.js';

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const partie = ouvrir(racine.dataset.stockage);
  const nom = (id) => config.noms[id];

  const defaut = Object.fromEntries(config.camps.map((c) => [c, new Array(config.nombre).fill(0)]));
  const etat = partie.lire(config.section, defaut);
  for (const c of config.camps) etat[c] = etat[c].map((n) => borner(Math.round(n), 0, config.plafond));

  const proprietaire = (b) => (partie.brut(b.section) ?? {})[b.fiche];
  const effectifs = (camp) => compteursEffectifs(etat[camp], config.bonus.filter((b) => proprietaire(b) === camp).map((b) => b.index));
  const instantane = () => Object.fromEntries(config.camps.map((c) => [c, effectifs(c)]));

  let avant = instantane();
  let messagePaire = '';

  // Alerte de paire : au passage au seuil seulement, jamais au-delà.
  function evaluerPaires() {
    const apres = instantane();
    messagePaire = '';
    for (const camp of config.camps) {
      const i = paireAtteinte(avant[camp], apres[camp], config.paire.seuil);
      if (i >= 0) messagePaire = gab(config.paire.message, { symbole: config.symboles[i].nom, joueur: nom(camp) });
    }
  }

  function afficher() {
    for (const rangee of racine.querySelectorAll('.compte[data-champ]')) {
      const [camp, i] = rangee.dataset.champ.split('.');
      const v = etat[camp][Number(i)];
      rangee.querySelector('[data-val]').textContent = v;
      for (const pas of rangee.querySelectorAll('[data-pas]')) {
        const suivant = v + Number(pas.dataset.pas);
        pas.disabled = suivant < 0 || suivant > config.plafond;
      }
    }
    const paire = racine.querySelector('[data-paire]');
    paire.className = messagePaire ? 'alerte chaud' : 'alerte';
    paire.textContent = messagePaire;

    for (const camp of config.camps) {
      const eff = effectifs(camp);
      const n = symbolesDifferents(eff);
      racine.querySelectorAll(`[data-jauge="${camp}"] .pastille-ronde`).forEach((p, i) => p.classList.toggle('on', i < n));
      racine.querySelector(`[data-diff="${camp}"]`).textContent = `${n} sur ${config.victoire}`;
      for (const b of config.bonus) {
        const marque = racine.querySelector(`[data-bonus="${camp}"]`);
        if (marque) marque.textContent = proprietaire(b) === camp ? `dont ${b.nom} : total ${eff[b.index]}` : '';
      }
      const alerte = racine.querySelector(`[data-alerte="${camp}"]`);
      const valeurs = { joueur: nom(camp), n, max: config.victoire };
      if (n >= config.victoire) { alerte.className = 'alerte gagne'; alerte.textContent = gab(config.messages.victoire, valeurs); }
      else if (n === config.victoire - 1) { alerte.className = 'alerte chaud'; alerte.textContent = gab(config.messages.presque, valeurs); }
      else { alerte.className = 'alerte'; alerte.textContent = ''; }
    }
    avant = instantane();
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('[data-pas]');
    if (!bouton || !racine.contains(bouton)) return;
    const rangee = bouton.closest('.compte');
    const [camp, i] = rangee.dataset.champ.split('.');
    const v = borner(etat[camp][Number(i)] + Number(bouton.dataset.pas), 0, config.plafond);
    if (v === etat[camp][Number(i)]) return;
    etat[camp][Number(i)] = v;
    evaluerPaires();
    partie.ecrire(config.section, etat);
    afficher();
  });

  // Un jeton change de propriétaire (autre îlot) : il peut créer une paire ou une victoire.
  ecouter([...new Set(config.bonus.map((b) => b.section))], () => {
    evaluerPaires();
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-ilot="symboles"]').forEach(initialiser);
