import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// Carrega Calculo.gs num sandbox — o arquivo não usa nenhuma API do Apps Script,
// então roda puro em Node. Mantém UMA fonte de verdade para a regra de preço.
const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Calculo.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

test('perimetroM: 80x50 = 2.6 m', () => {
  assert.equal(ctx.perimetroM(80, 50), 2.6);
});

test('areaM2: 80x50 = 0.4 m2', () => {
  assert.equal(ctx.areaM2(80, 50), 0.4);
});

test('calcularOrcamento: moldura por perimetro + vidro por area', () => {
  // moldura R$95/m, vidro R$180/m2, quadro 80x50
  const orc = ctx.calcularOrcamento(80, 50, [
    { categoria: 'moldura', nome: 'Veneza Dourada', preco: 95 },
    { categoria: 'vidro', nome: 'Vidro Simples 2mm', preco: 180 }
  ]);
  assert.equal(orc.perimetro_m, 2.6);
  assert.equal(orc.area_m2, 0.4);
  // moldura: 2.6 * 95 = 247 ; vidro: 0.4 * 180 = 72
  assert.equal(orc.itens[0].valor, 247);
  assert.equal(orc.itens[1].valor, 72);
  assert.equal(orc.valor_total, 319);
});

test('calcularOrcamento: ignora preco minimo — cobra sempre o proporcional', () => {
  // 20x20 -> perimetro 0.8m -> 0.8 * 45 = 36 ; mesmo recebendo precoMinimo 50, NAO aplica piso
  const orc = ctx.calcularOrcamento(20, 20, [
    { categoria: 'moldura', nome: 'Linhas Preta', preco: 45, precoMinimo: 50 }
  ]);
  assert.equal(orc.itens[0].valor, 36);
  assert.equal(orc.valor_total, 36);
});

test('calcularOrcamento: objeto alto soma a taxa fixa de pintura da chapa (R$25)', () => {
  // moldura 2.6m * 95 = 247 ; objeto alto soma 25 -> 272
  const orc = ctx.calcularOrcamento(80, 50, [
    { categoria: 'moldura', nome: 'Veneza Dourada', preco: 95, precoMinimo: 80 }
  ], { objetoAlto: true });
  assert.equal(orc.valor_total, 272);
  assert.equal(orc.pintura_chapa, 25);
});

test('calcularOrcamento: sem objeto alto nao soma taxa nem expoe pintura_chapa', () => {
  const orc = ctx.calcularOrcamento(80, 50, [
    { categoria: 'moldura', nome: 'Veneza Dourada', preco: 95, precoMinimo: 80 }
  ]);
  assert.equal(orc.valor_total, 247);
  assert.equal(orc.pintura_chapa, undefined);
});

test('consumoMolduraM: bate com a Calculadora de Molduras — 90x60 perfil 2cm = 328,9cm', () => {
  // perim 3.00 + 8P 0.16 + 4√2P 0.11314 + 8*kerf 0.016 = 3.289
  assert.equal(ctx.consumoMolduraM(90, 60, 2), 3.289);
});

test('consumoMolduraM: 60x90 perfil 3cm = 3.426m', () => {
  // 3.00 + 0.24 + 4√2*0.03 (0.16971) + 0.016 = 3.42571
  assert.equal(ctx.consumoMolduraM(60, 90, 3), 3.426);
});

test('consumoMolduraM: a perda de corte ESCALA com o perfil (triangulos = 4√2 × perfil)', () => {
  // perda de corte = consumo - perimetro - 8P = 4√2P + 8kerf
  const perdaP2 = ctx.consumoMolduraM(60, 90, 2) - 3.0 - 8 * 0.02;
  const perdaP5 = ctx.consumoMolduraM(60, 90, 5) - 3.0 - 8 * 0.05;
  // perfil 5 perde bem mais que perfil 2 (triangulo cresce com o perfil)
  assert.ok(perdaP5 > perdaP2 * 2);
});

test('consumoMolduraM: sem perfil cadastrado cai no perimetro (fallback)', () => {
  assert.equal(ctx.consumoMolduraM(60, 90, 0), 2.6 + 0.4); // = perimetroM(60,90) = 3.0
  assert.equal(ctx.consumoMolduraM(60, 90, ''), 3.0);
});

test('calcularOrcamento: item moldura expoe consumo real; valor segue o perimetro (cobranca intacta)', () => {
  const orc = ctx.calcularOrcamento(60, 90, [
    { categoria: 'moldura', nome: 'Veneza Dourada', preco: 95, perfilCm: 3 }
  ]);
  assert.equal(orc.itens[0].quantidade, 3.0);        // cobrado: perimetro
  assert.equal(orc.itens[0].valor, 285);             // 3.0 * 95 — NAO muda com o consumo
  assert.equal(orc.itens[0].consumo, 3.426);         // baixa: consumo real (modelo calculadora)
});

test('calcularOrcamento: material (vidro) tem consumo = quantidade (area, sem mudanca)', () => {
  const orc = ctx.calcularOrcamento(60, 90, [
    { categoria: 'vidro', nome: 'Vidro Simples 2mm', preco: 180 }
  ]);
  assert.equal(orc.itens[0].consumo, orc.itens[0].quantidade);
});

test('simularServicoMoldura: DÁ — estoque cobre, sobra e sem varas a comprar', () => {
  const r = ctx.simularServicoMoldura(1.216, 30, 50, 2.70);
  assert.equal(r.necessario_m, 36.48);
  assert.equal(r.da, true);
  assert.equal(r.sobra_m, 13.52);
  assert.equal(r.falta_m, 0);
  assert.equal(r.varas_comprar, 0);
  assert.equal(r.max_quadros, 41);          // floor(50 / 1.216)
  assert.equal(r.varas_necessarias, 14);    // ceil(36.48 / 2.70)
});

test('simularServicoMoldura: NÃO DÁ — falta e varas a comprar', () => {
  const r = ctx.simularServicoMoldura(1.216, 30, 30, 2.70);
  assert.equal(r.da, false);
  assert.equal(r.falta_m, 6.48);
  assert.equal(r.sobra_m, 0);
  assert.equal(r.max_quadros, 24);          // floor(30 / 1.216)
  assert.equal(r.varas_comprar, 3);         // ceil(6.48 / 2.70)
});

test('simularServicoMoldura: EXATO — estoque == necessário ainda DÁ, sobra 0', () => {
  const r = ctx.simularServicoMoldura(2, 10, 20, 2.70);
  assert.equal(r.necessario_m, 20);
  assert.equal(r.da, true);
  assert.equal(r.sobra_m, 0);
  assert.equal(r.falta_m, 0);
});

test('simularServicoMoldura: consumo 0 não quebra (sem divisão por zero)', () => {
  const r = ctx.simularServicoMoldura(0, 5, 10, 2.70);
  assert.equal(r.max_quadros, 0);
  assert.equal(r.necessario_m, 0);
  assert.equal(r.da, true);
  assert.equal(r.varas_necessarias, 0);
});

test('simulador: combinado com consumoMolduraM (30× 21×30 perfil 2cm)', () => {
  const consumo = ctx.consumoMolduraM(21, 30, 2); // 1.309
  const r = ctx.simularServicoMoldura(consumo, 30, 60, 2.70);
  assert.equal(consumo, 1.309);
  assert.equal(r.necessario_m, 39.27); // 30 × 1.309
  assert.equal(r.da, true); // 60m de estoque-semente cobre
});

test('estoqueManualM: 1 vara + pedaço 1,30m, perfil 2cm, NÃO desencabeçado → desconta a ponta', () => {
  // 2,70 + 1,30 - (√2×0,02 + 0,002) = 4,00 - 0,0303 = 3,970
  assert.equal(ctx.estoqueManualM(1, 1.30, 2, true, 2.70), 3.970);
});

test('estoqueManualM: pedaço já desencabeçado não desconta', () => {
  assert.equal(ctx.estoqueManualM(1, 1.30, 2, false, 2.70), 4.0);
});

test('estoqueManualM: só varas inteiras (sem pedaço)', () => {
  assert.equal(ctx.estoqueManualM(2, 0, 2, false, 2.70), 5.4);
});

test('estoqueManualM: checkbox marcado mas sem pedaço não desconta nada', () => {
  assert.equal(ctx.estoqueManualM(2, 0, 2, true, 2.70), 5.4);
});

test('simularServicoManual: DÁ — 3 quadros 21×30 perfil 2cm, 1 vara + pedaço 1,30 (não desenc.)', () => {
  const r = ctx.simularServicoManual(2, 3, 21, 30, 1, 1.30, true);
  assert.equal(r.manual, true);
  assert.equal(r.consumo_unitario_m, 1.309);
  assert.equal(r.necessario_m, 3.927);   // 3 × 1.309
  assert.equal(r.estoque_m, 3.970);      // 4.00 − 0.030
  assert.equal(r.da, true);              // 3.970 ≥ 3.927
});

test('simularServicoManual: NÃO DÁ — 4 quadros estouram o disponível, 1 vara a comprar', () => {
  const r = ctx.simularServicoManual(2, 4, 21, 30, 1, 1.30, true);
  assert.equal(r.da, false);
  assert.equal(r.necessario_m, 5.236);   // 4 × 1.309
  assert.equal(r.varas_comprar, 1);      // falta 1.266 → ceil(1.266 / 2.70)
});

test('_distribuirValor: sem override mantem os valores calculados', () => {
  const r = ctx._distribuirValor([247, 72], 319, 0);
  assert.equal(r[0], 247);
  assert.equal(r[1], 72);
});

test('_distribuirValor: override menor distribui proporcional e soma o cobrado', () => {
  const r = ctx._distribuirValor([247, 72], 319, 300);
  assert.equal(r[0], 232.29);            // 247 * 300/319
  assert.equal(r[1], 67.71);             // última linha absorve o arredondamento
  assert.equal(Number((r[0] + r[1]).toFixed(2)), 300);
});

test('_distribuirValor: override maior tambem soma exatamente o cobrado', () => {
  const r = ctx._distribuirValor([247, 72, 30], 349, 400);
  assert.equal(r.length, 3);
  assert.equal(Number((r[0] + r[1] + r[2]).toFixed(2)), 400);
});

test('_distribuirValor: item unico com override vira o valor cobrado', () => {
  const r = ctx._distribuirValor([247], 247, 300);
  assert.equal(r[0], 300);
});

test('_montarValoresQuadro: venda normal (sem taxa, sem override) mantém os valores', () => {
  const r = ctx._montarValoresQuadro([247, 72], 319, 0, 0);
  assert.deepEqual(r.valores, [247, 72]);
  assert.equal(r.pintura, 0);
  assert.equal(r.total, 319);
});

test('_montarValoresQuadro: taxa sem override inclui pintura e mantém itens', () => {
  // itens somam 247; orc.valor_total = 272 (247 + 25 de taxa)
  const r = ctx._montarValoresQuadro([247], 272, 25, 0);
  assert.equal(r.pintura, 25);
  assert.equal(r.total, 272);
  assert.equal(Number(r.valores.reduce((a, b) => a + b, 0).toFixed(2)), 247);
});

test('_montarValoresQuadro: override sem taxa distribui pro total cobrado', () => {
  const r = ctx._montarValoresQuadro([247, 72], 319, 0, 300);
  assert.equal(r.pintura, 0);
  assert.equal(r.total, 300);
  assert.equal(Number(r.valores.reduce((a, b) => a + b, 0).toFixed(2)), 300);
});

test('_montarValoresQuadro: override + taxa — itens somam (total − taxa) e pintura separada', () => {
  // itens calc somam 247; orc.valor_total 272; cobrado 300 -> itens 275 + pintura 25 = 300
  const r = ctx._montarValoresQuadro([247], 272, 25, 300);
  assert.equal(r.pintura, 25);
  assert.equal(r.total, 300);
  assert.equal(Number(r.valores.reduce((a, b) => a + b, 0).toFixed(2)), 275);
});
