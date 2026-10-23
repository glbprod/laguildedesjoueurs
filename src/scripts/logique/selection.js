// Sélection alternée entre camps : les consignes sont générées à partir des phases.
// Pour un ordre [j1, j2, j2, j1] sur 4 éléments : « j1 en prend 1 », « j2 en prend 2 »,
// « j1 prend la dernière ».

/**
 * @param {{ phases: { libelle: string, nombre: number, ordre: string[] }[], fin: string,
 *           objet: { singulier: string, pluriel: string } }} selection
 * @returns {{ camp?: string, texte: string }[]}
 */
export function etapesSelection(selection) {
  const etapes = [];
  const { objet } = selection;
  for (const phase of selection.phases) {
    etapes.push({ texte: phase.libelle });
    const groupes = [];
    for (const camp of phase.ordre) {
      const g = groupes[groupes.length - 1];
      if (g && g.camp === camp) g.n++;
      else groupes.push({ camp, n: 1 });
    }
    let restant = phase.nombre;
    for (const g of groupes) {
      restant -= g.n;
      etapes.push({
        camp: g.camp,
        texte: restant === 0 ? 'prend la dernière' : `en prend ${g.n} ${g.n > 1 ? objet.pluriel : objet.singulier}`,
      });
    }
  }
  etapes.push({ texte: selection.fin });
  return etapes;
}
