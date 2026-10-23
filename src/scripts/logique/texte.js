// Gabarits {nom} des textes du YAML : on remplace des noms, rien d'autre.
export function gab(texte, valeurs) {
  return texte.replace(/\{(\w+)\}/g, (m, cle) => (valeurs[cle] !== undefined ? valeurs[cle] : m));
}

export const borner = (v, min, max) => Math.max(min, Math.min(max, v));

// Casse et accents ignorés : « PIREE » trouve « Pirée ».
export const sansAccents = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
