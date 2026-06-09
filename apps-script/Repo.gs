// Repo.gs — único módulo que fala com o SpreadsheetApp.
// Lê abas como objetos, acha/atualiza/anexa linhas, e serializa escrita com lock.

function _planilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function _aba(nome) {
  var aba = _planilha().getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  return aba;
}

// Lê a aba inteira como array de objetos { Coluna: valor, _linha: n }.
function lerAba(nome) {
  var aba = _aba(nome);
  var valores = aba.getDataRange().getValues();
  if (valores.length < 2) return [];
  var cab = valores[0];
  var linhas = [];
  for (var i = 1; i < valores.length; i++) {
    var obj = {};
    for (var j = 0; j < cab.length; j++) obj[cab[j]] = valores[i][j];
    obj._linha = i + 1; // número real da linha na planilha (1-based)
    linhas.push(obj);
  }
  return linhas;
}

// Acha a 1ª linha cujo 'Codigo' bate. Retorna o objeto (com _linha) ou null.
function acharPorCodigo(nomeAba, codigo) {
  var linhas = lerAba(nomeAba);
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].Codigo) === String(codigo)) return linhas[i];
  }
  return null;
}

// Atualiza uma célula por (linha, nome de coluna).
function atualizarCelula(nomeAba, numeroLinha, coluna, valor) {
  var aba = _aba(nomeAba);
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var idx = cab.indexOf(coluna);
  if (idx === -1) throw new Error('Coluna "' + coluna + '" não existe na aba ' + nomeAba);
  aba.getRange(numeroLinha, idx + 1).setValue(valor);
}

// Anexa uma linha a partir de um objeto, respeitando a ordem do cabeçalho.
function anexarLinha(nomeAba, obj) {
  var aba = _aba(nomeAba);
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var linha = cab.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; });
  aba.appendRow(linha);
}

// Executa fn com lock exclusivo do script (evita escrita concorrente).
function comLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Sistema ocupado, tente de novo em instantes.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
