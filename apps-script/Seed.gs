// Seed.gs — roda UMA vez. Cria as abas com cabeçalhos e popula o catálogo.
// Estoques abaixo são PLACEHOLDERS — o dono ajusta na planilha depois.

var SEED_ESTOQUE_MOLDURA = { atual: 60, minimo: 10 }; // metros
var SEED_ESTOQUE_MATERIAL = { atual: 15, minimo: 3 };  // m²

function seedInicial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Cria/zera cada aba e escreve o cabeçalho.
  Object.keys(CABECALHOS).forEach(function (nome) {
    var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
    aba.clear();
    aba.getRange(1, 1, 1, CABECALHOS[nome].length).setValues([CABECALHOS[nome]]);
    aba.setFrozenRows(1);
  });

  // Remove a aba padrão criada pelo Google, se sobrou e não é nossa.
  ['Sheet1', 'Página1', 'Folha1', 'Sheet'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && CABECALHOS[n] === undefined && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  _seedMateriais();
  _seedMolduras();
  return 'Seed concluído: abas criadas e catálogo populado.';
}

function _fotoPlaceholder(cor, nome) {
  var cores = { dourado: 'D4A574', prata: 'C0C0C0', preto: '2C2C2C', branco: 'F5F5F5', madeira: '8B5A2B', rose: 'E8B4B8' };
  var bg = cores[cor] || '888888';
  return 'https://placehold.co/600x600/' + bg + '/FFFFFF/png?text=' + encodeURIComponent(nome);
}

function _seedMateriais() {
  // [aba, Codigo, Nome, Tipo, Espessura_mm, Valor_por_m2, Descricao]
  var mats = [
    [ABAS.VIDROS,   'VID-001', 'Vidro Simples 2mm', 'Simples',      2, 180.00, 'Vidro transparente simples, o padrão usado em quadros.'],
    [ABAS.VIDROS,   'VID-002', 'Vidro Antirreflexo', 'Antirreflexo', 2, 300.00, 'Vidro fosco que elimina reflexos. Ideal pra ambientes com muita luz.'],
    [ABAS.CHAPAS,   'CHA-001', 'Chapa Eucatex',     'Eucatex',      3,  90.00, 'Chapa de eucatex pro fundo do quadro. É a única opção de fundo da loja.'],
    [ABAS.ESPELHOS, 'ESP-001', 'Espelho Normal 3mm', 'Normal',       3, 330.00, 'Espelho normal de 3mm (não bisotado). É o único tipo de espelho da loja.']
  ];
  mats.forEach(function (m) {
    anexarLinha(m[0], {
      Codigo: m[1], Nome: m[2], Tipo: m[3], Espessura_mm: m[4], Valor_por_m2: m[5],
      Preco_minimo: '', Descricao: m[6],
      Estoque_atual_m2: SEED_ESTOQUE_MATERIAL.atual,
      Estoque_minimo_m2: SEED_ESTOQUE_MATERIAL.minimo,
      Disponivel: true
    });
  });
}

function _seedMolduras() {
  // [Codigo, Nome, Estilo, Cor, Acabamento, Largura_perfil_cm, Valor_por_metro, Preco_minimo, Descricao, Tags]
  var mol = [
    ['MOL-001', 'Veneza Dourada', 'classica', 'dourado', 'ornamental', 5.0, 95.00, 80.00, 'Moldura clássica dourada com detalhes ornamentais em relevo. Ideal para retratos e quadros decorativos sofisticados.', 'luxo,retrato,casamento,sofisticado'],
    ['MOL-002', 'Florença Dourada Envelhecida', 'classica', 'dourado', 'envelhecido', 6.5, 120.00, 100.00, 'Moldura dourada com acabamento envelhecido que remete a obras renascentistas. Perfeita para quadros grandes.', 'luxo,rustico,grande,classico'],
    ['MOL-003', 'Império Prata', 'classica', 'prata', 'ornamental', 4.5, 88.00, 75.00, 'Moldura prateada com ornamentos clássicos. Ótima opção para fotos em preto e branco e ambientes elegantes.', 'elegante,retrato,preto-e-branco'],
    ['MOL-004', 'Linhas Preta Fosca', 'moderna', 'preto', 'liso', 2.0, 45.00, 50.00, 'Moldura preta fosca de perfil fino e reto. Combina com qualquer decoração contemporânea.', 'minimalista,moderno,versatil,fino'],
    ['MOL-005', 'Linhas Branca', 'moderna', 'branco', 'liso', 2.0, 45.00, 50.00, 'Moldura branca de perfil fino, ideal para ambientes claros e estilo escandinavo.', 'minimalista,escandinavo,claro,versatil'],
    ['MOL-006', 'Bloco Preta Larga', 'moderna', 'preto', 'liso', 4.0, 68.00, 60.00, 'Moldura preta lisa com perfil mais largo. Dá destaque e profundidade ao quadro.', 'moderno,destaque,sala'],
    ['MOL-007', 'Slim Prata Escovada', 'moderna', 'prata', 'escovado', 1.8, 52.00, 55.00, 'Moldura fina em prata escovada. Acabamento sofisticado e contemporâneo.', 'moderno,fino,sofisticado,escritorio'],
    ['MOL-008', 'Madeira Natural Pinus', 'rustica', 'madeira', 'natural', 3.5, 58.00, 50.00, 'Moldura em madeira pinus com acabamento natural. Quentinha e aconchegante.', 'rustico,natural,aconchegante,madeira'],
    ['MOL-009', 'Madeira Demolição', 'rustica', 'madeira', 'envelhecido', 4.5, 78.00, 65.00, 'Moldura em madeira de demolição com marcas naturais do tempo. Cada peça é única.', 'rustico,unico,industrial,vintage'],
    ['MOL-010', 'Carvalho Escuro', 'rustica', 'madeira', 'liso', 3.0, 62.00, 55.00, 'Moldura em tom de carvalho escuro. Elegante e atemporal.', 'classico,escritorio,biblioteca'],
    ['MOL-011', 'Caixa Branca Profunda', 'minimalista', 'branco', 'liso', 3.0, 72.00, 65.00, 'Moldura tipo caixa em branco, com profundidade. Ideal para artes em técnica mista e telas.', 'minimalista,galeria,tela,arte'],
    ['MOL-012', 'Caixa Preta Profunda', 'minimalista', 'preto', 'liso', 3.0, 72.00, 65.00, 'Moldura tipo caixa em preto, com profundidade. Realça obras vibrantes.', 'minimalista,galeria,tela,arte'],
    ['MOL-013', 'Veneza Branca Ornamental', 'classica', 'branco', 'ornamental', 5.0, 95.00, 80.00, 'Versão branca da Veneza, com detalhes ornamentais. Perfeita para decoração provençal.', 'provencal,claro,romantico,casamento'],
    ['MOL-014', 'Rosé Gold Moderna', 'moderna', 'rose', 'escovado', 2.5, 82.00, 70.00, 'Moldura em tom rosé gold escovado. Tendência em decoração feminina e moderna.', 'moderno,tendencia,feminino,quarto'],
    ['MOL-015', 'Off-White Larga', 'classica', 'branco', 'liso', 6.0, 98.00, 85.00, 'Moldura off-white de perfil largo. Sofisticação sem chamar muita atenção da obra.', 'classico,sofisticado,galeria,sala']
  ];
  mol.forEach(function (m) {
    anexarLinha(ABAS.MOLDURAS, {
      Codigo: m[0], Nome: m[1], Modelo: '', Estilo: m[2], Cor: m[3], Acabamento: m[4],
      Largura_perfil_cm: m[5], Valor_por_metro: m[6], Preco_minimo: m[7],
      Foto_URL: _fotoPlaceholder(m[3], m[1]), Descricao: m[8], Tags: m[9],
      Estoque_atual_m: SEED_ESTOQUE_MOLDURA.atual,
      Estoque_minimo_m: SEED_ESTOQUE_MOLDURA.minimo,
      Disponivel: true
    });
  });
}
