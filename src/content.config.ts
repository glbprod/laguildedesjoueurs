import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const DOSSIER_JEUX = './src/content/jeux';

/* ------------------------------------------------------------------ */
/* Briques communes                                                    */
/* ------------------------------------------------------------------ */

// Statut de relecture d'un module. Un module « valide » a été relu par
// GLB contre le livret : ses textes ne sont plus reformulés (principe 2).
const validation = z.object({
  statut: z.enum(['brouillon', 'valide']),
  source: z.string().optional(), // ex. « livret de règles, p. 6 »
});

// Bloc de texte générique : titre + paragraphes et/ou liste + note.
// La légende colorée (couleurs de cartes, types d'action…) est portée par le
// bloc lui-même : sa place dans la page suit celle du bloc, sans index fragile.
const bloc = z.object({
  titre: z.string(),
  paragraphes: z.array(z.string()).default([]),
  liste: z.array(z.string()).default([]),
  note: z.string().optional(),
  legende: z.array(z.object({
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

const miseEnPlace = z.object({
  type: z.literal('mise-en-place'),
  ...communs,
  // Camps ou rôles des joueurs ; vide pour un jeu coopératif.
  titreCamps: z.string().optional(),
  camps: z.array(z.object({
    id: z.string(),
    nom: z.string(),
    couleur: z.string(), // token CSS du thème, sans « -- » (ex. bien, rouge)
    points: z.array(z.string()),
  })).default([]),
  schema: z.string().optional(), // nom du composant SVG original
  blocs: z.array(bloc),
});

const tour = z.object({
  type: z.literal('tour'),
  ...communs,
  blocs: z.array(bloc),
});

// PROVISOIRE : affiné à l'étape « 3 courses » quand les îlots existeront.
const victoire = z.object({
  type: z.literal('victoire'),
  ...communs,
  intro: z.string().optional(),
  conditions: z.array(z.object({
    id: z.string(),
    titre: z.string(),
    description: z.string(),
    suivi: z.discriminatedUnion('type', [
      z.object({ type: z.literal('jauge'), max: z.number().int().positive() }),
      z.object({
        type: z.literal('poursuite'),
        compteurs: z.array(z.object({
          id: z.string(),
          libelle: z.string(),
          depart: z.number().int().nonnegative(),
        })),
      }),
    ]).optional(),
  })),
  finDePartie: z.string().optional(),
});

const effets = z.object({
  type: z.literal('effets'),
  ...communs,
  groupes: z.array(z.object({
    id: z.string(),
    titre: z.string(),
    note: z.string().optional(),
    fiches: z.array(z.object({
      nom: z.string(),
      sousTitre: z.string().optional(),
      immediat: z.boolean().default(false),
      effets: z.array(z.string()).min(1),
    })),
  })),
  // Paquets du mode entraînement, construits à partir des groupes.
  entrainement: z.object({
    paquets: z.array(z.object({
      id: z.string(),
      libelle: z.string(),
      groupe: z.string(),                           // id d'un groupe ci-dessus
      question: z.string(),
      montre: z.enum(['nom', 'sousTitre']).default('nom'), // face recto
    })),
  }).optional(),
});

const erreurs = z.object({
  type: z.literal('erreurs'),
  ...communs,
  erreurs: z.array(z.object({ erreur: z.string(), correction: z.string() })),
});

const animateur = z.object({
  type: z.literal('animateur'),
  ...communs,
  dureeMinutes: z.number().int().positive(),
  etapes: z.array(z.object({
    minutes: z.number().int().positive(),
    titre: z.string(),
    consignes: z.array(z.string()),
  })),
});

// Nouveau type de module (ex. accompagnement Sauron IA) = un membre de plus ici.
const module = z
  .discriminatedUnion('type', [miseEnPlace, tour, victoire, effets, erreurs, animateur])
  .superRefine((m, ctx) => {
    // Intégrité interne : un paquet d'entraînement pointe vers un groupe existant.
    if (m.type !== 'effets' || !m.entrainement) return;
    const ids = new Set(m.groupes.map((g) => g.id));
    m.entrainement.paquets.forEach((p, i) => {
      if (!ids.has(p.groupe)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entrainement', 'paquets', i, 'groupe'],
          message: `Groupe inconnu : « ${p.groupe} »`,
        });
      }
    });
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
  schema: z.object({
    titre: z.string(),
    sousTitre: z.string().optional(),
    auteurs: z.string(),
    editeur: z.string(),
    annee: z.number().int().optional(),
    joueurs: z.string(),
    duree: z.string(),
    theme: z.string(),          // nom du fichier src/styles/themes/<theme>.css
    modules: z.array(z.string()).min(1), // ordre d'affichage, par nom de fichier
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
