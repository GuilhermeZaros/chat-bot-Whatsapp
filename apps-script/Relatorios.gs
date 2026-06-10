// Relatorios.gs — agregações pros relatórios financeiros (somente leitura).
// _resumirRelatorios é PURA (sem SpreadsheetApp) pra rodar em Node nos testes.
// REGRA DE OURO: nenhum objeto Date no retorno (google.script.run devolve null) — só primitivos.

function _pad2(n) { return (n < 10 ? '0' : '') + n; }

// Duck-typing pra funcionar com Date cross-realm (vindo do vm nos testes).
function _comoData(v) {
  return (v && typeof v.getFullYear === 'function') ? v : new Date(v);
}
function _ts(v) {
  if (v && typeof v.getTime === 'function') return v.getTime();
  return new Date(v).getTime();
}

// Intervalo [inicio, fim) em ms pro período (calendário). 'tudo' = sem limites.
function _intervaloPeriodo(periodo, agora) {
  var a = _comoData(agora);
  var y = a.getFullYear(), m = a.getMonth(), d = a.getDate();
  if (periodo === 'hoje') {
    return { inicio: new Date(y, m, d).getTime(), fim: new Date(y, m, d + 1).getTime() };
  }
  if (periodo === 'semana') {
    var recuo = (a.getDay() + 6) % 7; // segunda como início da semana
    var ini = new Date(y, m, d - recuo).getTime();
    return { inicio: ini, fim: ini + 7 * 24 * 60 * 60 * 1000 };
  }
  if (periodo === 'mes') {
    return { inicio: new Date(y, m, 1).getTime(), fim: new Date(y, m + 1, 1).getTime() };
  }
  return { inicio: -Infinity, fim: Infinity }; // tudo
}

// historico: linhas do Sheets (com Data_hora, Tipo_movimentacao, Categoria, Produto,
//   Codigo, Quantidade, Valor, Cliente). produtos: [{codigo, nome, categoria, custo_unitario}].
function _resumirRelatorios(historico, produtos, periodo, agora) {
  periodo = periodo || 'mes';
  var faixa = _intervaloPeriodo(periodo, agora);
  var porMes = (periodo === 'tudo');

  // mapas de custo — só produtos com custo > 0 entram.
  var porCodigo = {}, porNomeCat = {}, temCustoCadastrado = false;
  (produtos || []).forEach(function (p) {
    var c = Number(p.custo_unitario) || 0;
    if (c > 0) {
      temCustoCadastrado = true;
      if (p.codigo) porCodigo[String(p.codigo)] = c;
      porNomeCat[String(p.categoria) + '|' + String(p.nome)] = c;
    }
  });

  var vendas = (historico || []).filter(function (h) {
    if (String(h.Tipo_movimentacao).toLowerCase() !== 'venda') return false;
    var t = _ts(h.Data_hora);
    return t >= faixa.inicio && t < faixa.fim;
  }).sort(function (a, b) { return _ts(a.Data_hora) - _ts(b.Data_hora); });

  var faturamento = 0, faturComCusto = 0, custoTotal = 0, itensSemCusto = 0;
  var transacoes = {}, serieMap = {}, serieOrdem = [], catMap = {}, molMap = {};

  vendas.forEach(function (h) {
    var valor = Number(h.Valor) || 0;
    var qtd = Number(h.Quantidade) || 0;
    var cat = String(h.Categoria || '').toLowerCase();
    faturamento += valor;

    transacoes[_ts(h.Data_hora) + '|' + String(h.Cliente || '')] = true;

    // custo / lucro
    var custoUnit = 0, achou = false;
    if (qtd <= 0) { achou = true; }                                   // taxa/pintura: custo 0, conta como "com custo"
    else if (h.Codigo && porCodigo[String(h.Codigo)] != null) { achou = true; custoUnit = porCodigo[String(h.Codigo)]; }
    else if (porNomeCat[cat + '|' + String(h.Produto)] != null) { achou = true; custoUnit = porNomeCat[cat + '|' + String(h.Produto)]; }
    if (achou) { faturComCusto += valor; custoTotal += qtd * custoUnit; }
    else { itensSemCusto++; }

    // série temporal
    var dd = _comoData(h.Data_hora);
    var rot = porMes ? (_pad2(dd.getMonth() + 1) + '/' + dd.getFullYear())
                     : (_pad2(dd.getDate()) + '/' + _pad2(dd.getMonth() + 1));
    if (serieMap[rot] == null) { serieMap[rot] = 0; serieOrdem.push(rot); }
    serieMap[rot] += valor;

    // por categoria
    if (!catMap[cat]) catMap[cat] = { categoria: cat, valor: 0, quantidade: 0, unidade: cat === 'moldura' ? 'm' : 'm²' };
    catMap[cat].valor += valor;
    catMap[cat].quantidade += qtd;

    // ranking de molduras
    if (cat === 'moldura') {
      var chave = h.Codigo ? String(h.Codigo) : ('nome:' + String(h.Produto));
      if (!molMap[chave]) molMap[chave] = { nome: String(h.Produto), metros: 0, valor: 0 };
      molMap[chave].metros += qtd;
      molMap[chave].valor += valor;
    }
  });

  var numVendas = Object.keys(transacoes).length;

  return {
    periodo: periodo,
    faturamento: Number(faturamento.toFixed(2)),
    num_vendas: numVendas,
    ticket_medio: numVendas ? Number((faturamento / numVendas).toFixed(2)) : 0,
    lucro: {
      tem_custo: temCustoCadastrado,
      valor: Number((faturComCusto - custoTotal).toFixed(2)),
      itens_sem_custo: itensSemCusto
    },
    serie_tempo: serieOrdem.map(function (r) { return { rotulo: r, valor: Number(serieMap[r].toFixed(2)) }; }),
    por_categoria: Object.keys(catMap).map(function (k) {
      return { categoria: catMap[k].categoria, valor: Number(catMap[k].valor.toFixed(2)),
               quantidade: Number(catMap[k].quantidade.toFixed(3)), unidade: catMap[k].unidade };
    }).sort(function (a, b) { return b.valor - a.valor; }),
    ranking_molduras: Object.keys(molMap).map(function (k) {
      return { nome: molMap[k].nome, metros: Number(molMap[k].metros.toFixed(2)), valor: Number(molMap[k].valor.toFixed(2)) };
    }).sort(function (a, b) { return b.metros - a.metros; }).slice(0, 10)
  };
}

// Lê produtos das 4 abas com o custo unitário (não vaza custo pra API pública/seletores).
function _lerProdutosComCusto() {
  var grupos = [
    ['moldura', ABAS.MOLDURAS, 'Custo_por_metro'],
    ['vidro',   ABAS.VIDROS,   'Custo_por_m2'],
    ['chapa',   ABAS.CHAPAS,   'Custo_por_m2'],
    ['espelho', ABAS.ESPELHOS, 'Custo_por_m2']
  ];
  var out = [];
  grupos.forEach(function (g) {
    lerAba(g[1]).forEach(function (x) {
      out.push({ codigo: x.Codigo, nome: x.Nome, categoria: g[0], custo_unitario: Number(x[g[2]]) || 0 });
    });
  });
  return out;
}

// Lê as abas e devolve o relatório. Chamada pela UI (google.script.run) e pela API.
function relatorios(periodo) {
  return _resumirRelatorios(lerAba(ABAS.HISTORICO), _lerProdutosComCusto(), periodo, new Date());
}
