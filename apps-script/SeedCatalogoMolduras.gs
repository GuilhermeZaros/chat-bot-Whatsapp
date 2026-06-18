// SeedCatalogoMolduras.gs — import único do catálogo real (dados em CatalogoDados.gs).
// Roda pelo menu (toca o Sheets → autoriza no navegador na 1ª vez). Idempotente:
// dedup por referência (Modelo) e as falsas já não existem na 2ª rodada.

var _MOL_FALSAS = ['MOL-001', 'MOL-002', 'MOL-003', 'MOL-004', 'MOL-005', 'MOL-006',
  'MOL-007', 'MOL-008', 'MOL-009', 'MOL-010', 'MOL-011', 'MOL-012', 'MOL-013', 'MOL-014', 'MOL-015'];

// Apaga linhas da aba Molduras cujo Codigo (coluna 1) está na lista. De baixo pra cima.
function _apagarMoldurasPorCodigo(codigos) {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.MOLDURAS);
  var ult = aba.getLastRow();
  if (ult < 2) return 0;
  var col = aba.getRange(2, 1, ult - 1, 1).getValues();
  var apagar = [];
  for (var i = 0; i < col.length; i++) {
    if (codigos.indexOf(String(col[i][0])) >= 0) apagar.push(i + 2);
  }
  apagar.sort(function (a, b) { return b - a; });
  apagar.forEach(function (r) { aba.deleteRow(r); });
  return apagar.length;
}

// Chave de identidade de uma moldura: a referência (Modelo) quando existe; senão o Nome.
// Garante idempotência mesmo pras molduras SEM referência (que só têm o nome pra diferenciar).
function _chaveMoldura(modelo, nome) {
  var ref = String(modelo || '').trim().toLowerCase();
  return ref ? ('ref:' + ref) : ('nome:' + String(nome || '').trim().toLowerCase());
}

// Remove linhas duplicadas da aba Molduras (mesma Nome|Modelo|Valor), mantendo a 1ª. De baixo pra cima.
function _dedupMoldurasExistentes() {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.MOLDURAS);
  var ult = aba.getLastRow();
  if (ult < 3) return 0;
  var cab = CABECALHOS[ABAS.MOLDURAS];
  var iNome = cab.indexOf('Nome'), iMod = cab.indexOf('Modelo'), iVal = cab.indexOf('Valor_por_metro');
  var dados = aba.getRange(2, 1, ult - 1, cab.length).getValues();
  var vistos = {}, apagar = [];
  for (var i = 0; i < dados.length; i++) {
    var chave = String(dados[i][iNome]).trim().toLowerCase() + '|' +
                String(dados[i][iMod]).trim().toLowerCase() + '|' +
                String(dados[i][iVal]).trim();
    if (vistos[chave]) apagar.push(i + 2); else vistos[chave] = true;
  }
  apagar.sort(function (a, b) { return b - a; });
  apagar.forEach(function (r) { aba.deleteRow(r); });
  return apagar.length;
}

// Import do catálogo: apaga as falsas, limpa duplicatas e insere CATALOGO_MOLDURAS
// (pula o que já existe — por referência, ou por nome quando não há referência). Idempotente.
function importarCatalogoMolduras() {
  return comLock(function () {
    var apagadas = _apagarMoldurasPorCodigo(_MOL_FALSAS);
    var duplicadas = _dedupMoldurasExistentes();
    var atuais = lerAba(ABAS.MOLDURAS);
    var existentes = {};
    atuais.forEach(function (l) { existentes[_chaveMoldura(l.Modelo, l.Nome)] = true; });
    var maxN = 0;
    atuais.forEach(function (l) {
      var mm = String(l.Codigo).match(/^MOL-(\d+)$/);
      if (mm) { var n = parseInt(mm[1], 10); if (n > maxN) maxN = n; }
    });
    var importadas = 0, puladas = 0;
    CATALOGO_MOLDURAS.forEach(function (m) {
      var chave = _chaveMoldura(m.Modelo, m.Nome);
      if (existentes[chave]) { puladas++; return; }
      maxN++;
      var codigo = 'MOL-' + String(maxN).padStart(3, '0');
      var linha = {};
      CABECALHOS[ABAS.MOLDURAS].forEach(function (col) {
        linha[col] = (m[col] !== undefined && m[col] !== null) ? m[col] : '';
      });
      linha.Codigo = codigo;
      linha.Disponivel = true;
      anexarLinha(ABAS.MOLDURAS, linha);
      existentes[chave] = true;
      importadas++;
    });
    return 'Catálogo: ' + importadas + ' importadas, ' + puladas + ' já existentes, ' +
      apagadas + ' falsas apagadas, ' + duplicadas + ' duplicatas removidas.';
  });
}

// Migração 1x: troca o Codigo das molduras (MOL-NNN) pela REFERÊNCIA real (coluna Modelo).
// Sem referência: a 060-116 (que está no nome da antiga MOL-016) vira o código; as demais
// viram S-REF-1, S-REF-2… Idempotente: só mexe em linhas cujo Codigo ainda é MOL-NNN.
function migrarCodigosMolduras() {
  return comLock(function () {
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.MOLDURAS);
    var ult = aba.getLastRow();
    if (ult < 2) return 'Aba Molduras vazia.';
    var cab = CABECALHOS[ABAS.MOLDURAS];
    var iCod = cab.indexOf('Codigo'), iMod = cab.indexOf('Modelo'), iNome = cab.indexOf('Nome');
    var rng = aba.getRange(2, 1, ult - 1, cab.length);
    var dados = rng.getValues();
    var contadorSemRef = 0, mudadas = 0;
    dados.forEach(function (r) {
      var cod = String(r[iCod]).trim();
      if (!/^MOL-\d+$/.test(cod)) return; // já migrado / não é MOL — pula (idempotente)
      var ref = String(r[iMod]).trim();
      if (ref) {
        r[iCod] = ref;
      } else if (/060-116/.test(String(r[iNome]))) {
        r[iCod] = '060-116';
        r[iMod] = '060-116'; // preenche o Modelo da antiga MOL-016 também
      } else {
        contadorSemRef++;
        r[iCod] = 'S-REF-' + contadorSemRef;
      }
      mudadas++;
    });
    rng.setValues(dados);
    return 'Códigos migrados: ' + mudadas + ' molduras agora usam a referência (' +
      contadorSemRef + ' sem referência viraram S-REF-N).';
  });
}

// Remove a coluna Modelo da aba Molduras (ficou duplicada do Codigo após a migração).
// Idempotente: se a coluna já não existe, não faz nada.
function removerColunaModelo() {
  return comLock(function () {
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.MOLDURAS);
    var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    var idx = cab.indexOf('Modelo');
    if (idx < 0) return 'A coluna Modelo já não existe na aba Molduras.';
    aba.deleteColumn(idx + 1);
    return 'Coluna Modelo removida da aba Molduras.';
  });
}
