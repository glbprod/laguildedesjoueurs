// Décompte final de deux camps.

export const pointsLot = (valeur, lot) => Math.floor(valeur / lot);

/**
 * Plus de points l'emporte ; à égalité, on compare les catégories de départage dans l'ordre ;
 * si tout est égal, la victoire est partagée.
 * @param {{[camp: string]: number}} totaux
 * @param {[string, string]} camps
 * @param {{ id: string, valeurs: {[camp: string]: number} }[]} departage
 */
export function departager(totaux, camps, departage) {
  const [a, b] = camps;
  if (totaux[a] !== totaux[b]) return { gagnant: totaux[a] > totaux[b] ? a : b, type: 'points' };
  for (const d of departage) {
    if (d.valeurs[a] !== d.valeurs[b]) {
      return { gagnant: d.valeurs[a] > d.valeurs[b] ? a : b, type: 'departage', categorie: d.id };
    }
  }
  return { gagnant: null, type: 'partage' };
}
