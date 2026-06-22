// Financeiro.gs — caderno digital (gastos + vendas) e dashboard de fluxo de caixa.
//
// É um módulo SEPARADO do estoque: dinheiro que entra/sai vem das abas Entradas/Saidas
// (lançadas por você), NÃO do Historico de estoque — assim nada conta em dobro.
//
// Convenções herdadas do projeto:
//  - O núcleo (_parse*, _resolverCategoria, _parseCSV, _proximoIdFin, _resumirFinanceiro)
//    é PURO: não toca SpreadsheetApp, roda em Node nos testes (test/financeiro.test.js).
//  - REGRA DE OURO: nada de objeto Date no retorno de função chamada via google.script.run
//    (devolve null). _resumirFinanceiro só devolve string/number.
//  - Escrita sempre sob comLock(); abas são append-only pros lançamentos.

var _MESES_PT = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var _MESES_ABREV = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ====================== NÚCLEO PURO (testável em Node) ======================

// "1.234,56" / "1481,88" / "R$ 1.000,00" / 95.5 -> número de verdade. Vazio/sujeira -> 0.
function _parseValorBR(v) {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  var s = String(v == null ? '' : v).replace(/[^\d.,-]/g, '');
  if (s.indexOf(',') >= 0) {
    s = s.replace(/\./g, '').replace(',', '.'); // pt-BR: ponto = milhar, vírgula = decimal
  }
  var n = Number(s);
  return isNaN(n) ? 0 : n;
}

// Duck-typing pra reconhecer Date vindo do vm (cross-realm) nos testes.
function _ehData(v) { return v && typeof v.getMonth === 'function' && typeof v.getFullYear === 'function'; }

// "DD/MM" (+ ano), "DD/MM/AAAA" ou "AAAA-MM-DD" (input type=date) -> Date.
// Date entra, Date sai. Vazio -> null.
function _parseDataBR(v, ano) {
  if (_ehData(v)) return v;
  var s = String(v == null ? '' : v).trim();
  if (!s) return null;
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // ISO do <input type="date">
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  var p = s.split('/');
  var dia = parseInt(p[0], 10);
  var mes = parseInt(p[1], 10);
  var anoFinal = p[2] ? parseInt(p[2], 10) : Number(ano);
  if (!dia || !mes || !anoFinal) return null;
  return new Date(anoFinal, mes - 1, dia);
}

// Minúsculas sem acento, via mapa explícito (sem normalize/combining ranges).
function _semAcento(s) {
  var de = 'áàâãäéèêëíìîïóòôõöúùûüç';
  var para = 'aaaaaeeeeiiiiooooouuuuc';
  s = String(s == null ? '' : s).toLowerCase().trim();
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var idx = de.indexOf(s.charAt(i));
    out += idx >= 0 ? para.charAt(idx) : s.charAt(i);
  }
  return out;
}

// Valida a categoria contra o enum fixo (ignora acento/caixa). Fora da lista -> Outros.
function _resolverCategoria(c, categorias) {
  var alvo = _semAcento(c);
  for (var i = 0; i < categorias.length; i++) {
    if (_semAcento(categorias[i]) === alvo) return { categoria: categorias[i], reconhecida: true };
  }
  return { categoria: 'Outros', reconhecida: false };
}

// CSV pt-BR (separador ;) -> array de objetos { coluna: valor }. Ignora linhas vazias e \r.
function _parseCSV(texto, sep) {
  sep = sep || ';';
  var linhas = String(texto || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
  if (!linhas.length) return [];
  var cab = linhas[0].split(sep).map(function (c) { return c.trim(); });
  return linhas.slice(1).map(function (linha) {
    var celulas = linha.split(sep);
    var obj = {};
    cab.forEach(function (col, j) { obj[col] = (celulas[j] == null ? '' : celulas[j]).trim(); });
    return obj;
  });
}

// Próximo id sequencial "PREFIXO-0001" a partir dos ids existentes (mesma ideia do _proximoCodigo).
function _proximoIdFin(prefixo, ids) {
  var max = 0;
  (ids || []).forEach(function (id) {
    var m = String(id).match(new RegExp('^' + prefixo + '-(\\d+)$'));
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });
  return prefixo + '-' + String(max + 1).padStart(4, '0');
}

function _arred2(n) { return Number((Number(n) || 0).toFixed(2)); }
function _arred1(n) { return Number((Number(n) || 0).toFixed(1)); }
function _pad2(n) { return (n < 10 ? '0' : '') + n; }

// "YYYY-MM" a partir do valor da coluna data (Date ou string). anoFallback p/ strings DD/MM.
function _chaveMes(v, anoFallback) {
  var d = _ehData(v) ? v : _parseDataBR(v, anoFallback);
  if (!d) return '';
  return d.getFullYear() + '-' + _pad2(d.getMonth() + 1);
}

function _margem(saldo, entrada) {
  return entrada > 0 ? _arred1((saldo / entrada) * 100) : 0;
}

// Agregação do dashboard. entradas/saidas = linhas das abas (data, valor, [categoria|forma]).
// opcoes = { ano, mes:'YYYY-MM'|'', categoria:'<enum>'|'' }. Devolve só primitivos.
function _resumirFinanceiro(entradas, saidas, opcoes) {
  opcoes = opcoes || {};
  var ano = Number(opcoes.ano) || (new Date()).getFullYear();
  var mesSel = opcoes.mes || '';
  var catSel = opcoes.categoria || '';

  entradas = entradas || [];
  saidas = saidas || [];

  // Mapa por mês: entrada/saída. Conjunto de meses que aparecem (pro dropdown e timeline).
  var mesMap = {};
  function garante(mes) {
    if (!mesMap[mes]) mesMap[mes] = { mes: mes, entrada: 0, saida: 0 };
    return mesMap[mes];
  }
  entradas.forEach(function (e) {
    var mes = _chaveMes(e.data, ano); if (!mes) return;
    garante(mes).entrada += _parseValorBR(e.valor);
  });
  saidas.forEach(function (s) {
    var mes = _chaveMes(s.data, ano); if (!mes) return;
    garante(mes).saida += _parseValorBR(s.valor);
  });

  var meses = Object.keys(mesMap).sort();
  var por_mes = meses.map(function (mes) {
    var m = mesMap[mes];
    var nMes = parseInt(mes.split('-')[1], 10);
    return {
      mes: mes,
      rotulo: _MESES_ABREV[nMes] + '/' + mes.split('-')[0].slice(2),
      entrada: _arred2(m.entrada),
      saida: _arred2(m.saida),
      saldo: _arred2(m.entrada - m.saida)
    };
  });

  // KPIs: acumulado (tudo) e período (mês selecionado, ou tudo se vazio).
  function kpis(filtraMes) {
    var ent = 0, sai = 0;
    entradas.forEach(function (e) {
      if (filtraMes && _chaveMes(e.data, ano) !== filtraMes) return;
      ent += _parseValorBR(e.valor);
    });
    saidas.forEach(function (s) {
      if (filtraMes && _chaveMes(s.data, ano) !== filtraMes) return;
      sai += _parseValorBR(s.valor);
    });
    return { entrada: _arred2(ent), saida: _arred2(sai), saldo: _arred2(ent - sai), margem: _margem(ent - sai, ent) };
  }
  var acumulado = kpis('');
  var periodo = mesSel ? kpis(mesSel) : acumulado;

  // Saídas por categoria no escopo selecionado (mês ou tudo).
  var catMap = {};
  var totalSaidaEscopo = 0;
  saidas.forEach(function (s) {
    if (mesSel && _chaveMes(s.data, ano) !== mesSel) return;
    var cat = s.categoria || 'Outros';
    var val = _parseValorBR(s.valor);
    catMap[cat] = (catMap[cat] || 0) + val;
    totalSaidaEscopo += val;
  });
  var saidas_por_categoria = Object.keys(catMap).map(function (cat) {
    return {
      categoria: cat,
      valor: _arred2(catMap[cat]),
      pct: totalSaidaEscopo > 0 ? _arred1((catMap[cat] / totalSaidaEscopo) * 100) : 0
    };
  }).sort(function (a, b) { return b.valor - a.valor; });

  var categoria_destacada = null;
  if (catSel) {
    var v = catMap[catSel] || 0;
    categoria_destacada = {
      categoria: catSel,
      valor: _arred2(v),
      pct: totalSaidaEscopo > 0 ? _arred1((v / totalSaidaEscopo) * 100) : 0
    };
  }

  // Saldo acumulado (running total) sobre os meses já ordenados.
  var _acc = 0;
  por_mes.forEach(function (m) { _acc = _arred2(_acc + m.saldo); m.saldo_acumulado = _acc; });

  // Melhor mês (maior saldo).
  var melhor_mes = null;
  por_mes.forEach(function (m) {
    if (!melhor_mes || m.saldo > melhor_mes.saldo) melhor_mes = { mes: m.mes, rotulo: m.rotulo, saldo: m.saldo };
  });

  // Variação do mês "atual" (mesSel, ou o último com dado) vs o mês anterior.
  function _pctVar(atual, anterior) {
    if (!(Math.abs(anterior) > 0)) return null;
    return _arred1(((atual - anterior) / Math.abs(anterior)) * 100);
  }
  var variacao = { tem: false };
  if (por_mes.length >= 1) {
    var idx = por_mes.length - 1;
    if (mesSel) { for (var k = 0; k < por_mes.length; k++) { if (por_mes[k].mes === mesSel) { idx = k; break; } } }
    if (idx >= 1) {
      var at = por_mes[idx], an = por_mes[idx - 1];
      variacao = {
        tem: true, mes_atual: at.rotulo, mes_anterior: an.rotulo,
        entrada: _pctVar(at.entrada, an.entrada),
        saida: _pctVar(at.saida, an.saida),
        saldo: _pctVar(at.saldo, an.saldo)
      };
    }
  }

  // Maior categoria de gasto no acumulado (todos os meses, ignora o filtro de mês).
  var catAcum = {}, totalSaidaTudo = 0;
  saidas.forEach(function (s) {
    var c = s.categoria || 'Outros', vv = _parseValorBR(s.valor);
    catAcum[c] = (catAcum[c] || 0) + vv; totalSaidaTudo += vv;
  });
  var maior_categoria_acumulada = null;
  Object.keys(catAcum).forEach(function (c) {
    if (!maior_categoria_acumulada || catAcum[c] > maior_categoria_acumulada.valor) {
      maior_categoria_acumulada = { categoria: c, valor: _arred2(catAcum[c]) };
    }
  });
  if (maior_categoria_acumulada) {
    maior_categoria_acumulada.pct = totalSaidaTudo > 0
      ? _arred1((maior_categoria_acumulada.valor / totalSaidaTudo) * 100) : 0;
  }

  // Lançamentos do escopo (mês selecionado, ou tudo): data como STRING, ordenado do mais recente.
  function _fmtDataFin(v) {
    var d = _ehData(v) ? v : _parseDataBR(v, ano);
    if (!d) return '';
    return _pad2(d.getDate()) + '/' + _pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function _msDataFin(v) { var d = _ehData(v) ? v : _parseDataBR(v, ano); return d ? d.getTime() : 0; }
  var lancamentos = [];
  entradas.forEach(function (e) {
    if (mesSel && _chaveMes(e.data, ano) !== mesSel) return;
    lancamentos.push({ _ms: _msDataFin(e.data), data: _fmtDataFin(e.data), tipo: 'entrada',
      descricao: e.cliente || e.obs || 'Venda', categoria: 'Venda', valor: _arred2(_parseValorBR(e.valor)) });
  });
  saidas.forEach(function (s) {
    if (mesSel && _chaveMes(s.data, ano) !== mesSel) return;
    lancamentos.push({ _ms: _msDataFin(s.data), data: _fmtDataFin(s.data), tipo: 'saida',
      descricao: s.descricao || '', categoria: s.categoria || 'Outros', valor: _arred2(_parseValorBR(s.valor)) });
  });
  lancamentos.sort(function (a, b) { return b._ms - a._ms; });
  lancamentos.forEach(function (l) { delete l._ms; });

  return {
    ano: ano,
    mes_sel: mesSel,
    cat_sel: catSel,
    meses: meses.map(function (mes) {
      var partes = mes.split('-');
      return { valor: mes, rotulo: _MESES_PT[parseInt(partes[1], 10)] + ' de ' + partes[0] };
    }),
    periodo: periodo,
    acumulado: acumulado,
    por_mes: por_mes,
    saidas_por_categoria: saidas_por_categoria,
    categoria_destacada: categoria_destacada,
    melhor_mes: melhor_mes,
    variacao: variacao,
    maior_categoria_acumulada: maior_categoria_acumulada,
    lancamentos: lancamentos
  };
}

// ====================== ACESSO AO SHEETS (Apps Script) ======================

// Cria as abas financeiras se faltarem (NUNCA limpa as existentes — append-only).
function garantirAbasFinanceiro() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CABECALHOS_FIN).forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba) {
      aba = ss.insertSheet(nome);
      aba.getRange(1, 1, 1, CABECALHOS_FIN[nome].length).setValues([CABECALHOS_FIN[nome]]);
      aba.setFrozenRows(1);
    }
  });
  return 'Abas financeiras conferidas: ' + Object.keys(CABECALHOS_FIN).join(', ') + '.';
}

// Lê todos os ids de uma aba (coluna 'id') — pra gerar o próximo sequencial.
function _idsDaAba(nome) {
  return lerAba(nome).map(function (l) { return l.id; });
}

// Lança um GASTO (saída). args: { data, descricao, valor, categoria, pagamento, obs }
function lancarGasto(args) {
  _validarGestao(args.token);
  return comLock(function () {
    garantirAbasFinanceiro();
    var res = _resolverCategoria(args.categoria, CATEGORIAS_SAIDA);
    if (!res.reconhecida) {
      Logger.log('Categoria de saída fora do enum: "' + args.categoria + '" -> Outros');
    }
    var valor = _parseValorBR(args.valor);
    if (valor <= 0) throw new Error('Informe um valor maior que zero.');
    var data = _parseDataBR(args.data, ANO_HISTORICO) || new Date();
    var id = _proximoIdFin('S', _idsDaAba(ABAS_FIN.SAIDAS));
    anexarLinha(ABAS_FIN.SAIDAS, {
      id: id, timestamp: new Date(), data: data,
      descricao: args.descricao || '', valor: valor, categoria: res.categoria,
      pagamento: args.pagamento || '', obs: args.obs || '', origem: 'app'
    });
    return { ok: true, id: id, valor: valor, categoria: res.categoria };
  });
}

// Lança uma VENDA (entrada individual). args: { data, valor, forma_pagamento, cliente, obs }
function lancarVenda(args) {
  _validarGestao(args.token);
  return comLock(function () {
    garantirAbasFinanceiro();
    var valor = _parseValorBR(args.valor);
    if (valor <= 0) throw new Error('Informe um valor maior que zero.');
    var data = _parseDataBR(args.data, ANO_HISTORICO) || new Date();
    var id = _proximoIdFin('E', _idsDaAba(ABAS_FIN.ENTRADAS));
    anexarLinha(ABAS_FIN.ENTRADAS, {
      id: id, timestamp: new Date(), data: data, valor: valor,
      forma_pagamento: args.forma_pagamento || '', cliente: args.cliente || '',
      obs: args.obs || '', origem: 'app'
    });
    return { ok: true, id: id, valor: valor };
  });
}

// Enums pros dropdowns da interface (fonte única no Config.gs). Só pra quem tem acesso.
function financeiroConfig(token) {
  _validarGestao(token);
  return { categorias: CATEGORIAS_SAIDA, formas: FORMAS_PAGAMENTO };
}

// Lê as abas e devolve o resumo pro dashboard. Chamada SÓ pela interface (não pela API pública).
function financeiroResumo(token, mes, categoria) {
  _validarGestao(token);
  garantirAbasFinanceiro();
  return _resumirFinanceiro(
    lerAba(ABAS_FIN.ENTRADAS),
    lerAba(ABAS_FIN.SAIDAS),
    { ano: ANO_HISTORICO, mes: mes || '', categoria: categoria || '' }
  );
}

// Regenera a aba ResumoMensal (visão rápida na planilha). Idempotente. Menu -> com lock.
function recalcularResumoMensal() {
  return comLock(function () { return _escreverResumoMensal(); });
}

// Sem lock — chamada de dentro de quem JÁ segura o lock (ex.: importarHistorico).
function _escreverResumoMensal() {
  garantirAbasFinanceiro();
  var r = _resumirFinanceiro(lerAba(ABAS_FIN.ENTRADAS), lerAba(ABAS_FIN.SAIDAS), { ano: ANO_HISTORICO });
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS_FIN.RESUMO_MENSAL);
  var cab = CABECALHOS_FIN[ABAS_FIN.RESUMO_MENSAL];
  if (aba.getLastRow() > 1) aba.getRange(2, 1, aba.getLastRow() - 1, cab.length).clearContent();
  var linhas = r.por_mes.map(function (m) {
    var partes = m.mes.split('-');
    var nMes = parseInt(partes[1], 10);
    return [_MESES_PT[nMes], partes[0], m.entrada, m.saida, m.saldo, _margem(m.saldo, m.entrada) + '%'];
  });
  if (linhas.length) aba.getRange(2, 1, linhas.length, cab.length).setValues(linhas);
  return 'Resumo mensal recalculado: ' + linhas.length + ' mês(es).';
}
