// Pages autonomes de reference/ publiées avec le site.
//
// Liste explicite, volontairement : seul ce qui est nommé ici part en ligne.
// On ajoute un jeu à la liste seulement quand ses textes sont validés.
//
// Un seul tableau pour deux usages : la copie dans dist/ au build
// (scripts/copier-reference.mjs) et le service en dev (astro.config.mjs).
export const PAGES_PUBLIEES = [
  'chateaux_aide-de-jeu_v1.html',
  'chateaux_grille-observation_v1.html',
];

export const DOSSIER_REFERENCE = new URL('../reference/', import.meta.url);
