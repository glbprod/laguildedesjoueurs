// Copie dans dist/reference/ les pages autonomes de reference/ qui doivent être publiées.
// La liste (explicite) est dans scripts/pages-reference.mjs.
//
// Lancé par `npm run build`, après `astro build` (qui vide dist/ avant de le remplir).
// Un fichier listé mais absent fait échouer le build : mieux vaut un déploiement bloqué
// qu'une page manquante découverte à table.
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOSSIER_REFERENCE, PAGES_PUBLIEES } from './pages-reference.mjs';

const source = fileURLToPath(DOSSIER_REFERENCE);
const destination = fileURLToPath(new URL('../dist/reference/', import.meta.url));

const manquantes = PAGES_PUBLIEES.filter((nom) => !existsSync(source + nom));
if (manquantes.length) {
  console.error(`copier-reference : fichier(s) listé(s) mais absent(s) de reference/ : ${manquantes.join(', ')}`);
  process.exit(1);
}
if (!existsSync(fileURLToPath(new URL('../dist/', import.meta.url)))) {
  console.error("copier-reference : dist/ n'existe pas. Ce script s'exécute après `astro build`.");
  process.exit(1);
}

// On repart d'un dossier vide pour qu'un relancement ne laisse jamais traîner un ancien fichier.
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const nom of PAGES_PUBLIEES) copyFileSync(source + nom, destination + nom);

console.log(`copier-reference : ${PAGES_PUBLIEES.length} page(s) copiée(s) dans dist/reference/`);
