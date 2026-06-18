import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// Carrega Financeiro.gs num sandbox. O arquivo só TOCA o Sheets dentro de funções
// (SpreadsheetApp/lerAba etc. nunca no topo), então o núcleo puro roda em Node.
const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Financeiro.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

const CATEGORIAS = ['Salários', 'Impostos', 'Contas', 'Matéria-Prima', 'Marketing', 'Financiamento', 'Frete', 'Outros'];

// ---- _parseValorBR: string pt-BR -> número de verdade ----
test('_parseValorBR: vírgula decimal sem milhar (1481,88)', () => {
  assert.equal(ctx._parseValorBR('1481,88'), 1481.88);
});
test('_parseValorBR: ponto de milhar + vírgula decimal (1.234,56)', () => {
  assert.equal(ctx._parseValorBR('1.234,56'), 1234.56);
});
test('_parseValorBR: milhar grande (2.700,52)', () => {
  assert.equal(ctx._parseValorBR('2.700,52'), 2700.52);
});
test('_parseValorBR: zero de propósito (0,00) continua 0', () => {
  assert.equal(ctx._parseValorBR('0,00'), 0);
});
test('_parseValorBR: inteiro sem decimal (150)', () => {
  assert.equal(ctx._parseValorBR('150'), 150);
});
test('_parseValorBR: já número passa direto', () => {
  assert.equal(ctx._parseValorBR(95.5), 95.5);
});
test('_parseValorBR: limpa R$ e espaços', () => {
  assert.equal(ctx._parseValorBR(' R$ 1.000,00 '), 1000);
});
test('_parseValorBR: ponto decimal do input numérico (150.50)', () => {
  assert.equal(ctx._parseValorBR('150.50'), 150.5);
});
test('_parseValorBR: vazio/sujeira vira 0 (não NaN)', () => {
  assert.equal(ctx._parseValorBR(''), 0);
  assert.equal(ctx._parseValorBR('abc'), 0);
  assert.equal(ctx._parseValorBR(null), 0);
});

// ---- _parseDataBR: DD/MM + ano configurável -> Date ----
test('_parseDataBR: 01/02 com ano 2026 -> 2026-02-01', () => {
  const d = ctx._parseDataBR('01/02', 2026);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 1); // fevereiro
  assert.equal(d.getDate(), 1);
});
test('_parseDataBR: 24/03 -> dia/mês corretos', () => {
  const d = ctx._parseDataBR('24/03', 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 24);
});
test('_parseDataBR: aceita DD/MM/AAAA e usa o ano embutido', () => {
  const d = ctx._parseDataBR('05/04/2025', 2026);
  assert.equal(d.getFullYear(), 2025);
  assert.equal(d.getMonth(), 3);
});
test('_parseDataBR: Date entra e Date sai (idempotente)', () => {
  const orig = new Date(2026, 4, 6);
  assert.equal(ctx._parseDataBR(orig, 2026).getTime(), orig.getTime());
});
test('_parseDataBR: ISO do input type=date (2026-06-16)', () => {
  const d = ctx._parseDataBR('2026-06-16', 2026);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 5); // junho
  assert.equal(d.getDate(), 16);
});

// ---- _resolverCategoria: valida contra o enum (sem acento/caixa) ----
test('_resolverCategoria: sem acento casa com o enum (Salarios -> Salários)', () => {
  const r = ctx._resolverCategoria('Salarios', CATEGORIAS);
  assert.equal(r.categoria, 'Salários');
  assert.equal(r.reconhecida, true);
});
test('_resolverCategoria: Materia-Prima casa com Matéria-Prima', () => {
  assert.equal(ctx._resolverCategoria('Materia-Prima', CATEGORIAS).categoria, 'Matéria-Prima');
});
test('_resolverCategoria: fora do enum cai em Outros + reconhecida=false', () => {
  const r = ctx._resolverCategoria('Cerveja', CATEGORIAS);
  assert.equal(r.categoria, 'Outros');
  assert.equal(r.reconhecida, false);
});
test('_resolverCategoria: vazio vira Outros', () => {
  assert.equal(ctx._resolverCategoria('', CATEGORIAS).categoria, 'Outros');
});

// ---- _parseCSV: pt-BR com ; separador ----
test('_parseCSV: lê cabeçalho + linhas como objetos', () => {
  const linhas = ctx._parseCSV('a;b;c\n1;2;3\n4;5;6');
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].a, '1');
  assert.equal(linhas[0].b, '2');
  assert.equal(linhas[0].c, '3');
  assert.equal(linhas[1].c, '6');
});
test('_parseCSV: ignora linhas vazias e \\r (CRLF)', () => {
  const linhas = ctx._parseCSV('a;b\r\n1;2\r\n\r\n');
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].b, '2');
});

// ---- _proximoIdFin: id sequencial por prefixo ----
test('_proximoIdFin: pega o maior + 1 com padStart 4', () => {
  assert.equal(ctx._proximoIdFin('S', ['S-0001', 'S-0007', 'E-0003']), 'S-0008');
});
test('_proximoIdFin: lista vazia começa em 0001', () => {
  assert.equal(ctx._proximoIdFin('E', []), 'E-0001');
});

// ---- _resumirFinanceiro: agregação pro dashboard (só primitivos) ----
const ENTRADAS = [
  { data: new Date(2026, 1, 2), valor: 1000, forma_pagamento: 'Pix' },
  { data: new Date(2026, 1, 4), valor: 500, forma_pagamento: 'Dinheiro' },
  { data: new Date(2026, 2, 3), valor: 2000, forma_pagamento: 'Pix' }
];
const SAIDAS = [
  { data: new Date(2026, 1, 3), valor: 300, categoria: 'Salários' },
  { data: new Date(2026, 1, 10), valor: 200, categoria: 'Marketing' },
  { data: new Date(2026, 2, 5), valor: 100, categoria: 'Contas' }
];

test('_resumirFinanceiro: acumulado (sem filtro) soma tudo e calcula margem', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '', categoria: '' });
  assert.equal(r.acumulado.entrada, 3500);
  assert.equal(r.acumulado.saida, 600);
  assert.equal(r.acumulado.saldo, 2900);
  assert.equal(r.acumulado.margem, 82.9); // 2900/3500
  // sem mês selecionado, período = acumulado
  assert.deepEqual(r.periodo, r.acumulado);
});

test('_resumirFinanceiro: por_mes em ordem cronológica com saldo', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '', categoria: '' });
  assert.equal(r.por_mes.length, 2);
  assert.equal(r.por_mes[0].mes, '2026-02');
  assert.equal(r.por_mes[0].entrada, 1500);
  assert.equal(r.por_mes[0].saida, 500);
  assert.equal(r.por_mes[0].saldo, 1000);
  assert.equal(r.por_mes[1].mes, '2026-03');
  assert.equal(r.por_mes[1].saldo, 1900);
});

test('_resumirFinanceiro: filtro de mês recalcula o período', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '2026-02', categoria: '' });
  assert.equal(r.periodo.entrada, 1500);
  assert.equal(r.periodo.saida, 500);
  assert.equal(r.periodo.saldo, 1000);
  assert.equal(r.periodo.margem, 66.7);
  // acumulado não muda com o filtro
  assert.equal(r.acumulado.entrada, 3500);
});

test('_resumirFinanceiro: saídas por categoria com % (escopo do mês)', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '2026-02', categoria: '' });
  assert.equal(r.saidas_por_categoria[0].categoria, 'Salários');
  assert.equal(r.saidas_por_categoria[0].valor, 300);
  assert.equal(r.saidas_por_categoria[0].pct, 60); // 300/500
  assert.equal(r.saidas_por_categoria[1].categoria, 'Marketing');
  assert.equal(r.saidas_por_categoria[1].pct, 40);
});

test('_resumirFinanceiro: filtro de categoria destaca o total daquela categoria', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '', categoria: 'Marketing' });
  assert.equal(r.categoria_destacada.categoria, 'Marketing');
  assert.equal(r.categoria_destacada.valor, 200);
  assert.equal(r.categoria_destacada.pct, 33.3); // 200/600
});

test('_resumirFinanceiro: meses para o dropdown vêm rotulados e ordenados', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '', categoria: '' });
  assert.equal(r.meses.length, 2);
  assert.equal(r.meses[0].valor, '2026-02');
  assert.equal(r.meses[1].valor, '2026-03');
  assert.equal(r.meses[0].rotulo, 'Fevereiro de 2026');
});

test('_resumirFinanceiro: REGRA DE OURO — nada de Date no retorno, só primitivos', () => {
  const r = ctx._resumirFinanceiro(ENTRADAS, SAIDAS, { ano: 2026, mes: '', categoria: '' });
  assert.equal(typeof r.por_mes[0].rotulo, 'string');
  assert.equal(typeof r.por_mes[0].entrada, 'number');
  assert.equal(typeof r.periodo.margem, 'number');
  JSON.parse(JSON.stringify(r)); // não pode conter nada não-serializável
  // nenhum valor do retorno é instância de Date
  const semData = (o) => Object.values(o).every(v =>
    v == null || typeof v !== 'object' ? !(v instanceof Date)
      : (Array.isArray(v) ? v.every(x => typeof x !== 'object' || semData(x)) : semData(v)));
  assert.ok(semData(r));
});

test('_resumirFinanceiro: vazio não quebra (margem 0, listas vazias)', () => {
  const r = ctx._resumirFinanceiro([], [], { ano: 2026, mes: '', categoria: '' });
  assert.equal(r.acumulado.entrada, 0);
  assert.equal(r.acumulado.margem, 0);
  assert.equal(r.por_mes.length, 0);
  assert.equal(r.saidas_por_categoria.length, 0);
});

// ---- Dashboard explicativo: saldo acumulado, variação, melhor mês, maior categoria, lançamentos ----
const ENT_D = [
  { data: '01/02', valor: 1000, cliente: 'A' },
  { data: '05/03', valor: 2000, cliente: 'B' }
];
const SAI_D = [
  { data: '02/02', valor: 400, categoria: 'Salários', descricao: 'Pgto' },
  { data: '03/02', valor: 100, categoria: 'Contas', descricao: 'Luz' },
  { data: '06/03', valor: 800, categoria: 'Salários', descricao: 'Pgto' }
];
// Fev: entrada 1000, saída 500, saldo 500.  Mar: entrada 2000, saída 800, saldo 1200.
const D = ctx._resumirFinanceiro(ENT_D, SAI_D, { ano: 2026 });

test('dashboard: saldo acumulado é o running total dos meses', () => {
  assert.equal(D.por_mes[0].saldo_acumulado, 500);
  assert.equal(D.por_mes[1].saldo_acumulado, 1700);
});
test('dashboard: melhor mês é o de maior saldo', () => {
  assert.equal(D.melhor_mes.saldo, 1200);
  assert.equal(typeof D.melhor_mes.rotulo, 'string');
});
test('dashboard: variação mês a mês em %', () => {
  assert.equal(D.variacao.tem, true);
  assert.equal(D.variacao.entrada, 100); // (2000-1000)/1000
  assert.equal(D.variacao.saida, 60);    // (800-500)/500
  assert.equal(D.variacao.saldo, 140);   // (1200-500)/500
});
test('dashboard: maior categoria acumulada (todos os meses)', () => {
  assert.equal(D.maior_categoria_acumulada.categoria, 'Salários');
  assert.equal(D.maior_categoria_acumulada.valor, 1200); // 400 + 800
  assert.equal(D.maior_categoria_acumulada.pct, 92.3);   // 1200/1300
});
test('dashboard: lançamentos do escopo, ordenados do mais recente, data como string', () => {
  assert.equal(D.lancamentos.length, 5);
  assert.equal(D.lancamentos[0].data, '06/03/2026'); // mais recente
  assert.equal(typeof D.lancamentos[0].data, 'string');
  assert.equal(D.lancamentos[0].tipo, 'saida');
  assert.equal(D.lancamentos.every(function (l) { return typeof l.data === 'string'; }), true);
});
test('dashboard: lançamentos respeitam o filtro de mês', () => {
  const Dm = ctx._resumirFinanceiro(ENT_D, SAI_D, { ano: 2026, mes: '2026-02' });
  assert.equal(Dm.lancamentos.length, 3); // 1 entrada + 2 saídas de fevereiro
});
