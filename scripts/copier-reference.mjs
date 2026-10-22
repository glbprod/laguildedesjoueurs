// Copie dans dist/reference/ les pages autonomes de reference/ qui doivent être publiées.
//
// Liste explicite, volontairement : seul ce qui est nommé ici part en ligne.
// On ajoute un jeu à la liste seulement quand ses textes sont validés.
//
// Lancé par `npm run build`, après `astro build` (qui vide dist/ avant de le remplir).
// Un fichier listé mais absent fait échouer le build : mieux vaut un déploiement bloqué
// qu'une page manquante découverte à table.
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PAGES_PUBLIEES = [
  'chateaux_aide-de-jeu_v1.html',
  'chateaux_grille-observation_v1.html',
];

const source = fileURLToPath(new URL('../reference/', import.meta.url));
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
