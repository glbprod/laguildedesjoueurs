# La Guilde des Joueurs

Plateforme d'aides de jeu pour jeux de société, en Astro 7 (sortie statique).
Usage réel : une tablette posée sur la table **pendant** la partie. Ce n'est pas un document à lire avant.
Public : famille et amis de GLB, et élèves de 14-15 ans du club jeux du collège.
Pilote en cours : Duel pour la Terre du Milieu. Ensuite : Horreur à Arkham 3e éd., Star Wars: Unlimited.

## Règles non négociables

1. **Aucune règle de jeu inventée ou complétée de mémoire.** Les textes de règles viennent des sources fournies par GLB. S'il manque une information de règle, s'arrêter et demander. Ne pas combler le vide.
2. **Ne jamais reformuler un module validé.** Un fichier YAML dont `validation.statut: valide` ne voit ses textes modifiés que sur demande explicite. Les modules en `brouillon` peuvent être retouchés, mais signaler chaque changement de sens.
3. **Le site est vu par des élèves.** Les règles sont paraphrasées, jamais recopiées des livrets. Aucun visuel, logo ni illustration d'éditeur. Les schémas sont des SVG originaux.
4. **Lisibilité à table.** Zones tactiles d'au moins 44 px, texte lisible à bout de bras, informations critiques visibles sans défiler.
5. **Tout en français** : interface, commentaires (orientés « pourquoi »), messages de commit. Les identifiants du code sont aussi en français, comme dans le code existant (`modulesDuJeu`, `url`).

## Commandes

- `npm run dev` : serveur local (le site répond sous `/laguildedesjoueurs/`).
- `npm run build` : doit passer avant toute proposition de commit. Une donnée YAML invalide casse le build, c'est voulu.
- `npm run preview` : vérifier le build servi sous le préfixe, comme sur GitHub Pages.

Node 22.12 minimum.

## Architecture

- **Contenu** : `src/content/jeux/<slug>/`
  - `jeu.yaml` : fiche du jeu, avec `modules` qui donne l'ordre de la navigation.
  - `<module>.yaml` : un fichier par module, typé par son champ `type`.
- **Schémas** : `src/content.config.ts`. Deux collections, `jeux` et `modules`. `modules` est une union discriminée sur `type` : mise-en-place, tour, victoire, effets, erreurs, animateur.
  - Ajouter un type de module = ajouter un membre à l'union, puis un composant dans `src/components/modules/`.
- **Données** : jamais codées en dur dans les scripts ou les composants. Tout texte de jeu vit dans le YAML.
- **Liens internes** : toujours via `url()` de `src/lib/url.ts`. Jamais de chemin absolu en dur commençant par `/` : le site est servi sous `/laguildedesjoueurs/`, avec `trailingSlash: 'always'`.
- **Modules d'un jeu** : `modulesDuJeu(slug)` de `src/lib/jeux.ts`. Il échoue au build si `jeu.yaml` cite un fichier absent.
- **Îlots interactifs** : vanilla JS dans `src/scripts/`, chargés par des balises `<script>` dans les composants `.astro`. Pas de framework client (ni React, ni Preact…).
  - Modules réutilisables entre jeux : onglets, compteurs et pistes de victoire, flashcards à répétition espacée.
- **Thème** : un fichier `src/styles/themes/<theme>.css` par jeu, qui ne définit que des tokens CSS (couleurs, typographies). Structure et composants communs dans `src/styles/base.css`.
- **État local** : localStorage toujours entouré de try/catch, avec un rendu correct si le stockage est vide ou indisponible.
  - Clés préfixées `guilde:<slug>:` (ex. `guilde:duel:courses`), car l'origine `glbprod.github.io` est partagée avec les autres repos.
  - Toujours un bouton « Nouvelle partie ».
- **Polices** : Fontsource, hébergées dans le repo. Aucune ressource tierce chargée à l'exécution (ni CDN, ni Google Fonts).
- **Accessibilité** : rôles ARIA sur les onglets, `:focus-visible` marqué, contraste suffisant sur les deux thèmes.

## Déploiement et PWA

- GitHub Pages via GitHub Actions (`withastro/action`), repo `glbprod/laguildedesjoueurs`.
- PWA : **pas encore en place**, l'approche est à valider par GLB.
  - Ne pas installer `@vite-pwa/astro` : il est incompatible avec Astro 7.
  - Piste envisagée : `workbox-build` (`generateSW`) en postbuild sur `dist/`, avec un manifeste statique dans `public/`.

## Hors périmètre du pilote

Le dispositif « Sauron IA » (bulletin de tour, niveaux de l'Œil) n'est pas à construire maintenant. Ne rien faire qui l'empêcherait plus tard : il deviendra un type de module de plus.

## Façon de travailler

- Étapes courtes. GLB valide chaque étape avant la suivante. Ne pas enchaîner sur l'étape d'après sans accord.
- Signaler les choix discutables au lieu de les trancher en silence.
- Pas de nouvelle dépendance sans le demander.
- Pas de commit sans demande. Messages en français, au format conventionnel (`feat:`, `fix:`, `refactor:`, `docs:`).
- GLB est un développeur expérimenté : pas besoin d'expliquer les bases.
