// « Nouvelle partie » d'un jeu à état partagé : deux appuis, car un appui isolé sur une
// tablette ne doit rien détruire. Le premier arme le bouton pendant 4 s, le second efface
// la partie et recharge la page, ce qui remet tous les îlots à leur état de départ.
import { effacer } from '../partie.js';

document.querySelectorAll('[data-nouvelle-partie-globale]').forEach((bouton) => {
  const libelle = bouton.textContent;
  let minuteur;
  bouton.addEventListener('click', () => {
    if (bouton.classList.contains('confirme')) {
      clearTimeout(minuteur);
      effacer(bouton.dataset.stockage);
      location.reload();
      return;
    }
    bouton.classList.add('confirme');
    bouton.textContent = bouton.dataset.confirmation;
    minuteur = setTimeout(() => {
      bouton.classList.remove('confirme');
      bouton.textContent = libelle;
    }, 4000);
  });
});
