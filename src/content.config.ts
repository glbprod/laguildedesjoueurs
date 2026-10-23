import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { MOTS_RESERVES } from './lib/gabarits';
import { calculerCommerce } from './lib/commerce';

const DOSSIER_JEUX = './src/content/jeux';

/* ------------------------------------------------------------------ */
/* Briques communes                                                    */
/* ------------------------------------------------------------------ */

// Tous les objets du schéma sont stricts (z.strictObject) : une clé mal orthographiée
// (« precision » pour « precisions ») ferait disparaître un texte sans alerte.
// Un nom de champ inconnu casse le build.

// Statut de relecture d'un module. Un module « valide » a été relu par
// GLB contre le livret : ses textes ne sont plus reformulés (principe 2).
const validation = z.strictObject({
  statut: z.enum(['brouillon', 'valide']),
  source: z.string().optional(), // ex. « livret de règles, p. 6 »
});

const identifiant = z.string().regex(/^[a-z0-9-]+$/, 'minuscules, chiffres et tirets');

// Bloc de texte générique : titre + paragraphes et/ou liste + note.
// La légende colorée (couleurs de cartes, types d'action…) est portée par le
// bloc lui-même : sa place dans la page suit celle du bloc, sans index fragile.
const bloc = z.strictObject({
  // Cochable : chaque élément de `liste` devient une case à cocher, mémorisée dans l'état
  // de partie. L'`id` du bloc préfixe les clés mémorisées : il est alors obligatoire.
  id: identifiant.optional(),
  cochable: z.boolean().default(false),
  titre: z.string(),
  paragraphes: z.array(z.string()).default([]),
  liste: z.array(z.string()).default([]),
  note: z.string().optional(),
  legende: z.array(z.strictObject({
    nom: z.string(),
    couleur: z.string(), // nom d'un token CSS du thème, sans « -- » (ex. c-grise)
    texte: z.string(),
  })).default([]),
});

const communs = {
  titre: z.string(),        // libellé dans la navigation du jeu
  validation,
};

/* ------------------------------------------------------------------ */
/* Types de modules (un fichier YAML = un module)                      */
/* ------------------------------------------------------------------ */

// Sélection alternée entre camps (ex. des cartes à se répartir, un camp après l'autre).
// Les consignes sont générées : « <camp> en prend 2 Merveilles », « <camp> prend la dernière ».
const selection = z.strictObject({
  titre: z.string(),
  intro: z.string().optional(),
  objet: z.strictObject({ singulier: z.string(), pluriel: z.string() }), // ce qu'on prend
  phases: z.array(z.strictObject({
    libelle: z.string(),                 // consigne de révélation
    nombre: z.number().int().positive(), // éléments révélés
    ordre: z.array(z.string()).min(1),   // ids de camps, dans l'ordre des prises (autant que `nombre`)
  })).min(1),
  fin: z.string(),
  // Variante sans sélection : un lot fixe d'éléments par camp (ex. pour une première partie).
  lotsFixes: z.strictObject({
    titre: z.string(),
    texte: z.string(),
    lots: z.record(z.string(), z.array(z.string()).min(1)), // id de camp → éléments
    fin: z.string(),
  }).optional(),
});

// Dispositions de cartes en rangées centrées, de haut en bas, avec la face de chaque
// rangée : V (visible) ou C (cachée). Le schéma est dessiné au rendu.
const structures = z.strictObject({
  titre: z.string(),
  intro: z.string(),
  cartes: z.number().int().positive(), // total attendu : contrôle de saisie
  legende: z.string().optional(),      // ex. « V = face visible · C = face cachée »
  note: z.string().optional(),
  liste: z.array(z.strictObject({
    nom: z.string(),
    rangees: z.array(z.number().int().positive()).min(1),
    faces: z.string().regex(/^[VC]+$/, 'V (visible) ou C (cachée), une lettre par rangée'),
  })).min(1),
});

const miseEnPlace = z.strictObject({
  type: z.literal('mise-en-place'),
  ...communs,
  // Points de départ de chaque camp. Les camps eux-mêmes (nom, couleur) vivent
  // dans jeu.yaml ; `camp` est un id de ce fichier, vérifié par lib/coherence.ts.
  titreCamps: z.string().optional(),
  departs: z.array(z.strictObject({
    camp: z.string(),
    points: z.array(z.string()),
  })).default([]),
  schema: z.string().optional(), // nom du composant SVG original
  blocs: z.array(bloc),
  // Après les blocs, dans cet ordre : sélection, puis structures.
  selection: selection.optional(),
  structures: structures.optional(),
});

// Alerte déclarative d'un suivi. Aucune expression : une comparaison, un seuil.
// Les alertes sont évaluées dans l'ordre, la première qui correspond est
// retenue ; sinon `defaut`. Cible :
//   - `compteur` : la valeur de ce compteur (poursuite) ;
//   - `camp`     : la valeur de ce camp (jauge par camp) ;
//   - ni l'un ni l'autre : n'importe quelle valeur du suivi (le premier camp
//     qui correspond fournit alors {camp}).
// Gabarits du texte : {camp}, {max}, {somme}, {<id de compteur ou de camp>}.
const alerte = z.strictObject({
  compteur: z.string().optional(),
  camp: z.string().optional(),
  comparaison: z.enum(['<=', '>=']),
  seuil: z.number(),
  niveau: z.enum(['chaud', 'gagne']),
  texte: z.string(),
});

const alertes = {
  alertes: z.array(alerte).default([]),
  defaut: z.string().optional(), // message quand aucune alerte ne correspond
};

/* ---- Nouveaux suivis de victoire ---- */
// Chaque suivi est générique : il ne connaît ni le jeu ni ses règles, seulement
// une mécanique (marqueur sur une piste, symboles à réunir, jetons attribués,
// points à additionner). Les textes et les nombres viennent du YAML.

// Piste à deux sens entre deux camps (ex. un marqueur qu'on pousse vers la base
// adverse). Les zones, du centre vers l'extrémité, sont les mêmes de chaque côté.
// Gabarits des messages (vérifiés par lib/coherence.ts) :
//   centre : aucun ; zone : {cases} {cote} {zone} {points} {leader} ;
//   extremite et victoire : {perdant} {gagnant} ; jeton : {perdant} {valeur}.
const piste = z.strictObject({
  type: z.literal('piste'),
  // [camp de gauche, camp de droite], ids de jeu.yaml. Une action du premier pousse
  // le marqueur vers la droite, une action du second vers la gauche.
  camps: z.tuple([z.string(), z.string()]),
  // Cases au total, extrémités comprises. C'est un contrôle de saisie : il doit égaler
  // 1 (centre) + 2 × (cases des zones + 1 extrémité), sinon le build échoue.
  casesTotal: z.number().int().positive(),
  pointsCentre: z.number().int().nonnegative().default(0),
  zones: z.array(z.strictObject({
    id: z.string().min(1), // affiché tel quel dans {zone} (ex. « A »)
    cases: z.number().int().positive(),
    points: z.number().int().nonnegative(),
    // Jeton posé sur la zone : appliqué à la première entrée du marqueur, puis retiré.
    jeton: z.strictObject({ valeur: z.number().int().positive() }).optional(),
  })).min(1),
  action: z.string(), // ce qui fait avancer le marqueur, au singulier (ex. « Bouclier »)
  messages: z.strictObject({
    centre: z.string(),
    zone: z.string(),
    extremite: z.string(),
    jeton: z.string().optional(), // requis si une zone porte un jeton
    victoire: z.string(),
    annule: z.string(),
  }),
});

// Symboles à réunir, comptés par camp. Une alerte de paire au passage au seuil,
// et une victoire immédiate à `victoire` symboles différents.
// Gabarits : paire : {symbole} {joueur} ; presque, defaut : {joueur} {n} {max} ;
// victoire : {joueur} {max}. Ici {max} est le nombre de symboles différents à réunir.
const symboles = z.strictObject({
  type: z.literal('symboles'),
  symboles: z.array(z.strictObject({ id: identifiant, nom: z.string() })).min(2),
  plafond: z.number().int().positive().default(9), // valeur maximale d'un compteur
  paire: z.strictObject({ seuil: z.number().int().min(2).default(2), message: z.string() }),
  victoire: z.number().int().min(2),
  // Un jeton attribué (suivi `possession`) qui ajoute un symbole à son propriétaire.
  bonus: z.array(z.strictObject({
    condition: identifiant, // id d'une condition de ce module, de type possession
    fiche: identifiant,     // id d'une fiche du groupe d'effets de cette possession
    symbole: identifiant,
  })).default([]),
  notes: z.array(z.string()).default([]),
  messages: z.strictObject({ presque: z.string(), victoire: z.string(), defaut: z.string() }),
});

// Jetons d'un groupe d'effets, chacun attribué à un seul camp (ou à personne).
const possession = z.strictObject({
  type: z.literal('possession'),
  groupe: identifiant, // id d'un groupe d'un module effets du même jeu
});

// Décompte final : des points saisis, ou calculés depuis un autre suivi.
//  - saisie     : points entrés à la main ;
//  - lot        : une quantité saisie, `lot` unités = 1 point ;
//  - piste      : points de la zone où se trouve le marqueur, pour le camp qui le pousse ;
//  - possession : points des jetons attribués (`fixe`, ou `parJeton` × jetons possédés).
// Gabarits : points : {joueur} {a} {b} ; departage : {joueur} {a} {x} {y} {categorie} ;
// arret : {condition} {joueur}.
const categorieDecompte = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('saisie'), id: identifiant, nom: z.string(), note: z.string().optional(), couleur: z.string().optional() }),
  z.strictObject({ mode: z.literal('lot'), id: identifiant, nom: z.string(), note: z.string().optional(), lot: z.number().int().positive(), unite: z.string() }),
  z.strictObject({ mode: z.literal('piste'), id: identifiant, nom: z.string(), note: z.string().optional(), condition: identifiant }),
  z.strictObject({
    mode: z.literal('possession'), id: identifiant, nom: z.string(), note: z.string().optional(),
    condition: identifiant,
    fiches: z.record(identifiant, z.strictObject({
      fixe: z.number().int().optional(),
      parJeton: z.number().int().optional(),
    })),
  }),
]);

const decompte = z.strictObject({
  type: z.literal('decompte'),
  categories: z.array(categorieDecompte).min(1),
  // Catégories à comparer, dans l'ordre, si les totaux sont égaux.
  departage: z.array(identifiant).default([]),
  // Conditions de ce module (piste, symboles) dont la victoire immédiate arrête la partie.
  arret: z.array(identifiant).default([]),
  messages: z.strictObject({
    vide: z.string(),
    points: z.string(),
    departage: z.string(),
    partage: z.string(),
    arret: z.string(),
  }),
});

// Jauge : une valeur de 0 à `max`, une par camp (parCamp) ou une seule.
const jauge = z.strictObject({
  type: z.literal('jauge'),
  max: z.number().int().positive(),
  // Défaut résolu au rendu : vrai si le jeu déclare des camps.
  parCamp: z.boolean().optional(),
  ...alertes,
});

// Plusieurs compteurs liés (ex. une poursuite : écart et cases restantes).
const poursuite = z.strictObject({
  type: z.literal('poursuite'),
  compteurs: z.array(z.strictObject({
    id: z.string(),
    libelle: z.string(),
    depart: z.number().int().nonnegative(),
    max: z.number().int().positive().default(30),
  })).min(1),
  ...alertes,
});

// Une condition = un titre, un texte et, le plus souvent, un suivi. Le module `victoire`
// les accepte tous ; le module `tour` n'accepte que les compteurs (jauge, poursuite).
const conditionDe = <S extends z.ZodType>(suivi: S) => z.strictObject({
  id: z.string(),
  titre: z.string(),
  description: z.string(),
  suivi,
});
const conditionVictoire = conditionDe(
  z.discriminatedUnion('type', [jauge, poursuite, piste, symboles, possession, decompte]).optional(),
);
const conditionCompteur = conditionDe(z.discriminatedUnion('type', [jauge, poursuite]));

// Rappel : retrouve, dans un groupe d'un module effets, les fiches portant une étiquette
// et les cite dans une phrase. Gabarits du modèle : {n} (leur nombre) et {liste} (leurs
// noms courts, séparés par des virgules). Un complément cite en dessous une autre fiche.
const rappel = z.strictObject({
  id: identifiant,
  titre: z.string(),
  modele: z.string(),
  groupe: identifiant,   // id d'un groupe d'un module effets du même jeu
  etiquette: z.string(), // étiquette des fiches de ce groupe à citer
  complement: z.strictObject({ groupe: identifiant, fiche: identifiant }).optional(),
});

// Fin de manche : le camp mené choisit qui commence la suivante, d'après la position
// d'un marqueur de piste. Le camp mené est celui du côté duquel se trouve le marqueur
// (`camps[0]` de la piste côté négatif, `camps[1]` côté positif) ; au centre, c'est le
// dernier joueur actif, que l'on indique. Gabarits : mene et centreChoisi : {joueur}.
const finDeManche = z.strictObject({
  titre: z.string(),
  points: z.array(z.string()).min(1),
  // Piste qui décide : fichier d'un module `victoire` du même jeu et id de la condition.
  piste: z.strictObject({ module: z.string(), condition: z.string() }),
  question: z.string(),
  messages: z.strictObject({ mene: z.string(), centre: z.string(), centreChoisi: z.string() }),
});

const tour = z.strictObject({
  type: z.literal('tour'),
  ...communs,
  blocs: z.array(bloc),
  // Après les blocs, dans cet ordre : rappels, suivis, fin de manche, puis `blocsApres`.
  rappels: z.array(rappel).default([]),
  suivis: z.array(conditionCompteur).default([]),
  finDeManche: finDeManche.optional(),
  blocsApres: z.array(bloc).default([]),
});

const victoire = z.strictObject({
  type: z.literal('victoire'),
  ...communs,
  intro: z.string().optional(),
  conditions: z.array(conditionVictoire),
  finDePartie: z.string().optional(),
  // Rappel de ce qu'il faut relever sur le plateau avant de jouer.
  aReporter: z.strictObject({
    titre: z.string(),
    points: z.array(z.string()).min(1),
  }).optional(),
});

const effets = z.strictObject({
  type: z.literal('effets'),
  ...communs,
  groupes: z.array(z.strictObject({
    id: z.string(),
    titre: z.string(),
    // Statut propre au groupe, quand ses sources n'ont pas toutes été relues
    // ensemble (ex. une section du livret validée, une autre non).
    validation: validation.optional(),
    regles: z.array(z.string()).default([]), // en tête : valent pour toutes les fiches
    note: z.string().optional(),
    notes: z.array(z.string()).default([]),  // en pied de groupe
    fiches: z.array(z.strictObject({
      // Identifiant stable, unique dans le module : un autre module pourra désigner la fiche.
      id: z.string().regex(/^[a-z0-9-]+$/, 'minuscules, chiffres et tirets').optional(),
      nom: z.string(),
      nomCourt: z.string().optional(),    // forme abrégée, pour les rappels
      sousTitre: z.string().optional(),
      immediat: z.boolean().default(false),
      etiquettes: z.array(z.string()).default([]), // ex. « rejouer » : sert à retrouver des fiches
      effets: z.array(z.string()).min(1),
      precisions: z.array(z.string()).default([]), // détails qui complètent l'effet
    })),
  })),
  // Paquets du mode entraînement, construits à partir des groupes.
  entrainement: z.strictObject({
    paquets: z.array(z.strictObject({
      id: z.string(),
      libelle: z.string(),
      groupe: z.string(),                           // id d'un groupe ci-dessus
      question: z.string(),
      montre: z.enum(['nom', 'sousTitre']).default('nom'), // face recto
    })),
  }).optional(),
});

// Prix d'achat des ressources d'une carte : un prix de base majoré de ce que produit
// l'adversaire, ou un prix fixe. Les exemples du livret sont recalculés au build.
const commerce = z.strictObject({
  type: z.literal('commerce'),
  ...communs,
  regle: z.string(),
  points: z.array(z.string()).default([]),
  rappels: z.array(z.string()).default([]),
  prixBase: z.number().int().nonnegative(),
  prixFixe: z.number().int().nonnegative(),
  familles: z.array(z.strictObject({
    id: identifiant,
    nom: z.string(),
    couleur: z.string(), // token CSS du thème, sans « -- »
  })).min(1),
  ressources: z.array(z.strictObject({ id: identifiant, nom: z.string(), famille: identifiant })).min(1),
  libelles: z.strictObject({
    pieces: z.string(), besoin: z.string(), mienne: z.string(), adverse: z.string(),
    fixe: z.string(), effacer: z.string(), total: z.string(), rien: z.string(),
  }),
  exemples: z.array(z.strictObject({
    nom: z.string(),
    pieces: z.number().int().nonnegative().default(0),
    besoin: z.record(identifiant, z.number().int().positive()),
    mienne: z.record(identifiant, z.number().int().positive()).default({}),
    adverse: z.record(identifiant, z.number().int().positive()).default({}),
    fixe: z.record(identifiant, z.boolean()).default({}),
    total: z.number().int().nonnegative(),
  })).default([]),
});

const erreurs = z.strictObject({
  type: z.literal('erreurs'),
  ...communs,
  erreurs: z.array(z.strictObject({ erreur: z.string(), correction: z.string() })),
});

const animateur = z.strictObject({
  type: z.literal('animateur'),
  ...communs,
  dureeMinutes: z.number().int().positive(),
  etapes: z.array(z.strictObject({
    minutes: z.number().int().positive(),
    titre: z.string(),
    consignes: z.array(z.string()),
  })),
});

type Condition = z.infer<typeof conditionVictoire>;
type Erreur = (path: (string | number)[], message: string) => void;

// Contrôles internes d'une liste de conditions : celles d'un module `victoire`, ou les
// suivis d'un `tour`. Ce qui dépend de jeu.yaml ou d'un autre module (camps, gabarits,
// groupes d'effets, pistes d'un autre fichier) est vérifié par lib/coherence.ts.
function verifierConditions(conditions: Condition[], base: string, erreur: Erreur) {
  const conditionsVues = new Set<string>();
  const parId = new Map(conditions.map((c) => [c.id, c.suivi]));
  conditions.forEach((c, i) => {
    if (conditionsVues.has(c.id)) erreur([base, i, 'id'], `Identifiant en double : « ${c.id} »`);
    conditionsVues.add(c.id);

    const s = c.suivi;
    if (!s) return;
    const ici = [base, i, 'suivi'];

    if (s.type === 'jauge' || s.type === 'poursuite') {
      const compteurs = new Set<string>();
      if (s.type === 'poursuite') {
        s.compteurs.forEach((k, j) => {
          const chemin = [...ici, 'compteurs', j];
          if ((MOTS_RESERVES as readonly string[]).includes(k.id)) {
            erreur([...chemin, 'id'], `« ${k.id} » est un mot réservé des gabarits`);
          }
          if (compteurs.has(k.id)) erreur([...chemin, 'id'], `Compteur en double : « ${k.id} »`);
          compteurs.add(k.id);
          if (k.depart > k.max) erreur([...chemin, 'depart'], `Départ (${k.depart}) supérieur au max (${k.max})`);
        });
      }
      s.alertes.forEach((a, j) => {
        const chemin = [...ici, 'alertes', j];
        if (a.compteur !== undefined && a.camp !== undefined) {
          erreur(chemin, 'Une alerte cite un compteur ou un camp, pas les deux');
        }
        if (s.type === 'poursuite') {
          if (a.compteur === undefined) erreur(chemin, 'Une alerte de poursuite doit citer un compteur');
          else if (!compteurs.has(a.compteur)) erreur([...chemin, 'compteur'], `Compteur inconnu : « ${a.compteur} »`);
          if (a.camp !== undefined) erreur([...chemin, 'camp'], 'Un camp n\'a pas de sens dans une poursuite');
        } else if (a.compteur !== undefined) {
          erreur([...chemin, 'compteur'], 'Un compteur n\'a pas de sens dans une jauge');
        }
      });
    }

    if (s.type === 'piste') {
      if (s.camps[0] === s.camps[1]) erreur([...ici, 'camps'], 'Les deux camps d\'une piste doivent différer');
      const zones = new Set<string>();
      s.zones.forEach((z, j) => {
        if (zones.has(z.id)) erreur([...ici, 'zones', j, 'id'], `Zone en double : « ${z.id} »`);
        zones.add(z.id);
      });
      const attendu = 1 + 2 * (s.zones.reduce((t, z) => t + z.cases, 0) + 1);
      if (s.casesTotal !== attendu) {
        erreur([...ici, 'casesTotal'], `casesTotal vaut ${s.casesTotal}, les zones donnent ${attendu} (1 + 2 × (zones + extrémité))`);
      }
      if (s.zones.some((z) => z.jeton) && s.messages.jeton === undefined) {
        erreur([...ici, 'messages', 'jeton'], 'Une zone porte un jeton : le message « jeton » est requis');
      }
    }

    if (s.type === 'symboles') {
      const ids = new Set<string>();
      s.symboles.forEach((y, j) => {
        if (ids.has(y.id)) erreur([...ici, 'symboles', j, 'id'], `Symbole en double : « ${y.id} »`);
        ids.add(y.id);
      });
      if (s.victoire > s.symboles.length) {
        erreur([...ici, 'victoire'], `${s.victoire} symboles différents demandés, ${s.symboles.length} existent`);
      }
      s.bonus.forEach((b, j) => {
        const chemin = [...ici, 'bonus', j];
        if (!ids.has(b.symbole)) erreur([...chemin, 'symbole'], `Symbole inconnu : « ${b.symbole} »`);
        if (parId.get(b.condition)?.type !== 'possession') {
          erreur([...chemin, 'condition'], `« ${b.condition} » n'est pas une condition de type possession`);
        }
      });
    }

    if (s.type === 'decompte') {
      const categories = new Set<string>();
      s.categories.forEach((k, j) => {
        const chemin = [...ici, 'categories', j];
        if (categories.has(k.id)) erreur([...chemin, 'id'], `Catégorie en double : « ${k.id} »`);
        categories.add(k.id);
        if (k.mode === 'piste' && parId.get(k.condition)?.type !== 'piste') {
          erreur([...chemin, 'condition'], `« ${k.condition} » n'est pas une condition de type piste`);
        }
        if (k.mode === 'possession') {
          if (parId.get(k.condition)?.type !== 'possession') {
            erreur([...chemin, 'condition'], `« ${k.condition} » n'est pas une condition de type possession`);
          }
          Object.entries(k.fiches).forEach(([fiche, v]) => {
            if (v.fixe === undefined && v.parJeton === undefined) {
              erreur([...chemin, 'fiches', fiche], 'Ni « fixe » ni « parJeton » : la fiche ne rapporte rien');
            }
          });
        }
      });
      s.departage.forEach((id, j) => {
        if (!categories.has(id)) erreur([...ici, 'departage', j], `Catégorie inconnue : « ${id} »`);
      });
      s.arret.forEach((id, j) => {
        const t = parId.get(id)?.type;
        if (t !== 'piste' && t !== 'symboles') {
          erreur([...ici, 'arret', j], `« ${id} » n'est pas une condition de type piste ou symboles`);
        }
      });
    }
  });
}

// Nouveau type de module (ex. accompagnement Sauron IA) = un membre de plus ici.
const module = z
  .discriminatedUnion('type', [miseEnPlace, tour, victoire, effets, commerce, erreurs, animateur])
  .superRefine((m, ctx) => {
    const erreur = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    // Intégrité interne : identifiants uniques (une référence resterait ambiguë).
    if (m.type === 'effets') {
      const groupes = new Set<string>();
      const fiches = new Set<string>();
      m.groupes.forEach((g, i) => {
        if (groupes.has(g.id)) erreur(['groupes', i, 'id'], `Groupe en double : « ${g.id} »`);
        groupes.add(g.id);
        g.fiches.forEach((f, j) => {
          if (f.id === undefined) return;
          if (fiches.has(f.id)) erreur(['groupes', i, 'fiches', j, 'id'], `Fiche en double : « ${f.id} »`);
          fiches.add(f.id);
        });
      });
    }

    // Intégrité interne : un paquet d'entraînement pointe vers un groupe existant.
    if (m.type === 'effets' && m.entrainement) {
      const ids = new Set(m.groupes.map((g) => g.id));
      m.entrainement.paquets.forEach((p, i) => {
        if (!ids.has(p.groupe)) {
          erreur(['entrainement', 'paquets', i, 'groupe'], `Groupe inconnu : « ${p.groupe} »`);
        }
      });
    }

    // Intégrité interne d'un commerce : familles, ressources et exemples cohérents.
    if (m.type === 'commerce') {
      const familles = new Set<string>();
      m.familles.forEach((f, i) => {
        if (familles.has(f.id)) erreur(['familles', i, 'id'], `Famille en double : « ${f.id} »`);
        familles.add(f.id);
      });
      const ressources = new Set<string>();
      m.ressources.forEach((r, i) => {
        if (ressources.has(r.id)) erreur(['ressources', i, 'id'], `Ressource en double : « ${r.id} »`);
        ressources.add(r.id);
        if (!familles.has(r.famille)) erreur(['ressources', i, 'famille'], `Famille inconnue : « ${r.famille} »`);
      });
      m.exemples.forEach((x, i) => {
        for (const champ of ['besoin', 'mienne', 'adverse', 'fixe'] as const) {
          for (const id of Object.keys(x[champ])) {
            if (!ressources.has(id)) erreur(['exemples', i, champ, id], `Ressource inconnue : « ${id} »`);
          }
        }
        const { total } = calculerCommerce(x, m.ressources, m.prixBase, m.prixFixe);
        if (total !== x.total) erreur(['exemples', i, 'total'], `${x.nom} : le calcul donne ${total}, l'exemple annonce ${x.total}`);
      });
    }

    if (m.type === 'victoire') verifierConditions(m.conditions, 'conditions', erreur);

    // Blocs cochables : un `id` obligatoire, unique dans le module (il préfixe les clés mémorisées).
    if (m.type === 'mise-en-place' || m.type === 'tour') {
      const blocs = m.type === 'tour' ? [...m.blocs, ...m.blocsApres] : m.blocs;
      const ids = new Set<string>();
      blocs.forEach((b, i) => {
        if (b.cochable && b.id === undefined) erreur(['blocs', i, 'id'], 'Un bloc cochable doit avoir un id');
        if (b.id === undefined) return;
        if (ids.has(b.id)) erreur(['blocs', i, 'id'], `Bloc en double : « ${b.id} »`);
        ids.add(b.id);
      });
    }

    // Sélection et structures d'une mise en place.
    if (m.type === 'mise-en-place') {
      m.selection?.phases.forEach((ph, i) => {
        if (ph.ordre.length !== ph.nombre) {
          erreur(['selection', 'phases', i, 'ordre'], `${ph.ordre.length} prises pour ${ph.nombre} éléments révélés`);
        }
      });
      const noms = new Set<string>();
      m.structures?.liste.forEach((st, i) => {
        if (noms.has(st.nom)) erreur(['structures', 'liste', i, 'nom'], `Structure en double : « ${st.nom} »`);
        noms.add(st.nom);
        if (st.faces.length !== st.rangees.length) {
          erreur(['structures', 'liste', i, 'faces'], `${st.faces.length} faces pour ${st.rangees.length} rangées`);
        }
        const total = st.rangees.reduce((t, n) => t + n, 0);
        if (total !== m.structures!.cartes) {
          erreur(['structures', 'liste', i, 'rangees'], `${st.nom} : ${total} cartes, ${m.structures!.cartes} attendues`);
        }
      });
    }

    // Compteurs, rappels et fin de manche d'un tour.
    if (m.type === 'tour') {
      verifierConditions(m.suivis, 'suivis', erreur);
      const rappels = new Set<string>();
      m.rappels.forEach((rp, i) => {
        if (rappels.has(rp.id)) erreur(['rappels', i, 'id'], `Rappel en double : « ${rp.id} »`);
        rappels.add(rp.id);
      });
    }
  });

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

// Fiche d'identité d'un jeu : src/content/jeux/<slug>/jeu.yaml → id = <slug>
const jeux = defineCollection({
  loader: glob({
    pattern: '*/jeu.yaml',
    base: DOSSIER_JEUX,
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.strictObject({
    titre: z.string(),
    sousTitre: z.string().optional(),
    auteurs: z.string(),
    editeur: z.string(),
    annee: z.number().int().optional(),
    joueurs: z.string(),
    duree: z.string(),
    theme: z.string(),          // nom du fichier src/styles/themes/<theme>.css
    // Camps ou rôles des joueurs ; liste vide pour un jeu coopératif.
    camps: z.array(z.strictObject({
      id: z.string(),
      nom: z.string(),
      couleur: z.string(), // token CSS du thème, sans « -- » (ex. bien, rouge)
    })).default([]),
    modules: z.array(z.string()).min(1), // ordre d'affichage, par nom de fichier
    // Où l'état de partie est stocké : une clé par module (défaut), ou une clé pour
    // tout le jeu quand ses modules se lisent entre eux (voir lib/stockage.ts).
    stockage: z.enum(['module', 'partie']).default('module'),
    // Faux : le jeu est validé au build mais n'a aucune page ni lien (brouillon, exemples).
    publie: z.boolean().default(true),
  }).superRefine((j, ctx) => {
    const vus = new Set<string>();
    j.camps.forEach((c, i) => {
      if ((MOTS_RESERVES as readonly string[]).includes(c.id)) {
        ctx.addIssue({ code: 'custom', path: ['camps', i, 'id'], message: `« ${c.id} » est un mot réservé des gabarits` });
      }
      if (vus.has(c.id)) {
        ctx.addIssue({ code: 'custom', path: ['camps', i, 'id'], message: `Camp en double : « ${c.id} »` });
      }
      vus.add(c.id);
    });
  }),
});

// Modules d'un jeu : src/content/jeux/<slug>/<module>.yaml → id = <slug>/<module>
const modules = defineCollection({
  loader: glob({
    pattern: ['*/*.yaml', '!*/jeu.yaml'],
    base: DOSSIER_JEUX,
  }),
  schema: module,
});

export const collections = { jeux, modules };
