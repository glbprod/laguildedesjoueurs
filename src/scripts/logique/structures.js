// Géométrie d'une disposition de cartes : des rangées centrées, de haut en bas.
// Pur : le build s'en sert pour dessiner le SVG, les tests pour compter les cartes.

const L = 40, H = 26, ECART = 6, INTERLIGNE = 8, MARGE = 8;

/**
 * @param {{ rangees: number[], faces: string }} structure
 * @returns {{ largeur: number, hauteur: number, cartes: { x: number, y: number, face: string }[],
 *             carte: { largeur: number, hauteur: number } }}
 */
export function geometrieStructure(structure) {
  const plusLarge = Math.max(...structure.rangees);
  const largeur = plusLarge * (L + ECART) - ECART + 2 * MARGE;
  const hauteur = structure.rangees.length * (H + INTERLIGNE) - INTERLIGNE + 2 * MARGE;
  const cartes = [];
  structure.rangees.forEach((n, i) => {
    const y = MARGE + i * (H + INTERLIGNE);
    const x0 = (largeur - (n * (L + ECART) - ECART)) / 2;
    for (let k = 0; k < n; k++) cartes.push({ x: x0 + k * (L + ECART), y, face: structure.faces[i] });
  });
  return { largeur, hauteur, cartes, carte: { largeur: L, hauteur: H } };
}

// Description lue par un lecteur d'écran.
export function descriptionStructure(structure) {
  const lignes = structure.rangees.map((n, i) => `${n} ${structure.faces[i] === 'V' ? 'visibles' : 'cachées'}`);
  const total = structure.rangees.reduce((a, n) => a + n, 0);
  return `${structure.nom} : ${structure.rangees.length} rangées, de haut en bas : ${lignes.join(', ')}. ${total} cartes.`;
}
