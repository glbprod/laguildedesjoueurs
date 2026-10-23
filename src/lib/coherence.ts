import type { CollectionEntry } from 'astro:content';
import { gabaritsInconnus, nomsDeGabarit } from './gabarits';

// Noms de gabarit autorisés dans les messages des suivis génériques.
const GABARITS_PISTE = {
  centre: [],
  zone: ['cases', 'cote', 'zone', 'points', 'leader'],
  extremite: ['perdant', 'gagnant'],
  jeton: ['perdant', 'valeur'],
  victoire: ['perdant', 'gagnant'],
  annule: [],
} as const;
const GABARITS_SYMBOLES = {
  paire: ['symbole', 'joueur'],
  presque: ['joueur', 'n', 'max'],
  victoire: ['joueur', 'max'],
  defaut: ['joueur', 'n', 'max'],
} as const;
const GABARITS_DECOMPTE = {
  vide: [],
  points: ['joueur', 'a', 'b'],
  departage: ['joueur', 'a', 'x', 'y', 'categorie'],
  partage: [],
  arret: ['condition', 'joueur'],
} as const;

// Vérifications qui croisent un module et jeu.yaml, ou un module et un autre module du
// même jeu : un schéma Zod ne voit qu'un fichier à la fois. Échoue au build, avec toutes
// les erreurs du module. `tous` : les modules du jeu (pour retrouver les groupes d'effets).
export function verifierModule(
  jeu: CollectionEntry<'jeux'>,
  m: CollectionEntry<'modules'>,
  tous: CollectionEntry<'modules'>[],
) {
  const erreurs: string[] = [];
  const camps = new Set(jeu.data.camps.map((c) => c.id));
  const d = m.data;

  if (d.type === 'mise-en-place') {
    d.departs.forEach((p, i) => {
      if (!camps.has(p.camp)) erreurs.push(`departs[${i}].camp : « ${p.camp} » absent des camps de jeu.yaml`);
    });
  }

  if (d.type === 'victoire') {
    // Groupes d'effets du jeu : id du groupe → ids de ses fiches.
    const groupes = new Map<string, Set<string>>();
    for (const e of tous) {
      if (e.data.type !== 'effets') continue;
      for (const g of e.data.groupes) {
        groupes.set(g.id, new Set(g.fiches.flatMap((f) => (f.id ? [f.id] : []))));
      }
    }
    const parId = new Map(d.conditions.map((c) => [c.id, c.suivi]));
    const fichesDe = (condition: string) => {
      const s = parId.get(condition);
      return s?.type === 'possession' ? groupes.get(s.groupe) : undefined;
    };
    const verifierMessages = <T extends Record<string, readonly string[]>>(
      ou: string,
      messages: Partial<Record<keyof T, string | undefined>>,
      autorises: T,
    ) => {
      for (const cle of Object.keys(autorises) as (keyof T)[]) {
        const texte = messages[cle];
        if (texte === undefined) continue;
        for (const nom of gabaritsInconnus(texte, autorises[cle])) {
          erreurs.push(`${ou}.messages.${String(cle)} : gabarit {${nom}} inconnu ou sans objet ici`);
        }
      }
    };

    for (const c of d.conditions) {
      const s = c.suivi;
      if (!s) continue;

      if (s.type === 'piste') {
        s.camps.forEach((id, k) => {
          if (!camps.has(id)) erreurs.push(`${c.id}.camps[${k}] : « ${id} » absent des camps de jeu.yaml`);
        });
        verifierMessages(c.id, s.messages, GABARITS_PISTE);
      } else if (s.type === 'symboles') {
        verifierMessages(c.id, { ...s.messages, paire: s.paire.message }, GABARITS_SYMBOLES);
        s.bonus.forEach((b, k) => {
          const fiches = fichesDe(b.condition);
          if (!fiches) erreurs.push(`${c.id}.bonus[${k}] : groupe d'effets de « ${b.condition} » introuvable dans le jeu`);
          else if (!fiches.has(b.fiche)) erreurs.push(`${c.id}.bonus[${k}].fiche : « ${b.fiche} » absente du groupe d'effets`);
        });
      } else if (s.type === 'possession') {
        const fiches = groupes.get(s.groupe);
        if (!fiches) erreurs.push(`${c.id}.groupe : « ${s.groupe} » absent des modules effets du jeu`);
        else if (fiches.size === 0) erreurs.push(`${c.id}.groupe : les fiches de « ${s.groupe} » n'ont pas d'id`);
      } else if (s.type === 'decompte') {
        verifierMessages(c.id, s.messages, GABARITS_DECOMPTE);
        s.categories.forEach((k, j) => {
          if (k.mode !== 'possession') return;
          const fiches = fichesDe(k.condition);
          if (!fiches) return; // « condition » mal typée : déjà signalé par le schéma
          for (const id of Object.keys(k.fiches)) {
            if (!fiches.has(id)) erreurs.push(`${c.id}.categories[${j}].fiches : « ${id} » absente du groupe d'effets`);
          }
        });
      }

      if (s.type !== 'jauge' && s.type !== 'poursuite') continue;
      const parCamp = s.type === 'jauge' && (s.parCamp ?? camps.size > 0);
      if (s.type === 'jauge' && parCamp && camps.size === 0) {
        erreurs.push(`${c.id} : parCamp demandé, mais jeu.yaml ne déclare aucun camp`);
      }

      // Noms de gabarit valides pour ce suivi.
      const connus = new Set<string>(['somme']);
      if (s.type === 'poursuite') s.compteurs.forEach((k) => connus.add(k.id));
      else {
        connus.add('max');
        if (parCamp) camps.forEach((id) => connus.add(id));
      }
      const verifierTexte = (texte: string, ou: string, avecCamp: boolean) => {
        for (const nom of nomsDeGabarit(texte)) {
          const invalide = nom === 'camp' ? !(avecCamp && parCamp) : !connus.has(nom);
          if (invalide) {
            erreurs.push(`${ou} : gabarit {${nom}} inconnu ou sans objet ici`);
          }
        }
      };

      s.alertes.forEach((a, j) => {
        if (a.camp !== undefined && (!parCamp || !camps.has(a.camp))) {
          erreurs.push(`${c.id}.alertes[${j}].camp : « ${a.camp} » n'est pas un camp de ce suivi`);
        }
        verifierTexte(a.texte, `${c.id}.alertes[${j}].texte`, true);
      });
      // Le message par défaut n'a pas de camp « courant » : {camp} y est interdit.
      if (s.defaut) verifierTexte(s.defaut, `${c.id}.defaut`, false);
    }
  }

  if (erreurs.length > 0) {
    throw new Error(`${m.id} : incohérences avec jeu.yaml\n - ${erreurs.join('\n - ')}`);
  }
}
