# Types de suivi et de module génériques

Note d'architecture, phase 3 du devplan 7 Wonders Duel (schéma). Elle dit ce que sont les nouveaux
types du schéma (`src/content.config.ts`), ce qu'ils lisent, et pourquoi ils ne sont pas
propres à un jeu.

## Principe

Un type décrit une **mécanique**, jamais un jeu. Le YAML apporte les nombres, les noms et
les textes. Le schéma vérifie la forme, `src/lib/coherence.ts` vérifie les références
(camps, groupes d'effets, gabarits), et une donnée invalide casse le build.

Tous les objets du schéma sont stricts : un nom de champ inconnu (`precision` pour
`precisions`) casse le build au lieu de faire disparaître un texte.

## Les types

Les quatre premiers sont des `suivi` d'une condition du module `victoire`. `commerce` est
un module à part.

| Type | Mécanique | Lit | Réutilisable pour |
|---|---|---|---|
| `piste` | Un marqueur à deux sens entre deux camps, découpé en zones (points, jeton à effet unique) avec une extrémité qui met fin à la partie. | camps de `jeu.yaml` | toute piste de tirage à la corde entre deux camps |
| `symboles` | Des symboles comptés par camp, une alerte au passage à une paire, une victoire à N symboles différents, un bonus donné par un jeton. | `possession` | tout jeu où l'on réunit des symboles distincts |
| `possession` | Les jetons d'un groupe d'effets, chacun attribué à un seul camp ou à personne. | groupe d'un module `effets` | tout jeu où des jetons se disputent un à un |
| `decompte` | Des catégories de points (saisie, lot, piste, possession), un départage ordonné, des conditions qui arrêtent la partie. | `piste`, `possession`, `symboles` | tout jeu à décompte final (candidat : Châteaux de Bourgogne) |
| `commerce` | Prix d'une ressource = base + production adverse, ou prix fixe. Les exemples du livret sont recalculés au build. | rien | 7 Wonders Duel seulement |

Honnêteté sur la réutilisation : rien n'est encore utilisé hors 7 Wonders Duel. `decompte`
et `possession` sont les mieux placés (Châteaux de Bourgogne a un décompte final, §5.4 de
ses règles : à confirmer, je n'ai pas vérifié que le type convient). `symboles` correspond
à la victoire par « six Peuples différents » et à la paire de Duel pour la Terre du Milieu,
aujourd'hui saisies comme une simple jauge. Les migrer changerait un module de Duel : ce
n'est pas fait. `piste` et `commerce` sont à confirmer au cas par cas quand les sources des
prochains jeux seront fournies. `commerce` n'est utile qu'à 7 Wonders Duel.

## État partagé entre modules

`jeu.yaml` porte `stockage: module` (défaut, clé `guilde:<slug>:<module>`, comportement
actuel de Duel) ou `stockage: partie` (clé `guilde:<slug>:partie`, une section par suivi).
7 Wonders Duel prend `partie` : le décompte lit la piste et les jetons, les symboles lisent
les jetons. La fonction est `cleStockage` dans `src/lib/stockage.ts`.

## Contrôles faits au build

- **piste :** `casesTotal` égale 1 + 2 × (cases des zones + 1 extrémité) ; deux camps
  différents et présents dans `jeu.yaml` ; zones sans doublon ; message `jeton` requis si
  une zone porte un jeton ; gabarits autorisés.
- **symboles :** `victoire` ne dépasse pas le nombre de symboles ; un bonus vise un symbole
  existant, une condition `possession` et une fiche du groupe d'effets.
- **possession :** le groupe existe dans un module `effets` du jeu et ses fiches ont un `id`.
- **decompte :** chaque catégorie `piste` ou `possession` vise une condition du bon type ;
  les fiches citées existent ; `departage` et `arret` visent des identifiants connus.
- **commerce :** familles et ressources cohérentes, et chaque exemple donne le total annoncé.
- **jeu :** un jeu avec `publie: false` est validé au build mais n'a ni page ni lien. C'est
  ce qu'utilise le jeu d'exemple `src/content/jeux/exemples/`.
- **rendu :** un type de suivi, ou de module, sans composant fait échouer le build.

## Mise en place et tour

Ajouts optionnels aux modules existants. Duel ne s'en sert pas : son YAML est inchangé.

| Où | Champ | Rôle |
|---|---|---|
| `mise-en-place` | `blocs[].cochable` + `id` | Les éléments de la liste deviennent des cases à cocher, mémorisées dans l'état de partie. |
| `mise-en-place` | `selection` | Sélection alternée entre camps : phases (consigne, nombre d'éléments, ordre des camps) et variante `lotsFixes` sans sélection. |
| `mise-en-place` | `structures` | Dispositions de cartes en rangées, avec la face (V ou C) de chaque rangée. Le schéma est dessiné au rendu. |
| `tour` | `suivis` | Compteurs (jauge ou poursuite seulement) : mêmes alertes déclaratives qu'en victoire. |
| `tour` | `rappels` | Retrouve les fiches d'un groupe d'effets portant une étiquette et les cite dans une phrase. |
| `tour` | `finDeManche` | Le camp mené choisit qui commence : il lit la position d'un marqueur de piste dans un module `victoire` du même jeu. |
| `tour` | `blocsApres` | Blocs placés après les rappels, les suivis et la fin de manche. |

Ordre d'affichage d'un `tour` : `blocs`, `rappels`, `suivis`, `finDeManche`, `blocsApres`.
Celui d'une `mise-en-place` : `departs`, `blocs`, `selection`, `structures`.

Contrôles faits au build :
- un bloc cochable a un `id`, unique dans le module ;
- une sélection compte autant de prises que d'éléments révélés ; ses camps existent ; les
  lots fixes couvrent tous les camps ;
- une structure a autant de faces que de rangées, et le total de cartes annoncé ;
- un rappel vise un groupe d'effets du jeu dont au moins une fiche porte l'étiquette ;
- une fin de manche vise une condition de type `piste` d'un module `victoire` du jeu ;
- les gabarits des messages sont ceux autorisés.

## `commerce` : une page à part

Avec une page par module, `commerce` est un module de plein droit : une entrée de plus dans
la navigation de 7 Wonders Duel, à côté de « Un tour ». Rien de plus au schéma.

## Rendu : composants, îlots et logique

Le balisage est rendu au build par des composants Astro ; les îlots (JavaScript vanille,
sans framework) ne font que lire et écrire l'état, poser des classes et écrire les messages.
La règle de jeu vit dans des fonctions pures, partagées par le build, les îlots et les tests.

| Type | Composant | Îlot (`src/scripts/ilots/`) | Logique pure (`src/scripts/logique/`) |
|---|---|---|---|
| `piste` | `Piste.astro` (SVG dessiné au build) | `piste.js` | `piste.js` |
| `symboles` | `Symboles.astro` | `symboles.js` | `symboles.js` |
| `possession` | `Possession.astro` | `possession.js` | `possession.js` |
| `decompte` | `Decompte.astro`, `Saisie.astro` | `decompte.js` | `decompte.js` |
| `commerce` | `Commerce.astro`, `Stepper.astro` | `commerce.js` | `commerce.js` |
| sélection | `Selection.astro` | `selection.js` | `selection.js` |
| structures | `Structures.astro` (SVG au build) | aucun | `structures.js` |
| blocs cochables | `ListeCochable.astro` | `coches.js` | aucune |
| rappels | `Rappel.astro` | aucun | aucune |
| fin de manche | `FinDeManche.astro` | `fin-de-manche.js` | `piste.js` (`quiChoisit`) |
| recherche de fiches | `Effets.astro` | `cartes.js` | `recherche.js` |
| compteurs d'un tour | `Suivi.astro` (extrait de `Victoire.astro`) | `suivi.js` | aucune |

Un script n'est embarqué que par les pages dont un composant le déclare : les pages de Duel
pour la Terre du Milieu n'en reçoivent aucun de plus.

## État de partie

`src/scripts/partie.js` ouvre la partie d'une clé (`guilde:7wduel:partie`) : une instance par
page, une section par îlot, un événement `partie:change` quand une section change. Les îlots
d'une même page s'écoutent par ce biais ; entre deux pages, c'est le localStorage qui porte
l'état. Tout est dans un `try/catch` : sans stockage, la page reste utilisable en mémoire.

Sections : `condition.<id>` pour chaque suivi (le décompte lit `condition.militaire`,
`condition.progres` et `condition.science`), puis `selection`, `coches`, `commerce` et
`suivi` (les compteurs d'un tour). Le coût de la carte en cours (commerce) et la réponse
« qui a joué la dernière carte » ne sont jamais mémorisés.

« Nouvelle partie » est un seul bouton, en deux appuis, en bas de chaque page d'un jeu à
état partagé : il efface la clé et recharge la page, ce qui remet tous les îlots à zéro.

## Tests

`npm test` lance `node --test` sur `tests/` : la logique pure et les données de 7 Wonders
Duel (nombres de fiches, points des Merveilles, jetons Progrès, drapeaux « Rejouer »,
découpage de la piste, exemples du livret). Les tests de données lisent les YAML avec
`js-yaml`, déclaré en `devDependency`.

## Ce que cette note ne couvre pas

- **Le PWA** : l'approche (`workbox-build`) reste à valider.
- **Les données de Duel pour la Terre du Milieu** : ses modules n'ont pas migré vers les
  nouveaux types ; l'idée est consignée plus haut, à discuter.

## Lignes proposées pour le CLAUDE.md (non appliquées)

- Schémas : tous stricts (`z.strictObject`). Un champ inconnu casse le build.
- `jeu.yaml` : `stockage: partie` pour un jeu dont les modules se lisent entre eux ;
  `publie: false` pour valider un jeu sans le publier.
- Commandes : `npm test` (logique pure et données, `node --test`).
- Architecture : la logique de jeu vit dans `src/scripts/logique/` (fonctions pures, testées) ;
  les îlots dans `src/scripts/ilots/` ; l'état partagé dans `src/scripts/partie.js`.
