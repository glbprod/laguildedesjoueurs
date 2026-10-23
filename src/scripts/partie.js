// État de partie partagé entre les îlots d'un jeu (jeu.yaml : stockage: partie).
// Une clé `guilde:<slug>:partie`, une section par îlot : le décompte lit la piste et les
// jetons, la fin de manche lit la piste. Le localStorage est toujours entouré de try/catch :
// sans lui, la page reste utilisable, sans mémoire.
import { normaliser } from './logique/etat.js';

// À incrémenter si la forme de l'état stocké change : un état d'une autre version est ignoré.
const VERSION = 1;
const ouvertes = new Map();

function lireDisque(cle) {
  try {
    const brut = localStorage.getItem(cle);
    if (!brut) return {};
    const objet = JSON.parse(brut);
    if (!objet || objet.v !== VERSION || !objet.sections || typeof objet.sections !== 'object') return {};
    return objet.sections;
  } catch {
    return {};
  }
}

function ecrireDisque(cle, sections) {
  try {
    localStorage.setItem(cle, JSON.stringify({ v: VERSION, sections }));
  } catch {
    /* stockage indisponible ou plein : la partie continue en mémoire */
  }
}

// Ouvre la partie d'une clé : une seule instance par page, partagée par tous les îlots.
export function ouvrir(cle) {
  if (ouvertes.has(cle)) return ouvertes.get(cle);
  const sections = lireDisque(cle);
  const partie = {
    // Section ramenée à la forme de `defaut` : une valeur abîmée retombe sur le défaut.
    lire: (nom, defaut) => normaliser(defaut, sections[nom]),
    // Section telle que stockée, pour un dictionnaire dont les clés ne sont pas connues d'avance.
    brut: (nom) => (sections[nom] && typeof sections[nom] === 'object' ? sections[nom] : undefined),
    ecrire(nom, valeur) {
      sections[nom] = valeur;
      ecrireDisque(cle, sections);
      document.dispatchEvent(new CustomEvent('partie:change', { detail: { cle, section: nom } }));
    },
  };
  ouvertes.set(cle, partie);
  return partie;
}

// Appelle `fn(section)` quand l'une des sections citées change (même page, autre îlot).
export function ecouter(sections, fn) {
  document.addEventListener('partie:change', (e) => {
    if (sections.includes(e.detail.section)) fn(e.detail.section);
  });
}

export function effacer(cle) {
  try {
    localStorage.removeItem(cle);
  } catch {
    /* rien à faire */
  }
}
