import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// Só exercitamos a função PURA _resumirRelatorios; relatorios() depende de lerAba/ABAS.
const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Relatorios.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

const AGORA = new Date(2026, 5, 14, 12, 0); // 14/06/2026 (domingo) — semana segunda=08/06..domingo=14/06

const produtos = [
  { codigo: 'MOL-001', nome: 'Veneza Dourada', categoria: 'moldura', custo_unitario: 40 },
  { codigo: 'VID-001', nome: 'Vidro Simples 2mm', categoria: 'vidro', custo_unitario: 90 },
  { codigo: 'CHA-001', nome: 'Chapa Eucatex', categoria: 'chapa', custo_unitario: 0 } // sem custo
];

// 3 linhas de uma venda de quadro (mesmo Data_hora) + 1 avulsa, todas em junho/2026.
const dQuadro = new Date(2026, 5, 10, 9, 0);
const historico = [
  { Data_hora: dQuadro, Tipo_movimentacao: 'venda', Categoria: 'moldura', Produto: 'Veneza Dourada', Codigo: 'MOL-001', Quantidade: 2.6, Unidade: 'm', Valor: 247, Cliente: 'Ana' },
  { Data_hora: dQuadro, Tipo_movimentacao: 'venda', Categoria: 'vidro', Produto: 'Vidro Simples 2mm', Codigo: 'VID-001', Quantidade: 0.4, Unidade: 'm²', Valor: 72, Cliente: 'Ana' },
  { Data_hora: dQuadro, Tipo_movimentacao: 'venda', Categoria: 'chapa', Produto: 'Chapa Eucatex', Codigo: 'CHA-001', Quantidade: 0, Unidade: '', Valor: 25, Cliente: 'Ana' },
  { Data_hora: new Date(2026, 5, 12, 14, 0), Tipo_movimentacao: 'venda', Categoria: 'moldura', Produto: 'Veneza Dourada', Codigo: 'MOL-001', Quantidade: 4.0, Unidade: 'm', Valor: 380, Cliente: 'Beto' },
  { Data_hora: new Date(2026, 4, 20, 10, 0), Tipo_movimentacao: 'venda', Categoria: 'moldura', Produto: 'Veneza Dourada', Codigo: 'MOL-001', Quantidade: 1.0, Unidade: 'm', Valor: 95, Cliente: 'Ces' }, // MAIO (fora do mês)
  { Data_hora: new Date(2026, 5, 9, 8, 0), Tipo_movimentacao: 'entrada', Categoria: 'moldura', Produto: 'Veneza Dourada', Codigo: 'MOL-001', Quantidade: 20, Unidade: 'm', Valor: '' } // entrada não conta
];

test('faturamento do mês = soma das vendas de junho (ignora maio e entradas)', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  assert.equal(r.faturamento, 724); // 247 + 72 + 25 + 380
});

test('num_vendas conta transações: o quadro (3 linhas, mesmo Data_hora) = 1 venda', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  assert.equal(r.num_vendas, 2); // quadro(Ana) + avulsa(Beto)
});

test('ticket_medio = faturamento / num_vendas', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  assert.equal(r.ticket_medio, 362); // 724 / 2
});

test('período "tudo" inclui a venda de maio', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'tudo', AGORA);
  assert.equal(r.faturamento, 819); // 724 + 95
});

test('período "semana" (08–14/jun) inclui o quadro (10/jun) e a avulsa (12/jun)', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'semana', AGORA);
  assert.equal(r.faturamento, 724);
});

test('lucro: tem_custo true; conta itens sem custo; soma só os com custo', () => {
  // Mês: moldura 2.6m*40=104 ; moldura 4.0m*40=160 ; pintura(qtd0)=custo0 ; vidro 0.4*90=36
  // faturComCusto = 247+380+25+72 = 724 ; custo = 104+160+0+36 = 300 ; lucro = 424
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  assert.equal(r.lucro.tem_custo, true);
  assert.equal(r.lucro.valor, 424);
  assert.equal(r.lucro.itens_sem_custo, 0);
});

test('lucro: sem nenhum custo cadastrado → tem_custo false', () => {
  const semCusto = produtos.map(p => ({ ...p, custo_unitario: 0 }));
  const r = ctx._resumirRelatorios(historico, semCusto, 'mes', AGORA);
  assert.equal(r.lucro.tem_custo, false);
});

test('por_categoria: valor e quantidade por categoria, com unidade', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  const mol = r.por_categoria.find(c => c.categoria === 'moldura');
  assert.equal(mol.valor, 627);     // 247 + 380
  assert.equal(mol.quantidade, 6.6); // 2.6 + 4.0
  assert.equal(mol.unidade, 'm');
  const vid = r.por_categoria.find(c => c.categoria === 'vidro');
  assert.equal(vid.unidade, 'm²');
});

test('ranking_molduras: agrupa por código e ordena por metros desc', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  assert.equal(r.ranking_molduras[0].nome, 'Veneza Dourada');
  assert.equal(r.ranking_molduras[0].metros, 6.6); // 2.6 + 4.0
  assert.equal(r.ranking_molduras[0].valor, 627);
});

test('serie_tempo: por dia no mês, em ordem, sem vazar Date', () => {
  const r = ctx._resumirRelatorios(historico, produtos, 'mes', AGORA);
  assert.equal(r.serie_tempo[0].rotulo, '10/06'); // string
  assert.equal(typeof r.serie_tempo[0].rotulo, 'string');
  assert.equal(r.serie_tempo[0].valor, 344);      // 247 + 72 + 25 (mesmo dia)
  assert.equal(r.serie_tempo[1].rotulo, '12/06');
  assert.equal(r.serie_tempo[1].valor, 380);
});

test('aguenta histórico e produtos vazios', () => {
  const r = ctx._resumirRelatorios([], [], 'mes', AGORA);
  assert.equal(r.faturamento, 0);
  assert.equal(r.num_vendas, 0);
  assert.equal(r.ticket_medio, 0);
  assert.equal(r.lucro.tem_custo, false);
  assert.equal(r.serie_tempo.length, 0);
});
