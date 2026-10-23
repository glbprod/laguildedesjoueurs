// Îlot « décompte » : additionne les catégories de chaque camp et donne le verdict.
// Il lit les autres suivis par leur section : la piste (points de la zone), les jetons
// attribués, les symboles (victoire immédiate). Rien n'est recopié : tout reste à sa source.
import { ouvrir, ecouter } from '../partie.js';
import { demiPiste, pointsDe } from '../logique/piste.js';
import { pointsPossession } from '../logique/possession.js';
import { compteursEffectifs, symbolesDifferents } from '../logique/symboles.js';
import { departager, pointsLot } from '../logique/decompte.js';
import { borner, gab } from '../logique/texte.js';

const MAX_SAISIE = 999;

function initialiser(racine) {
  const config = JSON.parse(racine.dataset.config);
  const partie = ouvrir(racine.dataset.stockage);
  const nom = (id) => config.noms[id];
  const [a, b] = config.camps;
  const saisies = config.categories.filter((k) => k.mode === 'saisie' || k.mode === 'lot');

  const defaut = Object.fromEntries(config.camps.map((c) => [c, Object.fromEntries(saisies.map((k) => [k.id, 0]))]));
  const etat = partie.lire(config.section, defaut);
  for (const c of config.camps) for (const k of saisies) etat[c][k.id] = borner(Math.round(etat[c][k.id]), 0, MAX_SAISIE);

  // Lecture des autres suivis, à chaque affichage : ils peuvent changer à tout moment.
  const etatPiste = (p) => partie.lire(p.section, { pos: 0, pris: [], historique: [] });
  const possession = (condition) => partie.brut(config.possessions[condition]) ?? {};

  function points(camp, k) {
    switch (k.mode) {
      case 'saisie': return etat[camp][k.id];
      case 'lot': return pointsLot(etat[camp][k.id], k.lot);
      case 'piste': {
        const p = config.pistes[k.condition];
        return pointsDe(camp, etatPiste(p).pos, p);
      }
      case 'possession': return pointsPossession(possession(k.condition), camp, k.fiches);
      default: return 0;
    }
  }
  const total = (camp) => config.categories.reduce((t, k) => t + points(camp, k), 0);

  // Victoire immédiate : la partie s'est déjà arrêtée avant le décompte.
  function arret() {
    for (const r of config.arret) {
      if (r.type === 'piste') {
        const pos = etatPiste(r.piste).pos;
        if (Math.abs(pos) >= demiPiste(r.piste.casesTotal)) return { titre: r.titre, gagnant: pos > 0 ? r.piste.camps[0] : r.piste.camps[1] };
      } else if (r.type === 'symboles') {
        const stocke = partie.lire(r.section, Object.fromEntries(config.camps.map((c) => [c, new Array(r.nombre).fill(0)])));
        for (const camp of config.camps) {
          const bonus = r.bonus.filter((x) => (partie.brut(x.section) ?? {})[x.fiche] === camp).map((x) => x.index);
          if (symbolesDifferents(compteursEffectifs(stocke[camp], bonus)) >= r.victoire) return { titre: r.titre, gagnant: camp };
        }
      }
    }
    return null;
  }

  function afficher() {
    for (const rangee of racine.querySelectorAll('.compte[data-champ]')) {
      const [camp, id] = rangee.dataset.champ.split('.');
      const v = etat[camp][id];
      const champ = rangee.querySelector('[data-saisie]');
      if (document.activeElement !== champ) champ.value = v;
      for (const pas of rangee.querySelectorAll('[data-pas]')) {
        pas.disabled = v + Number(pas.dataset.pas) < 0 || v + Number(pas.dataset.pas) > MAX_SAISIE;
      }
    }
    for (const camp of config.camps) {
      for (const k of config.categories) {
        const auto = racine.querySelector(`[data-auto="${camp}.${k.id}"]`);
        if (auto) auto.textContent = points(camp, k);
        const conv = racine.querySelector(`[data-conv="${camp}.${k.id}"]`);
        if (conv) { const p = points(camp, k); conv.textContent = `= ${p} point${p > 1 ? 's' : ''}`; }
      }
      racine.querySelector(`[data-total="${camp}"]`).textContent = total(camp);
    }

    const verdict = racine.querySelector('[data-verdict]');
    const m = config.messages;
    const fin = arret();
    const totaux = { [a]: total(a), [b]: total(b) };
    let niveau = '', texte;
    if (fin) { niveau = 'gagne'; texte = gab(m.arret, { condition: fin.titre, joueur: nom(fin.gagnant) }); }
    else if (totaux[a] === 0 && totaux[b] === 0) texte = m.vide;
    else {
      const depart = config.departage.map((id) => {
        const k = config.categories.find((x) => x.id === id);
        return { id, valeurs: { [a]: points(a, k), [b]: points(b, k) } };
      });
      const v = departager(totaux, [a, b], depart);
      niveau = 'gagne';
      if (v.type === 'partage') texte = m.partage;
      else {
        const autre = v.gagnant === a ? b : a;
        if (v.type === 'points') texte = gab(m.points, { joueur: nom(v.gagnant), a: totaux[v.gagnant], b: totaux[autre] });
        else {
          const d = depart.find((x) => x.id === v.categorie);
          texte = gab(m.departage, {
            joueur: nom(v.gagnant), a: totaux[a], x: d.valeurs[v.gagnant], y: d.valeurs[autre],
            categorie: config.categories.find((x) => x.id === v.categorie).nom,
          });
        }
      }
    }
    verdict.className = niveau ? `alerte ${niveau}` : 'alerte';
    verdict.textContent = texte;
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('[data-pas]');
    if (!bouton || !racine.contains(bouton)) return;
    const [camp, id] = bouton.closest('.compte').dataset.champ.split('.');
    etat[camp][id] = borner(etat[camp][id] + Number(bouton.dataset.pas), 0, MAX_SAISIE);
    partie.ecrire(config.section, etat);
    afficher();
  });
  racine.addEventListener('input', (e) => {
    const champ = e.target.closest('[data-saisie]');
    if (!champ) return;
    const [camp, id] = champ.closest('.compte').dataset.champ.split('.');
    const n = parseInt(champ.value, 10);
    etat[camp][id] = borner(Number.isFinite(n) ? n : 0, 0, MAX_SAISIE);
    partie.ecrire(config.section, etat);
    afficher();
  });
  // En quittant le champ, on le remet d'aplomb (« 007 » devient « 7 »).
  racine.addEventListener('change', () => afficher());

  // Les suivis lus ici changent dans d'autres îlots.
  const sections = new Set([...Object.values(config.pistes).map((p) => p.section), ...Object.values(config.possessions)]);
  for (const r of config.arret) {
    if (r.type === 'piste') sections.add(r.piste.section);
    if (r.type === 'symboles') { sections.add(r.section); r.bonus.forEach((x) => sections.add(x.section)); }
  }
  ecouter([...sections], afficher);

  afficher();
}

document.querySelectorAll('[data-ilot="decompte"]').forEach(initialiser);
