// Piste à deux sens entre deux camps. Position : de −demi (extrémité du premier camp)
// à +demi (extrémité du second), 0 au centre. Une action du premier camp pousse vers +,
// une action du second vers −. Le côté d'un camp est celui de sa propre extrémité.
import { gab, pluriel } from './texte.js';

/**
 * @typedef {object} ConfigPiste
 * @property {[string, string]} camps
 * @property {number} casesTotal
 * @property {number} pointsCentre
 * @property {{ id: string, cases: number, points: number, jeton?: { valeur: number } }[]} zones
 */

export const demiPiste = (casesTotal) => (casesTotal - 1) / 2;

export function zoneDe(distance, config) {
  const demi = demiPiste(config.casesTotal);
  if (distance <= 0) return { type: 'centre' };
  if (distance >= demi) return { type: 'extremite' };
  let cumul = 0;
  for (const z of config.zones) {
    cumul += z.cases;
    if (distance <= cumul) return { type: 'zone', zone: z };
  }
  return { type: 'inconnue' };
}

// Clé d'un jeton : le camp du côté duquel se trouve sa zone, puis la zone.
export const cleJeton = (pos, zone, camps) => `${pos > 0 ? camps[1] : camps[0]}-${zone.id}`;

const autreCamp = (camp, camps) => (camp === camps[0] ? camps[1] : camps[0]);

/**
 * Pousse le marqueur d'une case. Retourne null si la partie est déjà finie.
 * Un jeton s'applique à la première entrée dans sa zone, puis il est retiré.
 */
export function deplacer(etat, camp, config) {
  const demi = demiPiste(config.casesTotal);
  if (Math.abs(etat.pos) >= demi) return null;
  const np = etat.pos + (camp === config.camps[0] ? 1 : -1);
  const pris = etat.pris.slice();
  const evenements = [];
  const avant = zoneDe(Math.abs(etat.pos), config);
  const apres = zoneDe(Math.abs(np), config);
  if (apres.type === 'zone') {
    const cleApres = cleJeton(np, apres.zone, config.camps);
    const cleAvant = avant.type === 'zone' ? cleJeton(etat.pos, avant.zone, config.camps) : null;
    if (cleApres !== cleAvant && apres.zone.jeton && !pris.includes(cleApres)) {
      pris.push(cleApres);
      evenements.push({ type: 'jeton', perdant: autreCamp(camp, config.camps), valeur: apres.zone.jeton.valeur, cle: cleApres });
    }
  }
  if (Math.abs(np) === demi) {
    evenements.push({ type: 'victoire', gagnant: camp, perdant: autreCamp(camp, config.camps) });
  }
  return { pos: np, pris, evenements };
}

// Les points vont au camp qui pousse : marqueur côté du second → premier camp, et inversement.
export function pointsMilitaires(pos, config) {
  const d = Math.abs(pos);
  if (d === 0) return { etat: 'centre', camp: null, points: config.pointsCentre };
  const camp = pos > 0 ? config.camps[0] : config.camps[1];
  const z = zoneDe(d, config);
  if (z.type === 'extremite') return { etat: 'extremite', camp, points: null };
  if (z.type === 'zone') return { etat: 'zone', camp, points: z.zone.points, zone: z.zone };
  return { etat: 'inconnue', camp, points: null };
}

export function pointsDe(camp, pos, config) {
  const p = pointsMilitaires(pos, config);
  return p.camp === camp && p.points !== null ? p.points : 0;
}

// Fin de manche : le camp mené choisit ; au centre, le dernier joueur actif.
export function quiChoisit(pos, dernierActif, camps) {
  if (pos < 0) return { choisit: camps[0], raison: 'mene' };
  if (pos > 0) return { choisit: camps[1], raison: 'mene' };
  return { choisit: dernierActif || null, raison: 'dernier-actif' };
}

// Phrase d'état du marqueur. `nom(idCamp)` donne le nom affiché d'un camp.
export function textePion(pos, config, messages, nom) {
  const d = Math.abs(pos);
  if (d === 0) return messages.centre;
  const cote = pos > 0 ? config.camps[1] : config.camps[0];
  const beneficiaire = pos > 0 ? config.camps[0] : config.camps[1];
  const z = zoneDe(d, config);
  if (z.type === 'extremite') return gab(messages.extremite, { perdant: nom(cote), gagnant: nom(beneficiaire) });
  const p = pointsMilitaires(pos, config);
  return gab(messages.zone, {
    cases: pluriel(d, 'case', 'cases'), cote: nom(cote), zone: p.zone ? p.zone.id : '?',
    points: p.points, leader: nom(beneficiaire),
  });
}
