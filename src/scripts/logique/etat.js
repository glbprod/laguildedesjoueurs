// État de partie : tout ce qui n'a pas la forme attendue retombe sur la valeur par défaut.
// Une sauvegarde ancienne ou abîmée ne doit jamais empêcher la page de s'afficher.
export function normaliser(defaut, brut) {
  if (Array.isArray(defaut)) {
    if (!Array.isArray(brut)) return defaut;
    if (!defaut.length) return brut.filter((x) => typeof x === 'string' || (x && typeof x === 'object')).slice(0, 50);
    return defaut.map((d, i) => normaliser(d, brut[i]));
  }
  if (defaut && typeof defaut === 'object') {
    const source = brut && typeof brut === 'object' ? brut : {};
    const sortie = {};
    for (const k of Object.keys(defaut)) sortie[k] = normaliser(defaut[k], source[k]);
    return sortie;
  }
  if (typeof defaut === 'number') return Number.isFinite(brut) ? brut : defaut;
  if (typeof defaut === 'boolean') return typeof brut === 'boolean' ? brut : defaut;
  if (typeof defaut === 'string') return typeof brut === 'string' ? brut : defaut;
  return defaut;
}
