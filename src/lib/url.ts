// Construit un lien interne sous le préfixe `base` (GitHub Pages).
// url('duel/effets/') → '/laguildedesjoueurs/duel/effets/'
export function url(chemin = ''): string {
  return import.meta.env.BASE_URL + chemin.replace(/^\/+/, '');
}
