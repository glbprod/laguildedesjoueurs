// Outils communs aux tests : lecture des YAML de 7 Wonders Duel.
// js-yaml est une devDependency : il ne sert qu à lire les YAML dans les tests.
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const DOSSIER = new URL('../src/content/jeux/7wduel/', import.meta.url);
export const charger = (nom) => yaml.load(readFileSync(new URL(`${nom}.yaml`, DOSSIER), 'utf8'));

export const jeu = charger('jeu');
export const miseEnPlace = charger('mise-en-place');
export const tour = charger('tour');
export const commerce = charger('commerce');
export const victoire = charger('victoire');
export const effets = charger('effets');

export const condition = (id) => victoire.conditions.find((c) => c.id === id);
export const groupe = (id) => effets.groupes.find((g) => g.id === id);

// Configuration de la piste militaire, telle que l'îlot la reçoit.
export const configPiste = (() => {
  const s = condition('militaire').suivi;
  return { camps: s.camps, casesTotal: s.casesTotal, pointsCentre: s.pointsCentre, zones: s.zones };
})();
// Découpage de test (3/3/2 cases), indépendant des données du jeu.
export const configTest = {
  camps: ['j1', 'j2'], casesTotal: 19, pointsCentre: 0,
  zones: [{ id: 'A', cases: 3, points: 2 }, { id: 'B', cases: 3, points: 5, jeton: { valeur: 2 } }, { id: 'C', cases: 2, points: 10, jeton: { valeur: 5 } }],
};
