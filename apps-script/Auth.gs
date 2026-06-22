// Auth.gs — login próprio (e-mail/senha na aba Usuarios) e sessão por token.
//
// Convenções do projeto:
//  - Núcleo puro (_usuarioAtivo, _acharUsuario) NÃO toca Sheets/Cache: roda em Node (test/auth.test.js).
//  - Sessão/aba tocam CacheService/SpreadsheetApp: verificadas pela interface publicada.
//  - O bot (?action=) nunca passa por aqui — login só tranca a interface humana.

// 'ativo' é amigável: só desativa quando explicitamente FALSE/nao/0; vazio conta como ativo.
function _usuarioAtivo(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  return s !== 'false' && s !== 'nao' && s !== 'não' && s !== '0' && s !== 'n';
}

// Acha o usuário ativo cujo e-mail (case-insensitive) e senha (exata) batem. Senha vazia nunca loga.
function _acharUsuario(usuarios, email, senha) {
  var alvo = String(email == null ? '' : email).trim().toLowerCase();
  var s = String(senha == null ? '' : senha);
  if (!alvo || !s) return { ok: false };
  for (var i = 0; i < (usuarios || []).length; i++) {
    var u = usuarios[i] || {};
    if (String(u.email == null ? '' : u.email).trim().toLowerCase() !== alvo) continue;
    if (!_usuarioAtivo(u.ativo)) continue;
    if (String(u.senha == null ? '' : u.senha) !== s) continue;
    return { ok: true, nome: u.nome || alvo, papeis: u.papeis || '' };
  }
  return { ok: false };
}

// ====================== Papéis (núcleo puro) ======================

// "atendimento,oficina" -> ['atendimento','oficina']. Vazio -> ['atendimento'] (retrocompat: acesso total).
function papeisDe(str) {
  var lista = String(str == null ? '' : str).split(/[,;]/).map(function (s) {
    return s.trim().toLowerCase();
  }).filter(Boolean);
  return lista.length ? lista : ['atendimento'];
}

// Tem acesso de gestão (vê tudo: estoque/financeiro/oficina completa)?
function temGestao(papeis) {
  return (papeis || []).indexOf('atendimento') !== -1 || (papeis || []).indexOf('dono') !== -1;
}

// É só oficina (vê apenas a fila de produção)?
function ehSomenteOficina(papeis) {
  return (papeis || []).indexOf('oficina') !== -1 && !temGestao(papeis);
}

// ====================== SESSÃO E ABA (tocam CacheService/Sheets) ======================

var _SESSAO_TTL_S = 21600; // 6 h — teto do CacheService do Apps Script.

// Confere e-mail/senha na aba Usuarios. Sucesso -> cria token de sessão (cache) e devolve.
function autenticar(email, senha) {
  garantirAbaUsuarios();
  var r = _acharUsuario(lerAba(ABAS_FIN.USUARIOS), email, senha);
  if (!r.ok) return { ok: false, erro: 'E-mail ou senha incorretos.' };
  var token = Utilities.getUuid();
  var papeis = papeisDe(r.papeis);
  CacheService.getScriptCache().put('sess_' + token,
    JSON.stringify({ email: String(email).trim().toLowerCase(), papeis: papeis.join(',') }), _SESSAO_TTL_S);
  return { ok: true, token: token, nome: r.nome, papeis: papeis };
}

// Lê a sessão do cache -> { email, papeis[] } ou null. Tolera sessão antiga (valor = só o e-mail).
function _lerSessao(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('sess_' + token);
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (o && o.email) return { email: o.email, papeis: papeisDe(o.papeis) };
  } catch (e) {}
  return { email: String(raw).trim().toLowerCase(), papeis: papeisDe('') };
}

// Sessão ainda válida? (chamada no carregamento da página.) Devolve os papéis pro front montar o nav.
function verificarSessao(token) {
  var s = _lerSessao(token);
  return s ? { ok: true, papeis: s.papeis } : { ok: false };
}

// Encerra a sessão (botão Sair).
function sair(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
  return { ok: true };
}

// Lança se o token não corresponde a uma sessão viva. Devolve o e-mail. Defesa no servidor.
function _validarSessao(token) {
  var s = _lerSessao(token);
  if (!s) throw new Error('Sessão expirada. Entre de novo.');
  return s.email;
}

// Como _validarSessao, mas exige papel de gestão (atendimento/dono). Devolve o e-mail.
function _validarGestao(token) {
  var s = _lerSessao(token);
  if (!s) throw new Error('Sessão expirada. Entre de novo.');
  if (!temGestao(s.papeis)) throw new Error('Acesso restrito à equipe de atendimento.');
  return s.email;
}

// Cria a aba Usuarios (cabeçalho + linha do dono se vazia). Idempotente. Menu/login chamam.
function garantirAbaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABAS_FIN.USUARIOS);
  if (!aba) {
    aba = ss.insertSheet(ABAS_FIN.USUARIOS);
    aba.getRange(1, 1, 1, CABECALHOS_FIN.Usuarios.length).setValues([CABECALHOS_FIN.Usuarios]);
    aba.setFrozenRows(1);
  } else {
    // Migra: garante a coluna "papeis" em planilhas antigas (sem apagar dados).
    var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    if (cab.indexOf('papeis') === -1) aba.getRange(1, aba.getLastColumn() + 1).setValue('papeis');
  }
  if (aba.getLastRow() < 2) {
    aba.appendRow(['guilhermezaros59@gmail.com', '', 'Gui', true, 'dono']);
  }
  return 'Aba Usuarios pronta. Preencha "senha" e "papeis" (atendimento / oficina / dono — acumulável) na planilha.';
}
