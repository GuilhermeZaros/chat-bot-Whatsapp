import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Produtos.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

test('_proximoCodigo: primeiro da categoria quando vazio', () => {
  assert.equal(ctx._proximoCodigo('CHA', []), 'CHA-001');
});

test('_proximoCodigo: incrementa o maior, ignorando outros prefixos', () => {
  assert.equal(ctx._proximoCodigo('MOL', ['MOL-001', 'MOL-015', 'VID-001']), 'MOL-016');
});

test('_proximoCodigo: usa o maior número, não a contagem (pula buracos)', () => {
  assert.equal(ctx._proximoCodigo('VID', ['VID-001', 'VID-009']), 'VID-010');
});
