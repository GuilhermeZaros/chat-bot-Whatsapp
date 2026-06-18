import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// Auth.gs só TOCA Sheets/Cache DENTRO de funções; o núcleo puro roda em Node.
const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Auth.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

const USUARIOS = [
  { email: 'gui@vera.com', senha: 'abc123', nome: 'Gui', ativo: true },
  { email: 'Bruna@Vera.com', senha: 'senha-bruna', nome: 'Bruna', ativo: 'TRUE' },
  { email: 'desligado@vera.com', senha: 'x', nome: 'Ex', ativo: false }
];

test('_acharUsuario: e-mail e senha certos -> ok com nome', () => {
  const r = ctx._acharUsuario(USUARIOS, 'gui@vera.com', 'abc123');
  assert.equal(r.ok, true);
  assert.equal(r.nome, 'Gui');
});
test('_acharUsuario: e-mail é case-insensitive e ignora espaços', () => {
  const r = ctx._acharUsuario(USUARIOS, '  BRUNA@vera.COM ', 'senha-bruna');
  assert.equal(r.ok, true);
  assert.equal(r.nome, 'Bruna');
});
test('_acharUsuario: senha errada -> falha', () => {
  assert.equal(ctx._acharUsuario(USUARIOS, 'gui@vera.com', 'errada').ok, false);
});
test('_acharUsuario: senha é sensível a maiúsculas', () => {
  assert.equal(ctx._acharUsuario(USUARIOS, 'gui@vera.com', 'ABC123').ok, false);
});
test('_acharUsuario: usuário desativado -> falha mesmo com senha certa', () => {
  assert.equal(ctx._acharUsuario(USUARIOS, 'desligado@vera.com', 'x').ok, false);
});
test('_acharUsuario: e-mail inexistente -> falha', () => {
  assert.equal(ctx._acharUsuario(USUARIOS, 'ninguem@vera.com', 'x').ok, false);
});
test('_acharUsuario: senha vazia nunca loga (linha semeada sem senha)', () => {
  const semSenha = [{ email: 'novo@vera.com', senha: '', nome: 'Novo', ativo: true }];
  assert.equal(ctx._acharUsuario(semSenha, 'novo@vera.com', '').ok, false);
});
test('_usuarioAtivo: vazio/TRUE/sim contam como ativo', () => {
  assert.equal(ctx._usuarioAtivo(''), true);
  assert.equal(ctx._usuarioAtivo('TRUE'), true);
  assert.equal(ctx._usuarioAtivo('sim'), true);
});
test('_usuarioAtivo: FALSE/nao/0 desativam', () => {
  assert.equal(ctx._usuarioAtivo('FALSE'), false);
  assert.equal(ctx._usuarioAtivo(false), false);
  assert.equal(ctx._usuarioAtivo('nao'), false);
  assert.equal(ctx._usuarioAtivo(0), false);
});
