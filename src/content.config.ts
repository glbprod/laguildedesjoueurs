import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { MOTS_RESERVES } from './lib/gabarits';

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
  // Points de départ de chaque camp. Les camps eux-mêmes (nom, couleur) vivent
  // dans jeu.yaml ; `camp` est un id de ce fichier, vérifié par lib/coherence.ts.
  titreCamps: z.string().optional(),
  departs: z.array(z.object({
    camp: z.string(),
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

// Alerte déclarative d'un suivi. Aucune expression : une comparaison, un seuil.
// Les alertes sont évaluées dans l'ordre, la première qui correspond est
// retenue ; sinon `defaut`. Cible :
//   - `compteur` : la valeur de ce compteur (poursuite) ;
//   - `camp`     : la valeur de ce camp (jauge par camp) ;
//   - ni l'un ni l'autre : n'importe quelle valeur du suivi (le premier camp
//     qui correspond fournit alors {camp}).
// Gabarits du texte : {camp}, {max}, {somme}, {<id de compteur ou de camp>}.
const alerte = z.object({
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

const victoire = z.object({
  type: z.literal('victoire'),
  ...communs,
  intro: z.string().optional(),
  conditions: z.array(z.object({
    id: z.string(),
    titre: z.string(),
    description: z.string(),
    suivi: z.discriminatedUnion('type', [
      // Une valeur de 0 à `max`, une par camp (parCamp) ou une seule.
      z.object({
        type: z.literal('jauge'),
        max: z.number().int().positive(),
        // Défaut résolu au rendu : vrai si le jeu déclare des camps.
        parCamp: z.boolean().optional(),
        ...alertes,
      }),
      // Plusieurs compteurs liés (ex. une poursuite : écart et cases restantes).
      z.object({
        type: z.literal('poursuite'),
        compteurs: z.array(z.object({
          id: z.string(),
          libelle: z.string(),
          depart: z.number().int().nonnegative(),
          max: z.number().int().positive().default(30),
        })).min(1),
        ...alertes,
      }),
    ]).optional(),
  })),
  finDePartie: z.string().optional(),
  // Rappel de ce qu'il faut relever sur le plateau avant de jouer.
  aReporter: z.object({
    titre: z.string(),
    points: z.array(z.string()).min(1),
  }).optional(),
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
    const erreur = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    // Intégrité interne : un paquet d'entraînement pointe vers un groupe existant.
    if (m.type === 'effets' && m.entrainement) {
      const ids = new Set(m.groupes.map((g) => g.id));
      m.entrainement.paquets.forEach((p, i) => {
        if (!ids.has(p.groupe)) {
          erreur(['entrainement', 'paquets', i, 'groupe'], `Groupe inconnu : « ${p.groupe} »`);
        }
      });
    }

    // Intégrité interne d'une victoire : compteurs et alertes cohérents.
    // Ce qui dépend de jeu.yaml (camps, gabarits) est vérifié par lib/coherence.ts.
    if (m.type === 'victoire') {
      const conditions = new Set<string>();
      m.conditions.forEach((c, i) => {
        if (conditions.has(c.id)) erreur(['conditions', i, 'id'], `Identifiant en double : « ${c.id} »`);
        conditions.add(c.id);

        const s = c.suivi;
        if (!s) return;
        const compteurs = new Set<string>();
        if (s.type === 'poursuite') {
          s.compteurs.forEach((k, j) => {
            const chemin = ['conditions', i, 'suivi', 'compteurs', j];
            if ((MOTS_RESERVES as readonly string[]).includes(k.id)) {
              erreur([...chemin, 'id'], `« ${k.id} » est un mot réservé des gabarits`);
            }
            if (compteurs.has(k.id)) erreur([...chemin, 'id'], `Compteur en double : « ${k.id} »`);
            compteurs.add(k.id);
            if (k.depart > k.max) erreur([...chemin, 'depart'], `Départ (${k.depart}) supérieur au max (${k.max})`);
          });
        }
        s.alertes.forEach((a, j) => {
          const chemin = ['conditions', i, 'suivi', 'alertes', j];
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
  schema: z.object({
    titre: z.string(),
    sousTitre: z.string().optional(),
    auteurs: z.string(),
    editeur: z.string(),
    annee: z.number().int().optional(),
    joueurs: z.string(),
    duree: z.string(),
    theme: z.string(),          // nom du fichier src/styles/themes/<theme>.css
    // Camps ou rôles des joueurs ; liste vide pour un jeu coopératif.
    camps: z.array(z.object({
      id: z.string(),
      nom: z.string(),
      couleur: z.string(), // token CSS du thème, sans « -- » (ex. bien, rouge)
    })).default([]),
    modules: z.array(z.string()).min(1), // ordre d'affichage, par nom de fichier
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
