// Îlot « suivi » : jauges et poursuites de victoire, pour tous les jeux.
// Le balisage est rendu au build (components/modules/Victoire.astro). Ici :
// l'état (localStorage), les classes des boutons et le message d'alerte.

// À incrémenter si la forme de l'état stocké change : un état d'une autre
// version est ignoré, on repart des valeurs de départ.
const VERSION = 1;

/* ---- stockage : toujours entouré de try/catch, le rendu reste correct sans ---- */

function lire(cle) {
  try {
    const brut = localStorage.getItem(cle);
    if (!brut) return null;
    const objet = JSON.parse(brut);
    if (!objet || objet.v !== VERSION || typeof objet.valeurs !== 'object' || !objet.valeurs) return null;
    return objet.valeurs;
  } catch {
    return null;
  }
}

function ecrire(cle, valeurs) {
  try {
    localStorage.setItem(cle, JSON.stringify({ v: VERSION, valeurs }));
  } catch {
    /* stockage indisponible ou plein : le suivi fonctionne, sans mémoire */
  }
}

function effacer(cle) {
  try {
    localStorage.removeItem(cle);
  } catch {
    /* rien à faire */
  }
}

/* ---- alertes : comparaisons déclaratives, première correspondance retenue ---- */

function comparer(valeur, comparaison, seuil) {
  return comparaison === '<=' ? valeur <= seuil : valeur >= seuil;
}

// lignes : [{ id, nom, valeur }] dans l'ordre du balisage.
function evaluer(config, lignes) {
  const somme = lignes.reduce((total, l) => total + l.valeur, 0);
  const remplir = (texte, ligne) =>
    texte.replace(/\{([^{}]+)\}/g, (_, nom) => {
      if (nom === 'camp') return ligne ? ligne.nom : '';
      if (nom === 'max') return config.max ?? '';
      if (nom === 'somme') return somme;
      const cible = lignes.find((l) => l.id === nom);
      return cible ? cible.valeur : '';
    });

  for (const alerte of config.alertes) {
    const cible = alerte.compteur ?? alerte.camp;
    const candidates = cible ? lignes.filter((l) => l.id === cible) : lignes;
    const ligne = candidates.find((l) => comparer(l.valeur, alerte.comparaison, alerte.seuil));
    if (ligne) return { niveau: alerte.niveau, texte: remplir(alerte.texte, ligne) };
  }
  return { niveau: '', texte: config.defaut ? remplir(config.defaut, null) : '' };
}

/* ---- une instance par module de victoire ---- */

function initialiser(racine) {
  const stockage = racine.dataset.stockage;
  const lignes = [...racine.querySelectorAll('[data-cle]')].map((el) => ({
    el,
    condition: el.closest('[data-condition]').dataset.condition,
    cle: el.dataset.cle,
    depart: Number(el.dataset.depart),
    max: Number(el.dataset.max),
  }));
  const identifiant = (l) => `${l.condition}.${l.cle}`;

  const valeurs = {};
  const stockees = lire(stockage);
  for (const l of lignes) {
    const v = stockees ? stockees[identifiant(l)] : undefined;
    valeurs[identifiant(l)] = Number.isInteger(v) && v >= 0 && v <= l.max ? v : l.depart;
  }

  function afficher() {
    for (const l of lignes) {
      const v = valeurs[identifiant(l)];
      const val = l.el.querySelector('[data-val]');
      if (val) val.textContent = v;
      for (const pas of l.el.querySelectorAll('[data-pas]')) {
        pas.disabled = v + Number(pas.dataset.pas) < 0 || v + Number(pas.dataset.pas) > l.max;
      }
      for (const pip of l.el.querySelectorAll('.pip')) {
        const allume = Number(pip.dataset.n) <= v;
        pip.classList.toggle('on', allume);
        pip.setAttribute('aria-pressed', String(allume));
      }
    }

    for (const section of racine.querySelectorAll('[data-condition][data-config]')) {
      let config;
      try {
        config = JSON.parse(section.dataset.config);
      } catch {
        continue;
      }
      const siennes = lignes
        .filter((l) => l.condition === section.dataset.condition)
        .map((l) => ({ id: l.cle, nom: l.el.dataset.nom, valeur: valeurs[identifiant(l)] }));
      const { niveau, texte } = evaluer(config, siennes);
      const message = section.querySelector('[data-message]');
      message.className = niveau ? `alerte ${niveau}` : 'alerte';
      // On ne réécrit que si le texte change : sinon le lecteur d'écran répète.
      if (message.textContent !== texte) message.textContent = texte;
    }
  }

  racine.addEventListener('click', (e) => {
    const bouton = e.target.closest('button');
    if (!bouton || !racine.contains(bouton)) return;

    if (bouton.matches('[data-nouvelle-partie]')) {
      for (const l of lignes) valeurs[identifiant(l)] = l.depart;
      effacer(stockage);
      afficher();
      return;
    }

    const ligne = lignes.find((l) => l.el.contains(bouton));
    if (!ligne) return;
    const id = identifiant(ligne);
    if (bouton.matches('[data-pas]')) {
      valeurs[id] = Math.max(0, Math.min(ligne.max, valeurs[id] + Number(bouton.dataset.pas)));
    } else if (bouton.matches('.pip')) {
      // Toucher la pastille déjà atteinte la retire d'un cran.
      const n = Number(bouton.dataset.n);
      valeurs[id] = valeurs[id] === n ? n - 1 : n;
    } else {
      return;
    }
    ecrire(stockage, valeurs);
    afficher();
  });

  afficher();
}

document.querySelectorAll('[data-suivi]').forEach(initialiser);
