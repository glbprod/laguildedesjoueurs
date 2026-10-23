// @ts-check
import { defineConfig } from 'astro/config';
import { readFile } from 'node:fs/promises';
import { DOSSIER_REFERENCE, PAGES_PUBLIEES } from './scripts/pages-reference.mjs';

const base = '/laguildedesjoueurs';

// En dev, Astro ne lit ni dist/ ni reference/ : sans ceci, les pages autonomes répondent 404
// alors qu'elles existent en ligne. On sert donc, à la même URL, les pages de la liste
// (et elles seules), pour tester en local comme sur GitHub Pages. Le build, lui, passe
// par scripts/copier-reference.mjs.
const servirReference = () => ({
  name: 'servir-reference',
  hooks: {
    'astro:server:setup': ({ server }) => {
      server.middlewares.use(async (req, res, next) => {
        const chemin = decodeURIComponent((req.url ?? '').split('?')[0]);
        // Vite peut ou non avoir retiré le préfixe `base` avant d'arriver ici : on accepte les deux.
        const prefixe = [`${base}/reference/`, '/reference/'].find((p) => chemin.startsWith(p));
        const nom = prefixe ? chemin.slice(prefixe.length) : '';
        if (!PAGES_PUBLIEES.includes(nom)) return next();
        try {
          const contenu = await readFile(new URL(nom, DOSSIER_REFERENCE));
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(contenu);
        } catch {
          next();
        }
      });
    },
  },
});

// Site de projet GitHub Pages : tout est servi sous /laguildedesjoueurs/.
// Tous les liens internes passent par src/lib/url.ts, jamais en dur.
export default defineConfig({
  site: 'https://glbprod.github.io',
  base,
  // Pages sert des dossiers (duel/index.html) : on aligne les URL dessus
  // pour éviter les redirections 301 et garder un BASE_URL terminé par « / ».
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [servirReference()],
});
