import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// Carrega Dashboard.gs num sandbox. Só exercitamos a função PURA _resumirDashboard;
// dashboardResumo() depende de lerAba/ABAS (Apps Script) e não é chamada aqui.
const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Dashboard.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

const molduras = [
  { Codigo: 'MOL-001', Nome: 'A', Estoque_atual_m: 10, Estoque_minimo_m: 5, Valor_por_metro: 90 },
  { Codigo: 'MOL-002', Nome: 'B', Estoque_atual_m: 2, Estoque_minimo_m: 5, Valor_por_metro: 50 }
];
const vidros = [
  { Codigo: 'VID-001', Nome: 'V', Estoque_atual_m2: 8, Estoque_minimo_m2: 3, Valor_por_m2: 180 }
];
const historico = [
  { Data_hora: '2026-06-01', Tipo_movimentacao: 'entrada', Categoria: 'moldura', Produto: 'A', Quantidade: 5, Unidade: 'm', Valor: 0 },
  { Data_hora: '2026-06-02', Tipo_movimentacao: 'venda', Categoria: 'vidro', Produto: 'V', Quantidade: 0.4, Unidade: 'm²', Valor: 72 },
  { Data_hora: '2026-06-03', Tipo_movimentacao: 'venda', Categoria: 'moldura', Produto: 'A', Quantidade: 2.6, Unidade: 'm', Valor: 247 }
];

test('_resumirDashboard: conta itens por categoria', () => {
  const r = ctx._resumirDashboard(molduras, vidros, [], [], historico);
  assert.equal(r.totais.moldura, 2);
  assert.equal(r.totais.vidro, 1);
  assert.equal(r.totais.chapa, 0);
  assert.equal(r.totais.espelho, 0);
});

test('_resumirDashboard: valor do estoque = soma de estoque x preço', () => {
  // 10*90 + 2*50 + 8*180 = 900 + 100 + 1440 = 2440
  const r = ctx._resumirDashboard(molduras, vidros, [], [], historico);
  assert.equal(r.valor_estoque, 2440);
});

test('_resumirDashboard: estoque baixo lista itens com estoque <= minimo', () => {
  const r = ctx._resumirDashboard(molduras, vidros, [], [], historico);
  assert.equal(r.estoque_baixo.length, 1);
  assert.equal(r.estoque_baixo[0].codigo, 'MOL-002');
  assert.equal(r.estoque_baixo[0].categoria, 'moldura');
});

test('_resumirDashboard: conta movimentações de venda', () => {
  const r = ctx._resumirDashboard(molduras, vidros, [], [], historico);
  assert.equal(r.num_movimentacoes_venda, 2);
});

test('_resumirDashboard: ultimas movimentações vêm em ordem reversa', () => {
  const r = ctx._resumirDashboard(molduras, vidros, [], [], historico);
  assert.equal(r.ultimas_movimentacoes.length, 3);
  assert.equal(r.ultimas_movimentacoes[0].produto, 'A');     // a última do array
  assert.equal(r.ultimas_movimentacoes[0].tipo, 'venda');
});

test('_resumirDashboard: formata data_hora Date como string (não vaza Date pro google.script.run)', () => {
  // O google.script.run devolve null quando o payload tem objeto Date — então
  // data_hora precisa virar string aqui no servidor.
  const hist = [{ Data_hora: new Date(2026, 5, 1, 14, 30), Tipo_movimentacao: 'venda', Produto: 'X', Quantidade: 1, Unidade: 'm', Valor: 10 }];
  const r = ctx._resumirDashboard([], [], [], [], hist);
  assert.equal(typeof r.ultimas_movimentacoes[0].data_hora, 'string');
  assert.equal(r.ultimas_movimentacoes[0].data_hora, '01/06/2026 14:30');
});

test('_resumirDashboard: aguenta abas e historico vazios', () => {
  const r = ctx._resumirDashboard([], [], [], [], []);
  assert.equal(r.totais.moldura, 0);
  assert.equal(r.totais.vidro, 0);
  assert.equal(r.totais.chapa, 0);
  assert.equal(r.totais.espelho, 0);
  assert.equal(r.valor_estoque, 0);
  assert.equal(r.estoque_baixo.length, 0);
  assert.equal(r.num_movimentacoes_venda, 0);
  assert.equal(r.ultimas_movimentacoes.length, 0);
});
