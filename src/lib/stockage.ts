// Clé localStorage d'un module. Préfixe `guilde:<slug>:` : l'origine glbprod.github.io
// est partagée avec d'autres dépôts.
//  - `module` (défaut) : une clé par module, `guilde:<slug>:<module>`.
//  - `partie`          : une clé pour tout le jeu, `guilde:<slug>:partie`, avec une section
//                        par suivi. Pour les jeux dont les modules se lisent entre eux.
export function cleStockage(slug: string, module: string, stockage: 'module' | 'partie'): string {
  return stockage === 'partie' ? `guilde:${slug}:partie` : `guilde:${slug}:${module}`;
}
