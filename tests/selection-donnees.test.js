import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etapesSelection } from '../src/scripts/logique/selection.js';
import { filtrerCartes } from '../src/scripts/logique/recherche.js';
import { miseEnPlace, effets, groupe, tour, victoire, jeu } from './aide.js';

const merveilles = groupe('merveilles').fiches;
const progres = groupe('progres').fiches;
const noms = (res) => res.flatMap((g) => g.fiches.map((f) => f.nom)).join(' | ');

test('sélection : 9 étapes, J1 puis J2 puis J1, puis l\'inverse', () => {
  const texte = etapesSelection(miseEnPlace.selection).map((e) => (e.camp ? `${e.camp} ` : '') + e.texte);
  assert.deepEqual(texte, [
    'Révélez 4 Merveilles.', 'j1 en prend 1 Merveille', 'j2 en prend 2 Merveilles', 'j1 prend la dernière',
    'Révélez 4 autres Merveilles.', 'j2 en prend 1 Merveille', 'j1 en prend 2 Merveilles', 'j2 prend la dernière',
    'Chaque joueur pose ses 4 Merveilles en colonne devant lui.',
  ]);
});

test('première partie : les lots fixes', () => {
  const lots = miseEnPlace.selection.lotsFixes.lots;
  assert.deepEqual(lots.j1, ['Les Pyramides', 'Le Grand Phare', "Le Temple d'Artémis", 'La Statue de Zeus']);
  assert.deepEqual(lots.j2, ['Le Circus Maximus', 'Le Pirée', 'La Via Appia', 'Le Colosse']);
});

test('structures : 20 cartes, rangées V/C alternées, V aux deux bouts', () => {
  const st = miseEnPlace.structures;
  assert.equal(st.liste.length, 3);
  for (const s of st.liste) {
    assert.equal(s.rangees.reduce((a, n) => a + n, 0), st.cartes, s.nom);
    assert.equal(s.faces.length, s.rangees.length, s.nom);
    assert.ok(s.faces.startsWith('V') && s.faces.endsWith('V'), s.nom);
    for (let i = 1; i < s.faces.length; i++) assert.notEqual(s.faces[i], s.faces[i - 1], s.nom);
  }
  assert.deepEqual(st.liste.map((s) => s.rangees.join('-')), ['2-3-4-5-6', '6-5-4-3-2', '2-3-4-2-4-3-2']);
});

test('12 Merveilles avec leurs points (§9)', () => {
  const PV = [['Le Circus Maximus', 3], ['Le Colosse', 3], ['Le Grand Phare', 4], ['Les Jardins Suspendus', 3], ['La Grande Bibliothèque', 4],
    ['Le Mausolée', 2], ['Le Pirée', 2], ['Les Pyramides', 9], ['Le Sphinx', 6], ['La Statue de Zeus', 3], ["Le Temple d'Artémis", null], ['La Via Appia', 3]];
  assert.equal(merveilles.length, 12);
  for (const [nom, pts] of PV) {
    const f = merveilles.find((m) => m.nom === nom);
    assert.ok(f, nom);
    assert.equal(f.sousTitre, pts === null ? undefined : `${pts} points`, nom);
  }
});

test('Temple d\'Artémis : pas de sous-titre de points', () => {
  assert.equal(merveilles.find((m) => m.nom === "Le Temple d'Artémis").sousTitre, undefined);
});

test('10 Progrès, 7 Guildes, 21 symboles de cartes ; tout est validé', () => {
  assert.equal(progres.map((f) => f.nom).join(', '), 'Agriculture, Architecture, Économie, Loi, Maçonnerie, Mathématiques, Philosophie, Stratégie, Théologie, Urbanisme');
  assert.equal(groupe('guildes').fiches.length, 7);
  assert.equal(groupe('symboles').fiches.length, 21);
  for (const m of [miseEnPlace, tour, victoire, effets]) assert.equal(m.validation.statut, 'valide');
  for (const g of effets.groupes) assert.equal(g.validation.statut, 'valide', g.id);
  assert.match(victoire.validation.note, /validé par GLB/);
});

test('Données Théologie : drapeau rejouer sur les 5 Merveilles du §9, aucune autre', () => {
  const rejouer = merveilles.filter((m) => m.etiquettes?.includes('rejouer')).map((m) => m.nom).sort();
  assert.deepEqual(rejouer, ['Les Jardins Suspendus', 'Le Pirée', 'Le Sphinx', "Le Temple d'Artémis", 'La Via Appia'].sort());
});

test('Données Théologie : liste du rappel Rejouer', () => {
  const noms5 = merveilles.filter((m) => m.etiquettes?.includes('rejouer')).map((m) => m.nomCourt ?? m.nom);
  assert.equal(noms5.length, 5);
  assert.equal(noms5.join(', '), "Jardins Suspendus, Pirée, Sphinx, Temple d'Artémis, Via Appia");
  const rappel = tour.rappels[0];
  assert.equal(rappel.etiquette, 'rejouer');
  assert.equal(rappel.complement.fiche, 'theologie');
  assert.match(progres.find((f) => f.id === 'theologie').precisions.join(' '), /ne peut pas avoir deux fois cet effet/);
});

test('recherche : « phare », sans casse ni accent, aucun résultat, filtres', () => {
  assert.equal(noms(filtrerCartes(effets.groupes, 'phare', 'tout')), 'Le Grand Phare');
  assert.equal(noms(filtrerCartes(effets.groupes, 'PIREE', 'tout')), 'Le Pirée');
  assert.equal(noms(filtrerCartes(effets.groupes, 'artemis', 'tout')), "Le Temple d'Artémis");
  assert.equal(noms(filtrerCartes(effets.groupes, 'zzzz', 'tout')), '');
  assert.equal(filtrerCartes(effets.groupes, '', 'progres').reduce((a, g) => a + g.fiches.length, 0), 10);
  assert.equal(noms(filtrerCartes(effets.groupes, 'scien', 'guildes')), 'Scientifiques');
  assert.equal(filtrerCartes(effets.groupes, '', 'tout').reduce((a, g) => a + g.fiches.length, 0), 50);
});

test('jeu : 2 camps, une clé de partie, non publié tant que le rendu manque', () => {
  assert.deepEqual(jeu.camps.map((c) => c.id), ['j1', 'j2']);
  assert.equal(jeu.stockage, 'partie');
});

test('structures : géométrie — autant de cartes dessinées que de cartes à disposer', async () => {
  const { geometrieStructure, descriptionStructure } = await import('../src/scripts/logique/structures.js');
  for (const s of miseEnPlace.structures.liste) {
    const g = geometrieStructure(s);
    assert.equal(g.cartes.length, miseEnPlace.structures.cartes, s.nom);
    assert.equal(g.cartes.filter((c) => c.face === 'V').length, s.rangees.filter((_, i) => s.faces[i] === 'V').reduce((a, n) => a + n, 0), s.nom);
    for (const c of g.cartes) assert.ok(c.x >= 0 && c.x + g.carte.largeur <= g.largeur, 'carte dans le cadre');
  }
  assert.equal(descriptionStructure(miseEnPlace.structures.liste[0]),
    'Âge I : 5 rangées, de haut en bas : 2 visibles, 3 cachées, 4 visibles, 5 cachées, 6 visibles. 20 cartes.');
});
