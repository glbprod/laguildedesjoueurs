// Jetons attribués à un seul camp (possession : id de fiche → id de camp, ou '').

// Attribuer à celui qui l'a déjà rend le jeton à la table ; à l'autre, le lui reprend.
export function attribuer(possession, id, camp) {
  if (!(id in possession)) return possession;
  return Object.assign({}, possession, { [id]: possession[id] === camp ? '' : camp });
}

// `fiches` : id de fiche → { fixe?, parJeton? }. Un `parJeton` compte tous les jetons
// possédés par le camp, le sien compris.
export function pointsPossession(possession, camp, fiches) {
  const nombre = Object.values(possession).filter((c) => c === camp).length;
  let total = 0;
  for (const [id, regle] of Object.entries(fiches)) {
    if (possession[id] !== camp) continue;
    total += (regle.fixe ?? 0) + (regle.parJeton ?? 0) * nombre;
  }
  return total;
}
