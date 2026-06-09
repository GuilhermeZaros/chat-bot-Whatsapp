import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Migracao.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

test('_colunasFaltando: devolve as esperadas que não estão no real', () => {
  const faltam = ctx._colunasFaltando(['Codigo', 'Nome'], ['Codigo', 'Nome', 'Custo_por_metro']);
  assert.deepEqual(faltam, ['Custo_por_metro']);
});

test('_colunasFaltando: nada falta quando o real já tem tudo', () => {
  const faltam = ctx._colunasFaltando(['Codigo', 'Nome', 'Custo_por_metro'], ['Codigo', 'Nome', 'Custo_por_metro']);
  assert.equal(faltam.length, 0);
});

test('_colunasFaltando: preserva a ordem do esperado', () => {
  const faltam = ctx._colunasFaltando(['Codigo'], ['Codigo', 'A', 'B']);
  assert.deepEqual(faltam, ['A', 'B']);
});
