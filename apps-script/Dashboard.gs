// Dashboard.gs — leituras agregadas pra tela de início (somente leitura).
// _resumirDashboard é PURA (sem SpreadsheetApp) pra rodar em Node nos testes.

// Converte Date -> string "dd/mm/aaaa hh:mm" (duck-typing pra funcionar no sandbox dos
// testes). CRÍTICO: o google.script.run devolve null quando o payload tem objeto Date,
// então nenhuma Date pode sair daqui — só primitivos.
function _dataLegivel(v) {
  if (v && typeof v.getMonth === 'function') {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(v.getDate()) + '/' + p(v.getMonth() + 1) + '/' + v.getFullYear() +
           ' ' + p(v.getHours()) + ':' + p(v.getMinutes());
  }
  return v == null ? '' : String(v);
}

function _resumirDashboard(molduras, vidros, chapas, espelhos, historico) {
  function num(v) { return Number(v) || 0; }

  var grupos = [
    { cat: 'moldura', itens: molduras || [], est: 'Estoque_atual_m',  min: 'Estoque_minimo_m',  preco: 'Valor_por_metro', un: 'm' },
    { cat: 'vidro',   itens: vidros || [],   est: 'Estoque_atual_m2', min: 'Estoque_minimo_m2', preco: 'Valor_por_m2',    un: 'm²' },
    { cat: 'chapa',   itens: chapas || [],   est: 'Estoque_atual_m2', min: 'Estoque_minimo_m2', preco: 'Valor_por_m2',    un: 'm²' },
    { cat: 'espelho', itens: espelhos || [], est: 'Estoque_atual_m2', min: 'Estoque_minimo_m2', preco: 'Valor_por_m2',    un: 'm²' }
  ];

  var totais = {};
  var estoqueBaixo = [];
  var valorEstoque = 0;

  grupos.forEach(function (g) {
    totais[g.cat] = g.itens.length;
    g.itens.forEach(function (it) {
      var estoque = num(it[g.est]);
      var minimo = num(it[g.min]);
      valorEstoque += estoque * num(it[g.preco]);
      if (minimo > 0 && estoque <= minimo) {
        estoqueBaixo.push({
          codigo: it.Codigo, nome: it.Nome, categoria: g.cat,
          estoque: estoque, minimo: minimo, unidade: g.un
        });
      }
    });
  });

  var hist = historico || [];
  var vendas = hist.filter(function (h) {
    return String(h.Tipo_movimentacao).toLowerCase() === 'venda';
  });
  var ultimas = hist.slice(-8).reverse().map(function (h) {
    return {
      data_hora: _dataLegivel(h.Data_hora), tipo: h.Tipo_movimentacao, categoria: h.Categoria,
      produto: h.Produto, quantidade: h.Quantidade, unidade: h.Unidade,
      valor: h.Valor, cliente: h.Cliente
    };
  });

  return {
    totais: totais,
    valor_estoque: Number(valorEstoque.toFixed(2)),
    estoque_baixo: estoqueBaixo,
    num_movimentacoes_venda: vendas.length,
    ultimas_movimentacoes: ultimas
  };
}

// Lê as abas e devolve o resumo. Chamada pela UI (google.script.run) e pela API.
function dashboardResumo() {
  return _resumirDashboard(
    lerAba(ABAS.MOLDURAS),
    lerAba(ABAS.VIDROS),
    lerAba(ABAS.CHAPAS),
    lerAba(ABAS.ESPELHOS),
    lerAba(ABAS.HISTORICO)
  );
}
