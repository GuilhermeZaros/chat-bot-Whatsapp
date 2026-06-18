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
    return { ok: true, nome: u.nome || alvo };
  }
  return { ok: false };
}

// ====================== SESSÃO E ABA (tocam CacheService/Sheets) ======================

var _SESSAO_TTL_S = 21600; // 6 h — teto do CacheService do Apps Script.

// Confere e-mail/senha na aba Usuarios. Sucesso -> cria token de sessão (cache) e devolve.
function autenticar(email, senha) {
  garantirAbaUsuarios();
  var r = _acharUsuario(lerAba(ABAS_FIN.USUARIOS), email, senha);
  if (!r.ok) return { ok: false, erro: 'E-mail ou senha incorretos.' };
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, String(email).trim().toLowerCase(), _SESSAO_TTL_S);
  return { ok: true, token: token, nome: r.nome };
}

// Sessão ainda válida? (chamada no carregamento da página, com o token salvo no navegador.)
function verificarSessao(token) {
  return { ok: !!(token && CacheService.getScriptCache().get('sess_' + token)) };
}

// Encerra a sessão (botão Sair).
function sair(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
  return { ok: true };
}

// Lança se o token não corresponde a uma sessão viva. Defesa no servidor das funções sensíveis.
function _validarSessao(token) {
  if (!token || !CacheService.getScriptCache().get('sess_' + token)) {
    throw new Error('Sessão expirada. Entre de novo.');
  }
  return true;
}

// Cria a aba Usuarios (cabeçalho + linha do dono se vazia). Idempotente. Menu/login chamam.
function garantirAbaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABAS_FIN.USUARIOS);
  if (!aba) {
    aba = ss.insertSheet(ABAS_FIN.USUARIOS);
    aba.getRange(1, 1, 1, CABECALHOS_FIN.Usuarios.length).setValues([CABECALHOS_FIN.Usuarios]);
    aba.setFrozenRows(1);
  }
  if (aba.getLastRow() < 2) {
    aba.appendRow(['guilhermezaros59@gmail.com', '', 'Gui', true]);
  }
  return 'Aba Usuarios pronta. Preencha a coluna "senha" na planilha pra liberar o login.';
}
