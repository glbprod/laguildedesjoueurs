// @ts-check
import { defineConfig } from 'astro/config';

// Site de projet GitHub Pages : tout est servi sous /laguildedesjoueurs/.
// Tous les liens internes passent par src/lib/url.ts, jamais en dur.
export default defineConfig({
  site: 'https://glbprod.github.io',
  base: '/laguildedesjoueurs',
  // Pages sert des dossiers (duel/index.html) : on aligne les URL dessus
  // pour éviter les redirections 301 et garder un BASE_URL terminé par « / ».
  trailingSlash: 'always',
  build: { format: 'directory' },
});
