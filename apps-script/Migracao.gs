// Migracao.gs — acrescenta colunas novas a abas que já têm dados (idempotente).
// _colunasFaltando é PURA (testável em Node). migrarColunas toca o Sheets (escreve →
// o dono roda uma vez no editor, autorizando o escopo).

// Colunas do `esperado` que ainda não existem no `real`, na ordem do esperado.
function _colunasFaltando(cabReal, cabEsperado) {
  return (cabEsperado || []).filter(function (c) { return (cabReal || []).indexOf(c) < 0; });
}

// Pra cada aba do Config, acrescenta no FIM as colunas do cabeçalho que faltam.
function migrarColunas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var relatorio = [];
  Object.keys(CABECALHOS).forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba) return;
    var ultCol = aba.getLastColumn();
    var cabReal = aba.getRange(1, 1, 1, ultCol).getValues()[0];
    var faltam = _colunasFaltando(cabReal, CABECALHOS[nome]);
    if (faltam.length) {
      aba.getRange(1, ultCol + 1, 1, faltam.length).setValues([faltam]);
      relatorio.push(nome + ': +' + faltam.join(', '));
    }
  });
  return relatorio.length ? ('Migração: ' + relatorio.join(' | ')) : 'Nada a migrar (já está tudo lá).';
}
