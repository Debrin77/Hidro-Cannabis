import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(__dirname, '..', 'js', 'state-torre-logic.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(code, ctx);
const normalizeTorreModoActual = ctx.normalizeTorreModoActual;

test('normalizeTorreModoActual: lechuga y alias lechugas', () => {
  assert.strictEqual(normalizeTorreModoActual('lechuga'), 'lechuga');
  assert.strictEqual(normalizeTorreModoActual('lechugas'), 'lechuga');
});

test('normalizeTorreModoActual: resto de modos válidos', () => {
  assert.strictEqual(normalizeTorreModoActual('mixto'), 'mixto');
  assert.strictEqual(normalizeTorreModoActual('intensivo'), 'intensivo');
  assert.strictEqual(normalizeTorreModoActual('mini'), 'mini');
});

test('normalizeTorreModoActual: basura cae a lechuga', () => {
  assert.strictEqual(normalizeTorreModoActual(''), 'lechuga');
  assert.strictEqual(normalizeTorreModoActual(null), 'lechuga');
  assert.strictEqual(normalizeTorreModoActual('nope'), 'lechuga');
  assert.strictEqual(normalizeTorreModoActual(undefined), 'lechuga');
});
