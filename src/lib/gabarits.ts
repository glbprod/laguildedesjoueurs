// Gabarits des textes d'alerte : {camp}, {max}, {somme}, {<id>}.
// Aucune expression n'est évaluée : on remplace des noms, rien d'autre.

// Noms que ni un compteur ni un camp n'ont le droit de porter.
export const MOTS_RESERVES = ['camp', 'max', 'somme'] as const;

export function nomsDeGabarit(texte: string): string[] {
  return [...texte.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
}
