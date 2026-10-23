// Recherche de fiches par nom, casse et accents ignorés.
import { sansAccents } from './texte.js';

/**
 * @param {{ id: string, fiches: { nom: string }[] }[]} groupes
 * @param {string} requete
 * @param {string} filtre  id d'un groupe, ou « tout »
 */
export function filtrerCartes(groupes, requete, filtre) {
  const q = sansAccents(requete);
  return groupes
    .filter((g) => filtre === 'tout' || g.id === filtre)
    .map((g) => ({ id: g.id, fiches: g.fiches.filter((f) => !q || sansAccents(f.nom).includes(q)) }));
}
