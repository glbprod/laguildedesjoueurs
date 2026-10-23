import { getCollection, getEntry } from 'astro:content';
import { verifierModule } from './coherence';

// Modules d'un jeu dans l'ordre déclaré par jeu.yaml.
// Échoue au build si jeu.yaml cite un module absent : pas de page vide en prod.
// Vérifie aussi la cohérence de chaque module avec jeu.yaml (camps, gabarits).
export async function modulesDuJeu(slug: string) {
  const jeu = await getEntry('jeux', slug);
  if (!jeu) throw new Error(`Jeu introuvable : ${slug}`);
  const tous = await getCollection('modules', (m) => m.id.startsWith(`${slug}/`));
  return jeu.data.modules.map((nom) => {
    const m = tous.find((e) => e.id === `${slug}/${nom}`);
    if (!m) throw new Error(`${slug}/jeu.yaml cite « ${nom} », fichier ${nom}.yaml absent`);
    verifierModule(jeu, m, tous);
    return m;
  });
}

// Groupes d'effets d'un jeu, par id : les suivis qui désignent des fiches (possession,
// bonus de symbole, décompte) y retrouvent les noms à afficher.
export async function groupesDEffets(slug: string) {
  const tous = await getCollection('modules', (m) => m.id.startsWith(`${slug}/`));
  const groupes = new Map<string, Extract<(typeof tous)[number]['data'], { type: 'effets' }>['groupes'][number]>();
  for (const e of tous) {
    if (e.data.type !== 'effets') continue;
    for (const g of e.data.groupes) groupes.set(g.id, g);
  }
  return groupes;
}
