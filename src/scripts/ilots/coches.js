// Îlot « coches » : les cases à cocher d'une liste (blocs `cochable`), mémorisées dans la partie.
import { ouvrir } from '../partie.js';

const racines = document.querySelectorAll('[data-ilot="coches"]');
const parCle = new Map();
for (const racine of racines) {
  const cle = racine.dataset.stockage;
  if (!parCle.has(cle)) parCle.set(cle, []);
  parCle.get(cle).push(racine);
}

for (const [cle, listes] of parCle) {
  const partie = ouvrir(cle);
  const coches = Object.assign({}, partie.brut('coches'));
  for (const liste of listes) {
    for (const c of liste.querySelectorAll('input[data-coche]')) {
      c.checked = coches[c.dataset.coche] === true;
      c.addEventListener('change', () => {
        coches[c.dataset.coche] = c.checked;
        partie.ecrire('coches', coches);
      });
    }
  }
}
