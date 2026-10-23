import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deplacer, pointsMilitaires, pointsDe, quiChoisit, textePion, zoneDe, demiPiste } from '../src/scripts/logique/piste.js';
import { configPiste, configTest, condition } from './aide.js';

const vide = { pos: 0, pris: [] };
function pousser(etat, camp, fois, config) {
  const journal = [];
  let e = etat;
  for (let i = 0; i < fois; i++) {
    const r = deplacer(e, camp, config);
    if (!r) break;
    journal.push(r.evenements);
    e = { pos: r.pos, pris: r.pris };
  }
  return { etat: e, journal };
}

test('fin de manche : pion côté J1 → J1 choisit ; côté J2 → J2 ; centre → dernier joueur actif', () => {
  const c = configPiste.camps;
  assert.equal(quiChoisit(-3, null, c).choisit, 'j1');
  assert.equal(quiChoisit(4, 'j1', c).choisit, 'j2');
  assert.equal(quiChoisit(0, 'j2', c).choisit, 'j2');
  assert.equal(quiChoisit(0, 'j1', c).choisit, 'j1');
  assert.equal(quiChoisit(0, null, c).choisit, null);
  assert.equal(quiChoisit(0, null, c).raison, 'dernier-actif');
});

test('découpage de test 3/3/2 : jetons et suprématie', () => {
  const { journal, etat } = pousser(vide, 'j1', 9, configTest);
  assert.equal(journal.slice(0, 3).flat().length, 0, '3 Boucliers : aucun jeton');
  assert.deepEqual(journal[3].map((e) => [e.type, e.perdant, e.valeur]), [['jeton', 'j2', 2]], '4e Bouclier : jeton 2');
  assert.equal(journal.slice(4, 6).flat().length, 0);
  assert.deepEqual(journal[6].map((e) => [e.type, e.valeur]), [['jeton', 5]], '7e Bouclier : jeton 5');
  assert.ok(journal[8].some((e) => e.type === 'victoire' && e.gagnant === 'j1'), '9e : suprématie');
  assert.equal(deplacer(etat, 'j1', configTest), null, 'plus de mouvement après la suprématie');
  assert.equal(etat.pris.length, 2);
});

test('retour en arrière sans jeton ; un jeton pris ne se redéclenche pas', () => {
  let a = deplacer({ pos: 4, pris: ['j2-B'] }, 'j2', configTest);
  assert.equal(a.evenements.length, 0);
  const b = deplacer({ pos: a.pos + 1, pris: a.pris }, 'j1', configTest);
  assert.equal(b.evenements.length, 0);
});

test('côté J1 : le jeton B fait perdre J1', () => {
  const { journal } = pousser(vide, 'j2', 4, configTest);
  assert.deepEqual(journal[3].map((e) => [e.perdant, e.cle]), [['j1', 'j1-B']]);
});

test('points : le camp qui pousse les reçoit (découpage de test)', () => {
  assert.equal(pointsDe('j1', 4, configTest), 5);
  assert.equal(pointsDe('j2', 4, configTest), 0);
  assert.equal(pointsDe('j2', -7, configTest), 10);
  assert.equal(pointsDe('j1', -7, configTest), 0);
  assert.equal(pointsDe('j1', 0, configTest) + pointsDe('j2', 0, configTest), 0);
  assert.equal(pointsMilitaires(1, configTest).points, 2);
  assert.equal(pointsMilitaires(9, configTest).etat, 'extremite');
});

test('plateau réel : 2/3/3 cases, points 2/5/10, jetons 2 et 5, 19 cases', () => {
  const z = configPiste.zones;
  assert.deepEqual(z.map((x) => x.cases), [2, 3, 3]);
  assert.deepEqual(z.map((x) => x.points), [2, 5, 10]);
  assert.deepEqual(z.map((x) => x.jeton?.valeur ?? null), [null, 2, 5]);
  assert.equal(1 + 2 * (z.reduce((t, x) => t + x.cases, 0) + 1), configPiste.casesTotal);
  assert.equal(demiPiste(configPiste.casesTotal), 9);
});

test('plateau réel : points aux cases +1 à +8 et côtés', () => {
  const pts = (n) => pointsMilitaires(n, configPiste).points;
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(pts), [2, 2, 5, 5, 5, 10, 10, 10]);
  assert.equal(pointsDe('j1', 3, configPiste) + '/' + pointsDe('j2', 3, configPiste), '5/0');
  assert.equal(pointsDe('j2', -6, configPiste) + '/' + pointsDe('j1', -6, configPiste), '10/0');
});

test('plateau réel : jeton 2 à la 3e case, jeton 5 à la 6e, suprématie à la 9e', () => {
  const { journal } = pousser(vide, 'j1', 9, configPiste);
  const marques = journal.flatMap((evts, i) => evts.map((e) => `${i + 1}:${e.type === 'jeton' ? e.valeur : 'sup'}`));
  assert.deepEqual(marques, ['3:2', '6:5', '9:sup']);
});

test('textes d\'état du marqueur', () => {
  const m = condition('militaire').suivi.messages;
  const nom = (id) => ({ j1: 'Joueur 1', j2: 'Joueur 2' })[id];
  assert.equal(textePion(0, configPiste, m, nom), 'Pion au centre : 0 point militaire.');
  assert.equal(textePion(4, configPiste, m, nom), 'Pion à 4 cases du centre, côté Joueur 2 · zone B · 5 points pour Joueur 1.');
  assert.equal(textePion(-1, configPiste, m, nom), 'Pion à 1 case du centre, côté Joueur 1 · zone A · 2 points pour Joueur 2.');
  assert.equal(textePion(9, configPiste, m, nom), 'Pion dans la capitale de Joueur 2 : suprématie militaire, Joueur 1 gagne la partie.');
});

test('zones : une distance au-delà des zones donne l\'extrémité', () => {
  assert.equal(zoneDe(9, configPiste).type, 'extremite');
  assert.equal(zoneDe(0, configPiste).type, 'centre');
  assert.equal(zoneDe(3, configPiste).zone.id, 'B');
});
