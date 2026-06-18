import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../scripts/gerar-catalogo.js';

test('parseValorBR: pt-BR e inteiros', () => {
  assert.equal(g.parseValorBR('18,90'), 18.9);
  assert.equal(g.parseValorBR('40'), 40);
  assert.equal(g.parseValorBR('1.234,56'), 1234.56);
  assert.equal(g.parseValorBR(''), 0);
});
test('parsePerfil: cm e vírgula', () => {
  assert.equal(g.parsePerfil('4,5cm'), 4.5);
  assert.equal(g.parsePerfil('2 cm'), 2);
  assert.equal(g.parsePerfil('2cm'), 2);
  assert.equal(g.parsePerfil(''), 0);
});
test('estoqueMetros: varas × 2,70 e "bastante" → 27', () => {
  assert.equal(g.estoqueMetros('2 varas'), 5.4);
  assert.equal(g.estoqueMetros('6 varas'), 16.2);
  assert.equal(g.estoqueMetros('3 vara'), 8.1);
  assert.equal(g.estoqueMetros('nada anotado (bastante)'), 27);
  assert.equal(g.estoqueMetros(''), 27);
});
test('normalizarCor: cor principal pra busca', () => {
  assert.equal(g.normalizarCor('dourado'), 'dourada');
  assert.equal(g.normalizarCor('marrom/ madeira'), 'madeira');
  assert.equal(g.normalizarCor('marrom/ madeira/ tabaco/ marrom escuro'), 'madeira');
  assert.equal(g.normalizarCor('rosê/rosa'), 'rosa');
  assert.equal(g.normalizarCor('azul marinho'), 'azul');
  assert.equal(g.normalizarCor('prata'), 'prata');
});
test('normalizarEstilo: canônico curto', () => {
  assert.equal(g.normalizarEstilo('moldura Caixa'), 'caixa');
  assert.equal(g.normalizarEstilo('moldura caixa invertida (filete ou borda infinita)'), 'caixa invertida (filete)');
  assert.equal(g.normalizarEstilo('arredonda'), 'arredondada');
  assert.equal(g.normalizarEstilo('semi arredondado'), 'semi arredondada');
  assert.equal(g.normalizarEstilo('reta'), 'reta');
});
test('normalizarAcabamento: liso → lisa', () => {
  assert.equal(g.normalizarAcabamento('liso'), 'lisa');
  assert.equal(g.normalizarAcabamento('detalhada'), 'detalhada');
});
test('refLimpa: tira "sem referência" e preço furado', () => {
  assert.equal(g.refLimpa('060-3059'), '060-3059');
  assert.equal(g.refLimpa('sem referência'), '');
  assert.equal(g.refLimpa('64,00'), '');
  assert.equal(g.refLimpa(''), '');
});
test('montarNome: descrição com perfil', () => {
  assert.equal(g.montarNome('prata', 'reta', 'lisa', 2), 'Prata reta lisa 2cm');
  assert.equal(g.montarNome('madeira', 'caixa', 'lisa', 2), 'Madeira caixa lisa 2cm');
});

test('parseNota2: extrai campos rotulados, altura e obs', () => {
  const txt = [
    '![x](a.heic)',
    'Valor: 40,00',
    'Largura do perfil: 2cm',
    'Altura do perfil: 5cm',
    'Estoque: 3 varas',
    'Cor: madeira',
    'Estilo: moldura Caixa',
    'Acabamento: lisa',
    'Referência: 390-R305',
    'Obs*: use pra objetos altos',
    '—-',
    '![y](b.heic)',
    'Valor: 18,90',
    'Largura do perfil: 2cm',
    'Estoque: nada anotado',
    'Cor: preta',
    'Estilo: reta',
    'Acabamento: lisa',
    'Referência: 060-116'
  ].join('\n');
  const rows = g.parseNota2(txt);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].altura, '5cm');
  assert.equal(rows[0].obs, 'use pra objetos altos');
  assert.equal(rows[1].ref, '060-116');
});
test('parseNota1: formato com --- (rótulo opcional)', () => {
  const txt = [
    '![x](a.jpeg)', '18,90', '2cm', 'nada anotado', 'dourada', 'reta', 'lisa', '060-3059',
    '---',
    '![y](b.jpeg)', 'Valor: 32,00', 'Largura do perfil: 3cm', 'Estoque: 2 varas',
    'Cor: prata', 'Estilo: reta', 'Acabamento: detalhada', 'Referência: 1018-2515'
  ].join('\n');
  const rows = g.parseNota1(txt);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].valor, '18,90');
  assert.equal(rows[0].ref, '060-3059');
  assert.equal(rows[1].estilo, 'reta');
});
test('montarMoldura: registro completo; sem preço → null', () => {
  const m = g.montarMoldura({ valor: '40,00', largura: '2cm', altura: '5cm', estoque: '3 varas',
    cor: 'madeira', estilo: 'moldura Caixa', acabamento: 'lisa', ref: '390-R305', obs: 'use pra objetos altos' });
  assert.equal(m.Nome, 'Madeira caixa lisa 2cm');
  assert.equal(m.Modelo, '390-R305');
  assert.equal(m.Estilo, 'caixa');
  assert.equal(m.Valor_por_metro, 40);
  assert.equal(m.Estoque_atual_m, 8.1);
  assert.ok(/altura 5cm/.test(m.Descricao));
  assert.ok(/objetos altos/.test(m.Descricao));
  assert.equal(m.Foto_URL, '');
  assert.equal(g.montarMoldura({ valor: '', cor: 'x', estilo: 'reta' }), null);
});
