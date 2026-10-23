// Symboles à réunir, comptés par camp.

// Un jeton attribué peut ajouter un symbole : `indicesBonus` liste les symboles concernés.
export function compteursEffectifs(compteurs, indicesBonus = []) {
  const c = compteurs.slice();
  for (const i of indicesBonus) if (i >= 0) c[i] += 1;
  return c;
}

export const symbolesDifferents = (compteurs) => compteurs.filter((n) => n > 0).length;

// Alerte de paire : au passage au seuil seulement (lecture prudente), jamais au-delà.
// Retourne l'indice du dernier symbole qui vient d'atteindre le seuil, ou -1.
export function paireAtteinte(avant, apres, seuil) {
  let trouve = -1;
  apres.forEach((n, i) => { if (n === seuil && n > avant[i]) trouve = i; });
  return trouve;
}
