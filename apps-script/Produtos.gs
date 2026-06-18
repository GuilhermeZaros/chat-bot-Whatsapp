// Produtos.gs — cadastro de produtos (escrita). _proximoCodigo é puro (testável em Node).

var _PREFIXO_CAT = { moldura: 'MOL', vidro: 'VID', chapa: 'CHA', espelho: 'ESP', avulso: 'AVU' };

// Próximo código sequencial da categoria: pega o MAIOR número existente com o prefixo e soma 1.
function _proximoCodigo(prefixo, codigosExistentes) {
  var max = 0;
  (codigosExistentes || []).forEach(function (c) {
    var m = String(c).match(new RegExp('^' + prefixo + '-(\\d+)$'));
    if (m) { var n = Number(m[1]); if (n > max) max = n; }
  });
  return prefixo + '-' + String(max + 1).padStart(3, '0');
}

// Cadastra um produto novo. args: { categoria, campos: { <Coluna>: valor, ... } }
// Gera o código, grava na aba e registra 'cadastro' no histórico.
function adicionarProduto(args) {
  _validarSessao(args.token);
  var categoria = args.categoria;
  var aba = ABA_POR_CATEGORIA[categoria];
  var prefixo = _PREFIXO_CAT[categoria];
  if (!aba || !prefixo) throw new Error('Categoria inválida: ' + categoria);

  var campos = args.campos || {};
  if (!campos.Nome || !String(campos.Nome).trim()) throw new Error('Informe o nome do produto.');
  var precoCol = categoria === 'moldura' ? 'Valor_por_metro' : 'Valor_por_m2';
  if (!(Number(campos[precoCol]) > 0)) throw new Error('Informe um preço válido.');

  return comLock(function () {
    var existentes = lerAba(aba).map(function (r) { return r.Codigo; });
    var codigo = _proximoCodigo(prefixo, existentes);
    var cfg = _colunaEstoque(categoria);

    // Monta a linha só com colunas reais da aba; Codigo e Disponivel definidos aqui.
    var linha = { Codigo: codigo };
    CABECALHOS[aba].forEach(function (col) {
      if (col === 'Codigo' || col === 'Disponivel') return;
      if (campos[col] !== undefined && campos[col] !== '') linha[col] = campos[col];
    });
    linha.Disponivel = (campos.Disponivel === false || campos.Disponivel === 'nao') ? false : true;
    anexarLinha(aba, linha);

    registrarHistorico({
      tipo: 'cadastro', categoria: categoria, produto: campos.Nome,
      quantidade: Number(linha[cfg.col]) || 0, unidade: cfg.unidade, valor: ''
    });
    return { ok: true, codigo: codigo, nome: campos.Nome };
  });
}

// Normaliza o valor de Disponivel (vindo do form como 'sim'/'nao') pra boolean.
function _coerceDisponivel(col, v) {
  if (col !== 'Disponivel') return v;
  return (v === false || v === 'FALSE' || v === 'nao' || v === 0) ? false : true;
}

// Leitura completa de um produto, pro formulário de edição. Retorna {codigo, categoria, campos}.
function obterProduto(codigo) {
  var p = buscarProduto(codigo);
  if (!p) return null;
  var campos = {};
  Object.keys(p.dados).forEach(function (k) { if (k !== '_linha') campos[k] = p.dados[k]; });
  return { codigo: codigo, categoria: p.categoria, campos: campos };
}

// Edita um produto. args: { codigo, campos: { <Coluna>: valor } }.
// Atualiza só colunas reais; NÃO mexe em Codigo nem no estoque atual (muda por venda/entrada).
function editarProduto(args) {
  _validarSessao(args.token);
  var campos = args.campos || {};
  return comLock(function () {
    var p = buscarProduto(args.codigo);
    if (!p) throw new Error('Produto não encontrado: ' + args.codigo);
    if (campos.Nome !== undefined && !String(campos.Nome).trim()) throw new Error('O nome não pode ficar vazio.');

    var cfg = _colunaEstoque(p.categoria);
    var estoqueAntigo = Number(p.dados[cfg.col]);

    var alterou = [];
    CABECALHOS[p.aba].forEach(function (col) {
      if (col === 'Codigo' || campos[col] === undefined) return; // Codigo é imutável; estoque pode mudar
      atualizarCelula(p.aba, p.dados._linha, col, _coerceDisponivel(col, campos[col]));
      alterou.push(col);
    });
    if (!alterou.length) throw new Error('Nada pra alterar.');

    // Se mexeu no estoque direto, registra um 'ajuste' (mantém o histórico honesto).
    if (alterou.indexOf(cfg.col) >= 0) {
      var estoqueNovo = Number(campos[cfg.col]);
      var delta = Number((estoqueNovo - estoqueAntigo).toFixed(3));
      registrarHistorico({
        tipo: 'ajuste', categoria: p.categoria, produto: campos.Nome || p.dados.Nome,
        quantidade: delta, unidade: cfg.unidade, valor: '',
        observacoes: 'ajuste manual de estoque: ' + estoqueAntigo + ' → ' + estoqueNovo + cfg.unidade
      });
    }

    registrarHistorico({
      tipo: 'edição', categoria: p.categoria, produto: campos.Nome || p.dados.Nome,
      quantidade: '', unidade: '', valor: '', observacoes: 'alterado: ' + alterou.join(', ')
    });
    return { ok: true, codigo: args.codigo, alterou: alterou };
  });
}
