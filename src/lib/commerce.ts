// Règle de commerce : le prix d'une ressource vaut `prixBase` plus le nombre de symboles
// de cette ressource produits par l'adversaire, ou `prixFixe` si une carte le fixe.
// Pur et sans dépendance : le build l'utilise pour contrôler les exemples du YAML,
// et l'îlot du calculateur pourra le reprendre tel quel.

export interface EntreeCommerce {
  pieces: number;                   // coût en pièces de la carte
  besoin: Record<string, number>;   // ressources demandées par la carte
  mienne: Record<string, number>;   // ressources que produit l'acheteur
  adverse: Record<string, number>;  // symboles de l'adversaire qui comptent dans le prix
  fixe: Record<string, boolean>;    // ressources dont le prix est fixé
}

export function calculerCommerce(
  e: EntreeCommerce,
  ressources: readonly { id: string }[],
  prixBase: number,
  prixFixe: number,
) {
  const lignes: { id: string; manque: number; prix: number; sous: number }[] = [];
  let total = e.pieces;
  for (const r of ressources) {
    const manque = Math.max(0, (e.besoin[r.id] ?? 0) - (e.mienne[r.id] ?? 0));
    if (manque === 0) continue;
    const prix = e.fixe[r.id] ? prixFixe : prixBase + (e.adverse[r.id] ?? 0);
    lignes.push({ id: r.id, manque, prix, sous: manque * prix });
    total += manque * prix;
  }
  return { total, lignes };
}
