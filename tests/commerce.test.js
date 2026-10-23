import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerCommerce, resumeCommerce } from '../src/scripts/logique/commerce.js';
import { commerce } from './aide.js';

const calcul = (e) => calculerCommerce({ pieces: 0, besoin: {}, mienne: {}, adverse: {}, fixe: {}, ...e }, commerce.ressources, commerce.prixBase, commerce.prixFixe);

test('les 3 exemples du livret (5, 12, 7)', () => {
  assert.deepEqual(commerce.exemples.map((x) => x.total), [5, 12, 7]);
  for (const x of commerce.exemples) assert.equal(calcul(x).total, x.total, x.nom);
});

test('prix fixé à 1 : 2 Pierres, adversaire 3 Pierres → 2', () => {
  assert.equal(calcul({ besoin: { pierre: 2 }, adverse: { pierre: 3 }, fixe: { pierre: true } }).total, 2);
});

test('production suffisante : rien à acheter', () => {
  assert.equal(calcul({ besoin: { bois: 2 }, mienne: { bois: 3 }, adverse: { bois: 4 } }).total, 0);
});

test('production qui couvre tout + 2 pièces : le total affiché est le coût en pièces', () => {
  const r = calcul({ pieces: 2, besoin: { bois: 2 }, mienne: { bois: 3 }, adverse: { bois: 4 } });
  assert.equal(r.total, 2);
  assert.deepEqual(resumeCommerce(r, commerce.libelles), { grand: 'Coût total : 2 pièces', detail: '2 pièces' });
});

test('1 pièce au singulier ; rien à payer', () => {
  assert.equal(resumeCommerce(calcul({ pieces: 1 }), commerce.libelles).grand, 'Coût total : 1 pièce');
  const rien = resumeCommerce(calcul({ besoin: { bois: 1 }, mienne: { bois: 1 } }), commerce.libelles);
  assert.equal(rien.detail, commerce.libelles.rien);
});

test('le détail nomme chaque ressource achetée', () => {
  const r = resumeCommerce(calcul(commerce.exemples[2]), commerce.libelles);
  assert.equal(r.detail, '2 pièces · Verre 1 × 3 = 3 · Papyrus 1 × 2 = 2');
});

test('5 ressources : 3 marron, 2 grises', () => {
  assert.deepEqual(commerce.ressources.map((r) => `${r.id}:${r.famille}`), ['bois:marron', 'pierre:marron', 'argile:marron', 'verre:grise', 'papyrus:grise']);
});
