import { getCollection, getEntry } from 'astro:content';

// Modules d'un jeu dans l'ordre déclaré par jeu.yaml.
// Échoue au build si jeu.yaml cite un module absent : pas de page vide en prod.
export async function modulesDuJeu(slug: string) {
  const jeu = await getEntry('jeux', slug);
  if (!jeu) throw new Error(`Jeu introuvable : ${slug}`);
  const tous = await getCollection('modules', (m) => m.id.startsWith(`${slug}/`));
  return jeu.data.modules.map((nom) => {
    const m = tous.find((e) => e.id === `${slug}/${nom}`);
    if (!m) throw new Error(`${slug}/jeu.yaml cite « ${nom} », fichier ${nom}.yaml absent`);
    return m;
  });
}
