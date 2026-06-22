// Catalogo.gs — leituras: buscar molduras, listar materiais, consultar produto,
// e montar orçamento a partir de códigos (delegando o cálculo ao Calculo.gs).

// O modelo às vezes manda a cor flexionada ("preta"); o banco guarda no masculino.
function _normalizarCor(cor) {
  if (!cor) return cor;
  var mapa = { preta: 'preto', branca: 'branco', dourada: 'dourado', prateada: 'prata',
               rosa: 'rose', 'rose gold': 'rose', 'rosé': 'rose' };
  var limpa = String(cor).toLowerCase().trim();
  return mapa[limpa] || limpa;
}

function _ehDisponivel(valor) {
  return valor === true || String(valor).toUpperCase() === 'TRUE';
}

// Preço do paspatur por m²: vem do item "passepartout" na aba Avulsos (fonte única).
// Fallback 330 se a aba/item ainda não existir (dono ainda não rodou o seed de avulsos).
function _precoPaspatur() {
  if (!abaExiste(ABAS.AVULSOS)) return 330;
  var linhas = lerAba(ABAS.AVULSOS);
  for (var i = 0; i < linhas.length; i++) {
    if (/passepartout|paspatur/i.test(String(linhas[i].Nome))) {
      return Number(linhas[i].Valor_por_m2) || 330;
    }
  }
  return 330;
}

// Molduras que casam com os filtros E têm estoque (> 0). Retorna até `limite` (máx 5).
function buscarMolduras(filtros) {
  filtros = filtros || {};
  var limite = Math.min(Number(filtros.limite) || 3, 5);
  var cor = _normalizarCor(filtros.cor); // normaliza a query
  var estilo = filtros.estilo ? String(filtros.estilo).toLowerCase().trim() : '';

  return lerAba(ABAS.MOLDURAS).filter(function (m) {
    if (!_ehDisponivel(m.Disponivel)) return false;
    if (Number(m.Estoque_atual_m) <= 0) return false;
    // estilo: "contém" (ex: "caixa invertida" acha "caixa invertida (filete)").
    if (estilo && String(m.Estilo).toLowerCase().indexOf(estilo) < 0) return false;
    // cor: normaliza OS DOIS lados (o catálogo grava feminino; o normalizador unifica).
    if (cor && _normalizarCor(String(m.Cor)) !== cor) return false;
    if (filtros.acabamento && String(m.Acabamento).toLowerCase() !== String(filtros.acabamento).toLowerCase()) return false;
    return true;
  }).sort(function (a, b) {
    // mais baratas primeiro (cobrança é por metro de perfil)
    return (Number(a.Valor_por_metro) || 0) - (Number(b.Valor_por_metro) || 0);
  }).slice(0, limite).map(function (m) {
    return {
      codigo: m.Codigo, nome: m.Nome, estilo: m.Estilo, cor: m.Cor,
      acabamento: m.Acabamento, preco_metro: Number(m.Valor_por_metro),
      largura_perfil_cm: Number(m.Largura_perfil_cm) || 0,
      foto_url: m.Foto_URL, descricao: m.Descricao, tags: m.Tags,
      estoque_atual_m: Number(m.Estoque_atual_m), disponivel: true
    };
  });
}

// Lista vidros/chapas/espelhos disponíveis. `tipo` opcional filtra a categoria.
function listarMateriais(tipo) {
  var abas = tipo ? [ABA_POR_CATEGORIA[tipo]] : [ABAS.VIDROS, ABAS.CHAPAS, ABAS.ESPELHOS];
  var out = [];
  abas.forEach(function (nomeAba) {
    if (!nomeAba) return;
    var categoria = nomeAba.toLowerCase().replace(/s$/, ''); // Vidros->vidro, Chapas->chapa, Espelhos->espelho
    lerAba(nomeAba).forEach(function (x) {
      if (!_ehDisponivel(x.Disponivel)) return;
      out.push({
        codigo: x.Codigo, categoria: categoria, nome: x.Nome, tipo: x.Tipo,
        espessura_mm: x.Espessura_mm, preco_m2: Number(x.Valor_por_m2),
        descricao: x.Descricao, estoque_atual_m2: Number(x.Estoque_atual_m2), disponivel: true
      });
    });
  });
  return out;
}

// Acha um produto por código em qualquer das abas de catálogo (inclui avulsos).
function buscarProduto(codigo) {
  var cats = [['moldura', ABAS.MOLDURAS], ['vidro', ABAS.VIDROS],
              ['chapa', ABAS.CHAPAS], ['espelho', ABAS.ESPELHOS],
              ['avulso', ABAS.AVULSOS]];
  for (var i = 0; i < cats.length; i++) {
    if (!abaExiste(cats[i][1])) continue; // Avulsos pode não existir ainda
    var achou = acharPorCodigo(cats[i][1], codigo);
    if (achou) return { categoria: cats[i][0], aba: cats[i][1], dados: achou };
  }
  return null;
}

// Consulta enxuta: preço, estoque e disponibilidade de um item (pro bot dizer "tem?").
function consultarProduto(codigo) {
  var p = buscarProduto(codigo);
  if (!p) return null;
  var d = p.dados;
  if (p.categoria === 'moldura') {
    return {
      codigo: d.Codigo, nome: d.Nome, categoria: 'moldura',
      preco: Number(d.Valor_por_metro), unidade_preco: 'R$/m',
      estoque: Number(d.Estoque_atual_m), unidade_estoque: 'm',
      foto_url: d.Foto_URL,
      disponivel: _ehDisponivel(d.Disponivel) && Number(d.Estoque_atual_m) > 0
    };
  }
  return {
    codigo: d.Codigo, nome: d.Nome, categoria: p.categoria,
    preco: Number(d.Valor_por_m2), unidade_preco: 'R$/m²',
    estoque: Number(d.Estoque_atual_m2), unidade_estoque: 'm²',
    disponivel: _ehDisponivel(d.Disponivel) && Number(d.Estoque_atual_m2) > 0
  };
}

// Monta o orçamento a partir de códigos + medidas, resolvendo preços e chamando Calculo.gs.
function orcamentoPorCodigos(args) {
  var largura = Number(args.largura), altura = Number(args.altura);
  if (!largura || !altura) throw new Error('Informe largura e altura em cm.');

  var itens = [];
  var mapa = [['moldura', args.moldura], ['vidro', args.vidro],
              ['chapa', args.chapa], ['espelho', args.espelho]];
  for (var i = 0; i < mapa.length; i++) {
    var cat = mapa[i][0], cod = mapa[i][1];
    if (!cod) continue;
    var p = buscarProduto(cod);
    if (!p) throw new Error('Produto não encontrado: ' + cod);
    if (p.categoria !== cat) throw new Error('O código ' + cod + ' é de um ' + p.categoria + ', não ' + cat + '.');
    var d = p.dados;
    var preco = cat === 'moldura' ? Number(d.Valor_por_metro) : Number(d.Valor_por_m2);
    itens.push({
      categoria: cat, nome: d.Nome, preco: preco,
      perfilCm: cat === 'moldura' ? (Number(d.Largura_perfil_cm) || 0) : 0
    });
  }
  if (itens.length === 0) throw new Error('Informe pelo menos um item (moldura, vidro, chapa ou espelho).');
  var paspatur = _ehDisponivel(args.paspatur);
  return calcularOrcamento(largura, altura, itens, {
    objetoAlto: _ehDisponivel(args.objetoAlto),
    vidroDuplo: _ehDisponivel(args.vidroDuplo),
    paspatur: paspatur,
    paspaturPrecoM2: paspatur ? _precoPaspatur() : 0
  });
}

// Simula a viabilidade de um serviço: N quadros da MESMA moldura e tamanho. Lê o perfil e
// o estoque da moldura na planilha, calcula o consumo real e devolve o veredito. Somente
// leitura (não baixa nada). Usado pela aba Simulador e pela rota ?action=simularServico.
function simularServico(codigo, quantidade, largura, altura) {
  var p = buscarProduto(codigo);
  if (!p) throw new Error('Produto não encontrado: ' + codigo);
  if (p.categoria !== 'moldura') throw new Error('O simulador é só pra molduras.');
  var lg = Number(largura), al = Number(altura);
  if (!lg || !al) throw new Error('Informe largura e altura em cm.');
  var perfil = Number(p.dados.Largura_perfil_cm) || 0;
  var consumo = consumoMolduraM(lg, al, perfil);
  var r = simularServicoMoldura(consumo, quantidade, Number(p.dados.Estoque_atual_m), VARA_PADRAO_M);
  r.codigo = p.dados.Codigo;
  r.nome = p.dados.Nome;
  r.perfil_cm = perfil;
  r.sem_perfil = (perfil <= 0); // aviso: consumo caiu no perímetro
  return r;
}

// Lista TODOS os produtos (molduras + materiais) pros seletores da interface de venda.
// Inclui estoque e disponibilidade pra UI poder sinalizar itens zerados.
function listarProdutos() {
  var grupos = [
    ['moldura', ABAS.MOLDURAS, 'Valor_por_metro', 'Estoque_atual_m', 'm'],
    ['vidro',   ABAS.VIDROS,   'Valor_por_m2',    'Estoque_atual_m2', 'm²'],
    ['chapa',   ABAS.CHAPAS,   'Valor_por_m2',    'Estoque_atual_m2', 'm²'],
    ['espelho', ABAS.ESPELHOS, 'Valor_por_m2',    'Estoque_atual_m2', 'm²'],
    ['avulso',  ABAS.AVULSOS,  'Valor_por_m2',    'Estoque_atual_m2', 'm²']
  ];
  var out = [];
  grupos.forEach(function (g) {
    if (!abaExiste(g[1])) return; // Avulsos pode não existir ainda
    lerAba(g[1]).forEach(function (x) {
      out.push({
        codigo: x.Codigo, nome: x.Nome, categoria: g[0], marca: x.Marca || '',
        preco: Number(x[g[2]]), estoque: Number(x[g[3]]), unidade: g[4],
        disponivel: _ehDisponivel(x.Disponivel)
      });
    });
  });
  return out;
}
