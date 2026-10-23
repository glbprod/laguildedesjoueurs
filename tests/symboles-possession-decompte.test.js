import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compteursEffectifs, symbolesDifferents, paireAtteinte } from '../src/scripts/logique/symboles.js';
import { attribuer, pointsPossession } from '../src/scripts/logique/possession.js';
import { departager, pointsLot } from '../src/scripts/logique/decompte.js';
import { normaliser } from '../src/scripts/logique/etat.js';
import { condition, groupe } from './aide.js';

const sci = condition('science').suivi;
const idxLoi = sci.symboles.findIndex((s) => s.id === sci.bonus[0].symbole);
const progres = groupe('progres').fiches;
const regles = condition('civil').suivi.categories.find((c) => c.mode === 'possession').fiches;
const poss = (...paires) => Object.assign(Object.fromEntries(progres.map((f) => [f.id, ''])), Object.fromEntries(paires));
const points = (p, camp) => pointsPossession(p, camp, regles);

test('science : symboles différents', () => {
  assert.equal(symbolesDifferents([1, 0, 2, 0, 0, 3, 1]), 4);
  assert.equal(symbolesDifferents([1, 1, 1, 1, 1, 1, 0]), sci.victoire);
});

test('7 symboles nommés, la balance en dernier ; le jeton Loi porte la balance', () => {
  assert.equal(sci.symboles.map((s) => s.nom).join(', '), 'sphère armillaire, roue, cadran solaire, mortier, équerre, plume, balance');
  assert.equal(sci.bonus[0].fiche, 'loi');
  assert.equal(idxLoi, 6);
});

test('Loi : 5 différents sans elle, 6 avec ; paire de balance ; sans Loi compteurs inchangés', () => {
  assert.equal(symbolesDifferents(compteursEffectifs([1, 1, 1, 1, 1, 0, 0], [])), 5);
  assert.equal(symbolesDifferents(compteursEffectifs([1, 1, 1, 1, 1, 0, 0], [idxLoi])), sci.victoire);
  assert.equal(compteursEffectifs([0, 0, 0, 0, 0, 0, 1], [idxLoi])[idxLoi], 2);
  assert.equal(compteursEffectifs([2, 0, 0, 0, 0, 0, 0], []).join(), '2,0,0,0,0,0,0');
});

test('alerte de paire : au passage à 2 seulement', () => {
  assert.equal(paireAtteinte([0, 1], [0, 2], 2), 1);
  assert.equal(paireAtteinte([0, 2], [0, 3], 2), -1, 'pas de nouvelle alerte à 3');
  assert.equal(paireAtteinte([0, 2], [0, 1], 2), -1, 'ni en redescendant');
  assert.equal(paireAtteinte([0, 0, 0, 0, 0, 0, 1], compteursEffectifs([0, 0, 0, 0, 0, 0, 1], [idxLoi]), 2), idxLoi, 'la Loi crée une paire');
});

test('Progrès : Mathématiques avec 1, 3 et 5 jetons = 3, 9, 15', () => {
  assert.equal(points(poss(['mathematiques', 'j1']), 'j1'), 3);
  assert.equal(points(poss(['mathematiques', 'j1'], ['urbanisme', 'j1'], ['strategie', 'j1']), 'j1'), 9);
  assert.equal(points(poss(['mathematiques', 'j2'], ['urbanisme', 'j2'], ['strategie', 'j2'], ['economie', 'j2'], ['architecture', 'j2']), 'j2'), 15);
});

test('Progrès : Mathématiques + Philosophie (+ Agriculture) ; seuls ; adversaire ; aucun', () => {
  assert.equal(points(poss(['mathematiques', 'j1'], ['philosophie', 'j1']), 'j1'), 13);
  assert.equal(points(poss(['mathematiques', 'j1'], ['philosophie', 'j1'], ['agriculture', 'j1']), 'j1'), 20);
  assert.equal(points(poss(['agriculture', 'j1']), 'j1'), 4);
  assert.equal(points(poss(['philosophie', 'j2']), 'j2'), 7);
  assert.equal(points(poss(['mathematiques', 'j2'], ['philosophie', 'j1']), 'j1'), 7, 'les jetons de l\'adversaire ne comptent pas');
  assert.equal(points(poss(), 'j1'), 0);
});

test('exclusivité : cocher pour J2 décoche J1 ; recocher rend le jeton ; id inconnu ignoré', () => {
  let p = attribuer(poss(), 'agriculture', 'j1');
  assert.equal(p.agriculture, 'j1');
  p = attribuer(p, 'agriculture', 'j2');
  assert.equal(p.agriculture, 'j2');
  assert.equal(points(p, 'j1'), 0);
  assert.equal(points(p, 'j2'), 4);
  p = attribuer(p, 'agriculture', 'j2');
  assert.equal(p.agriculture, '');
  assert.equal(Object.keys(attribuer(poss(), 'inconnu', 'j1')).length, 10);
});

test('exclusivité : 10 jetons au plus, tous à J1 puis rien à J2', () => {
  let tous = poss();
  for (const f of progres) tous = attribuer(tous, f.id, 'j1');
  for (const f of progres) { tous = attribuer(tous, f.id, 'j2'); tous = attribuer(tous, f.id, 'j1'); }
  assert.equal(Object.values(tous).filter((v) => v === 'j1').length, 10);
  assert.equal(Object.keys(tous).length, 10);
  assert.equal(Object.values(tous).filter((v) => v === 'j2').length, 0);
});

test('décompte : plus de points gagne ; égalité → bleues ; égalité parfaite → partagée', () => {
  const camps = ['j1', 'j2'];
  const bleues = (a, b) => [{ id: 'bleues', valeurs: { j1: a, j2: b } }];
  assert.equal(departager({ j1: 40, j2: 38 }, camps, bleues(0, 9)).gagnant, 'j1');
  assert.deepEqual(departager({ j1: 40, j2: 40 }, camps, bleues(8, 12)), { gagnant: 'j2', type: 'departage', categorie: 'bleues' });
  assert.equal(departager({ j1: 40, j2: 40 }, camps, bleues(8, 8)).type, 'partage');
});

test('trésor : 1 point par lot complet de 3 pièces', () => {
  assert.equal(pointsLot(10, 3), 3);
  assert.equal(pointsLot(2, 3), 0);
  assert.equal(condition('civil').suivi.categories.find((c) => c.mode === 'lot').lot, 3);
});

test('état : valeurs invalides → défaut ; corps absent → défaut', () => {
  const def = { a: 1, b: { c: true, d: [0, 0] }, e: 'x' };
  assert.deepEqual(normaliser(def, { a: 'zz', b: { c: 3, d: [5, 'q'] }, e: 4 }), { a: 1, b: { c: true, d: [5, 0] }, e: 'x' });
  assert.deepEqual(normaliser(def, null), def);
});
