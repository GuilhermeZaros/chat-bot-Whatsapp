// Movimentacao.gs — escritas. Tudo sob comLock(); histórico é append-only.

function _colunaEstoque(categoria) {
  return categoria === 'moldura'
    ? { col: 'Estoque_atual_m', unidade: 'm' }
    : { col: 'Estoque_atual_m2', unidade: 'm²' };
}

// Registra uma linha no histórico (nunca apaga nada).
function registrarHistorico(mov) {
  anexarLinha(ABAS.HISTORICO, {
    Data_hora: mov.data_hora || new Date(),
    Tipo_movimentacao: mov.tipo,
    Categoria: mov.categoria || '',
    Produto: mov.produto || '',
    Quantidade: mov.quantidade != null ? mov.quantidade : '',
    Unidade: mov.unidade || '',
    Valor: mov.valor != null ? mov.valor : '',
    Cliente: mov.cliente || '',
    Observacoes: mov.observacoes || '',
    Codigo: mov.codigo || ''
  });
}

// Confere saldo sem alterar (usado pra validar TODOS os itens antes de baixar qualquer um).
function _verificaSaldo(codigo, quantidade) {
  var p = buscarProduto(codigo);
  if (!p) throw new Error('Produto não encontrado: ' + codigo);
  var cfg = _colunaEstoque(p.categoria);
  var atual = Number(p.dados[cfg.col]);
  if (atual < quantidade) {
    throw new Error('Estoque insuficiente de ' + p.dados.Nome +
      ' (tem ' + atual + cfg.unidade + ', precisa ' + quantidade + cfg.unidade + ').');
  }
}

function _baixarEstoque(codigo, quantidade) {
  var p = buscarProduto(codigo);
  var cfg = _colunaEstoque(p.categoria);
  var atual = Number(p.dados[cfg.col]);
  var novo = Number((atual - quantidade).toFixed(3));
  atualizarCelula(p.aba, p.dados._linha, cfg.col, novo);
  return { categoria: p.categoria, nome: p.dados.Nome, unidade: cfg.unidade, novo_saldo: novo };
}

function _somarEstoque(codigo, quantidade) {
  var p = buscarProduto(codigo);
  if (!p) throw new Error('Produto não encontrado: ' + codigo);
  var cfg = _colunaEstoque(p.categoria);
  var atual = Number(p.dados[cfg.col]);
  var novo = Number((atual + quantidade).toFixed(3));
  atualizarCelula(p.aba, p.dados._linha, cfg.col, novo);
  return { categoria: p.categoria, nome: p.dados.Nome, unidade: cfg.unidade, novo_saldo: novo };
}

// Venda de QUADRO/ESPELHO por medidas.
// args: { moldura, vidro, chapa, espelho, largura, altura, cliente, observacoes, valorTotal }
// Todas as linhas desta venda compartilham o mesmo Data_hora (pra contar transações).
// Objeto em relevo: grava a taxa de pintura como linha própria (categoria chapa).
function registrarVendaQuadro(args) {
  return comLock(function () {
    var orc = orcamentoPorCodigos(args); // valida códigos e calcula
    // Saldo e baixa usam o CONSUMO real (moldura: perímetro + cantos 45° + perda de
    // corte); a cobrança (it.valor) segue a quantidade cobrada (perímetro/área).
    orc.itens.forEach(function (it) {
      _verificaSaldo(args[it.categoria], it.consumo || it.quantidade);
    });

    var taxa = Number(orc.pintura_chapa) || 0;
    var partes = orc.itens.map(function (it) { return it.valor; });
    var montado = _montarValoresQuadro(partes, orc.valor_total, taxa, Number(args.valorTotal));
    var ajustado = Number(args.valorTotal) > 0 && Number(args.valorTotal) !== orc.valor_total;
    var quando = new Date();

    var baixas = [];
    orc.itens.forEach(function (it, idx) {
      var cod = args[it.categoria];
      var gasto = it.consumo || it.quantidade;
      var r = _baixarEstoque(cod, gasto);
      registrarHistorico({
        tipo: 'venda', categoria: it.categoria, produto: it.item,
        quantidade: gasto, unidade: it.unidade, valor: montado.valores[idx],
        cliente: args.cliente, observacoes: args.observacoes, codigo: cod, data_hora: quando
      });
      baixas.push(r);
    });

    // Taxa de pintura (objeto em relevo) → linha própria, atribuída à chapa.
    if (montado.pintura > 0) {
      var chapa = args.chapa ? buscarProduto(args.chapa) : null;
      registrarHistorico({
        tipo: 'venda', categoria: 'chapa',
        produto: chapa ? chapa.dados.Nome : 'Pintura de chapa',
        quantidade: '', unidade: '', valor: montado.pintura,
        cliente: args.cliente, observacoes: 'pintura de chapa (objeto em relevo)',
        codigo: args.chapa || '', data_hora: quando
      });
    }

    return { ok: true, orcamento: orc, valor_cobrado: montado.total, ajustado: ajustado, baixas: baixas };
  });
}

// Venda AVULSA. args: { codigo, quantidade, cliente, observacoes }
function registrarVendaAvulsa(args) {
  return comLock(function () {
    var qtd = Number(args.quantidade);
    if (!qtd || qtd <= 0) throw new Error('Quantidade inválida.');
    _verificaSaldo(args.codigo, qtd);
    var p = buscarProduto(args.codigo);
    var cfg = _colunaEstoque(p.categoria);
    var preco = p.categoria === 'moldura' ? Number(p.dados.Valor_por_metro) : Number(p.dados.Valor_por_m2);
    var valor = Number((qtd * preco).toFixed(2));
    var r = _baixarEstoque(args.codigo, qtd);
    registrarHistorico({
      tipo: 'venda', categoria: p.categoria, produto: p.dados.Nome,
      quantidade: qtd, unidade: cfg.unidade, valor: valor,
      cliente: args.cliente, observacoes: args.observacoes, codigo: args.codigo
    });
    return { ok: true, item: p.dados.Nome, quantidade: qtd, unidade: cfg.unidade, valor: valor, novo_saldo: r.novo_saldo };
  });
}

// Entrada de mercadoria. args: { codigo, quantidade, observacoes }
function registrarEntrada(args) {
  return comLock(function () {
    var qtd = Number(args.quantidade);
    if (!qtd || qtd <= 0) throw new Error('Quantidade inválida.');
    var r = _somarEstoque(args.codigo, qtd);
    registrarHistorico({
      tipo: 'entrada', categoria: r.categoria, produto: r.nome,
      quantidade: qtd, unidade: r.unidade, valor: '', cliente: '',
      observacoes: args.observacoes, codigo: args.codigo
    });
    return { ok: true, item: r.nome, quantidade: qtd, unidade: r.unidade, novo_saldo: r.novo_saldo };
  });
}
