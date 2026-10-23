// Règle de commerce : le prix d'une ressource vaut `prixBase` plus le nombre de symboles
// de cette ressource produits par l'adversaire, ou `prixFixe` si une carte le fixe.
// Pur et sans dépendance : le build l'utilise pour contrôler les exemples du YAML,
// et l'îlot du calculateur l'utilise tel quel.

/**
 * @typedef {object} EntreeCommerce
 * @property {number} pieces                    coût en pièces de la carte
 * @property {Record<string, number>} besoin    ressources demandées par la carte
 * @property {Record<string, number>} mienne    ressources que produit l'acheteur
 * @property {Record<string, number>} adverse   symboles adverses qui comptent dans le prix
 * @property {Record<string, boolean>} fixe     ressources dont le prix est fixé
 */

/**
 * @param {EntreeCommerce} e
 * @param {{ id: string, nom?: string }[]} ressources
 */
export function calculerCommerce(e, ressources, prixBase, prixFixe) {
  const lignes = [];
  let total = e.pieces;
  for (const r of ressources) {
    const manque = Math.max(0, (e.besoin[r.id] ?? 0) - (e.mienne[r.id] ?? 0));
    if (manque === 0) continue;
    const prix = e.fixe[r.id] ? prixFixe : prixBase + (e.adverse[r.id] ?? 0);
    lignes.push({ id: r.id, nom: r.nom ?? r.id, manque, prix, sous: manque * prix });
    total += manque * prix;
  }
  return { total, lignes, pieces: e.pieces };
}

// Texte du total affiché : « Coût total : 7 pièces », et le détail ligne à ligne.
export function resumeCommerce(r, libelles) {
  const morceaux = [];
  if (r.pieces) morceaux.push(r.pieces + (r.pieces > 1 ? ' pièces' : ' pièce'));
  for (const l of r.lignes) morceaux.push(`${l.nom} ${l.manque} × ${l.prix} = ${l.sous}`);
  return {
    grand: `${libelles.total} : ${r.total}${r.total > 1 ? ' pièces' : ' pièce'}`,
    detail: morceaux.length ? morceaux.join(' · ') : libelles.rien,
  };
}
