// Oficina.gs — ordens de serviço da molduraria + ponte do aviso automático da Julia.
//
//  - Texto LIVRE (não amarra no catálogo de estoque): muita moldura da loja não está no sistema.
//  - Fluxo de status: em_producao -> pronto -> entregue.
//  - Quando a oficina marca "pronto", a Julia (bot) avisa o cliente no WhatsApp e grava o aviso aqui.
//  - O VALOR cai no Financeiro (Entradas, origem 'oficina') quando o cliente RETIRA (entregue).
//
// Auth: funções da interface usam a sessão de login (_validarSessao/_validarGestao).
//       Os 2 endpoints do bot (oficinaPendentes/oficinaConfirmarAviso) são protegidos por TOKEN
//       (Script Property OFICINA_TOKEN), checado no Api.gs — porque o web app é anônimo.

// ====================== Núcleo puro (testável em Node) ======================

// Próximo ID "OS-NNN": maior número existente + 1, com 3 dígitos.
function _proximoIdOS(ids) {
  var maior = 0;
  (ids || []).forEach(function (id) {
    var m = String(id == null ? '' : id).match(/(\d+)\s*$/);
    if (m) { var n = parseInt(m[1], 10); if (n > maior) maior = n; }
  });
  return 'OS-' + String(maior + 1).padStart(3, '0');
}

// Prazo: aceita ISO do <input type=date> ('AAAA-MM-DD') ou texto; guarda/exibe como "DD/MM/AAAA".
function _prazoStr(raw) {
  var s = String(raw == null ? '' : raw).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : s;
}

// Date -> "dd/mm/aaaa hh:mm" (string). Regra de ouro: nada de Date no retorno do google.script.run.
function _dataHoraOS(v) {
  if (!v) return '';
  if (v && typeof v.getMonth === 'function') {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(v.getDate()) + '/' + p(v.getMonth() + 1) + '/' + v.getFullYear() +
           ' ' + p(v.getHours()) + ':' + p(v.getMinutes());
  }
  return String(v);
}

// ====================== Aba / setup ======================

function garantirAbaOficina() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABAS_FIN.OFICINA);
  if (!aba) {
    aba = ss.insertSheet(ABAS_FIN.OFICINA);
    aba.getRange(1, 1, 1, CABECALHOS_FIN.Oficina.length).setValues([CABECALHOS_FIN.Oficina]);
    aba.setFrozenRows(1);
  }
  return 'Aba Oficina pronta.';
}

// Item de menu: cria a aba Oficina, garante a coluna "papeis" em Usuarios e gera/mostra o token do bot.
function prepararOficina() {
  garantirAbaOficina();
  garantirAbaUsuarios(); // adiciona a coluna "papeis" se faltar
  var token = _garantirTokenOficina();
  var msg = 'Pronto!\n\n• Aba "Oficina" criada/conferida.\n• Coluna "papeis" garantida em Usuarios ' +
            '(preencha: atendimento / oficina / dono — pode acumular com vírgula).\n\n' +
            'OFICINA_TOKEN (cole no .env do bot e reinicie a Julia):\n' + token;
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function _garantirTokenOficina() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty('OFICINA_TOKEN');
  if (!t) { t = Utilities.getUuid(); props.setProperty('OFICINA_TOKEN', t); }
  return t;
}

function _tokenOficinaOk(t) {
  var esperado = PropertiesService.getScriptProperties().getProperty('OFICINA_TOKEN');
  return !!esperado && String(t == null ? '' : t) === esperado;
}

// ====================== Helpers internos ======================

function _acharOrdem(id) {
  if (!abaExiste(ABAS_FIN.OFICINA)) return null;
  var linhas = lerAba(ABAS_FIN.OFICINA);
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].ID) === String(id)) return linhas[i];
  }
  return null;
}

function _idsOficina() {
  if (!abaExiste(ABAS_FIN.OFICINA)) return [];
  return lerAba(ABAS_FIN.OFICINA).map(function (o) { return o.ID; });
}

// Anexa uma Entrada no caderno financeiro a partir da ordem entregue (origem 'oficina').
// Sem _validarSessao: já validado em marcarEntregue.
function _lancarEntradaOficina(valor, cliente, idOS) {
  garantirAbasFinanceiro();
  var id = _proximoIdFin('E', _idsDaAba(ABAS_FIN.ENTRADAS));
  anexarLinha(ABAS_FIN.ENTRADAS, {
    id: id, timestamp: new Date(), data: new Date(), valor: valor,
    forma_pagamento: '', cliente: cliente || '', obs: 'Ordem ' + idOS, origem: 'oficina'
  });
  return id;
}

// ====================== Funções da interface (login) ======================

// Cria a ordem. args: { token, cliente, telefone, descricao, prazo, valor }. Exige atendimento/dono.
function criarOrdem(args) {
  var email = _validarGestao(args.token);
  return comLock(function () {
    garantirAbaOficina();
    var cliente = String(args.cliente || '').trim();
    if (!cliente) throw new Error('Informe o nome do cliente.');
    var valor = _parseValorBR(args.valor); // vazio/inválido -> 0 (pode ajustar depois)
    if (!(valor >= 0)) valor = 0;
    var id = _proximoIdOS(_idsOficina());
    anexarLinha(ABAS_FIN.OFICINA, {
      ID: id, Data_criacao: new Date(), Cliente: cliente,
      Telefone: String(args.telefone || '').trim(),
      Descricao: String(args.descricao || '').trim(),
      Prazo: _prazoStr(args.prazo), Valor: valor,
      Status: 'em_producao', Aviso: '', Data_aviso: '', Data_pronto: '', Data_entrega: '',
      Lancado_financeiro: '', Criado_por: email || '', Finalizado_por: '',
      Obs: String(args.obs || '').trim()
    });
    return { ok: true, id: id };
  });
}

// Lista ordens (mais recentes primeiro). filtro opcional por status. Qualquer papel logado.
function listarOrdens(token, filtro) {
  _validarSessao(token);
  if (!abaExiste(ABAS_FIN.OFICINA)) return [];
  var linhas = lerAba(ABAS_FIN.OFICINA);
  var out = [];
  for (var i = linhas.length - 1; i >= 0; i--) {
    var o = linhas[i];
    if (!o.ID) continue;
    if (filtro && String(o.Status) !== filtro) continue;
    out.push({
      id: o.ID, cliente: o.Cliente, telefone: o.Telefone, descricao: o.Descricao,
      prazo: _prazoStr(o.Prazo), valor: Number(o.Valor) || 0, status: o.Status || '',
      aviso: o.Aviso || '', data_aviso: _dataHoraOS(o.Data_aviso),
      data_criacao: _dataHoraOS(o.Data_criacao), data_pronto: _dataHoraOS(o.Data_pronto),
      data_entrega: _dataHoraOS(o.Data_entrega), criado_por: o.Criado_por || ''
    });
  }
  return out;
}

// Oficina termina o serviço. args: { token, id }. Qualquer papel logado (inclui oficina).
function marcarPronto(args) {
  var email = _validarSessao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Status', 'pronto');
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Data_pronto', new Date());
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Finalizado_por', email || '');
    return { ok: true };
  });
}

// Edita os detalhes (cliente/telefone/descrição/prazo/valor). Exige atendimento/dono.
// NÃO mexe em status/aviso/datas/financeiro. args: { token, id, cliente, telefone, descricao, prazo, valor }
function editarOrdem(args) {
  _validarGestao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    var cliente = String(args.cliente || '').trim();
    if (!cliente) throw new Error('Informe o nome do cliente.');
    var valor = _parseValorBR(args.valor);
    if (!(valor >= 0)) valor = 0;
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Cliente', cliente);
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Telefone', String(args.telefone || '').trim());
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Descricao', String(args.descricao || '').trim());
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Prazo', _prazoStr(args.prazo));
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Valor', valor);
    return { ok: true };
  });
}

// Cliente retira. args: { token, id }. Exige atendimento/dono. Lança o valor no financeiro (1x).
function marcarEntregue(args) {
  _validarGestao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Status', 'entregue');
    atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Data_entrega', new Date());
    var jaLancado = o.Lancado_financeiro === true || String(o.Lancado_financeiro).toUpperCase() === 'TRUE';
    var valor = Number(o.Valor) || 0;
    var lancou = false;
    if (!jaLancado && valor > 0) {
      _lancarEntradaOficina(valor, o.Cliente, o.ID);
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Lancado_financeiro', true);
      lancou = true;
    }
    return { ok: true, lancado: lancou };
  });
}

// ====================== Endpoints do BOT (token checado no Api.gs) ======================

// Ordens prontas, ainda não avisadas e com telefone. Devolve o mínimo (sem descrição interna).
function oficinaPendentes() {
  if (!abaExiste(ABAS_FIN.OFICINA)) return [];
  var linhas = lerAba(ABAS_FIN.OFICINA);
  var out = [];
  for (var i = 0; i < linhas.length; i++) {
    var o = linhas[i];
    if (String(o.Status) !== 'pronto') continue;
    if (String(o.Aviso || '') !== '') continue;
    if (!String(o.Telefone || '').trim()) continue;
    out.push({ id: o.ID, cliente: o.Cliente, telefone: String(o.Telefone) });
  }
  return out;
}

// A Julia confirma o aviso. ok=true -> 'enviado'; ok=false -> 'falha' (+ motivo na Obs).
function oficinaConfirmarAviso(id, ok, motivo) {
  return comLock(function () {
    var o = _acharOrdem(id);
    if (!o) throw new Error('Ordem não encontrada: ' + id);
    if (ok) {
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Aviso', 'enviado');
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Data_aviso', new Date());
    } else {
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Aviso', 'falha');
      var obs = String(o.Obs || '');
      var nota = 'aviso falhou: ' + (motivo || 'erro');
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Obs', obs ? (obs + ' | ' + nota) : nota);
    }
    return { ok: true };
  });
}
