import type { CollectionEntry } from 'astro:content';
import { nomsDeGabarit } from './gabarits';

// Vérifications qui croisent un module et jeu.yaml : un schéma Zod ne voit
// qu'un fichier à la fois. Échoue au build, avec toutes les erreurs du module.
export function verifierModule(jeu: CollectionEntry<'jeux'>, m: CollectionEntry<'modules'>) {
  const erreurs: string[] = [];
  const camps = new Set(jeu.data.camps.map((c) => c.id));
  const d = m.data;

  if (d.type === 'mise-en-place') {
    d.departs.forEach((p, i) => {
      if (!camps.has(p.camp)) erreurs.push(`departs[${i}].camp : « ${p.camp} » absent des camps de jeu.yaml`);
    });
  }

  if (d.type === 'victoire') {
    for (const c of d.conditions) {
      const s = c.suivi;
      if (!s) continue;
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
