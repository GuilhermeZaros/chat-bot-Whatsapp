// SeedAvulsos.gs — cria a categoria/aba "Avulsos" e semeia silicone + passepartout.
// Avulso = material vendido À PARTE (por m²), FORA do cálculo automático do quadro
// (o orçamento só conhece moldura/vidro/chapa/espelho). Aparece na Consulta e na
// Venda avulsa da interface. Idempotente: dedup por Nome. Rode pelo menu da planilha
// (a 1ª vez pede autorização do escopo do Sheets no navegador).

// [Nome, Tipo, Valor_por_m2, Descricao]
var AVULSOS_SEED = [
  ['Silicone', 'Cola', 10.00, 'Silicone/cola de montagem, cobrado por m².'],
  ['Passepartout Importado', 'Passepartout', 330.00,
   'Passepartout (paspatur) importado: borda de papel-cartão entre a obra e o vidro. ATENÇÃO: com paspatur o quadro inteiro cresce — cote moldura/vidro/chapa no tamanho EXTERNO (obra + 2× a borda).']
];

var AVULSO_ESTOQUE = { atual: 15, minimo: 3 }; // m² — PLACEHOLDER, o dono ajusta na planilha

// Cria a aba Avulsos com o cabeçalho se ela ainda não existir (nunca limpa a existente).
function garantirAbaAvulsos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABAS.AVULSOS);
  if (!aba) {
    aba = ss.insertSheet(ABAS.AVULSOS);
    aba.getRange(1, 1, 1, CABECALHOS.Avulsos.length).setValues([CABECALHOS.Avulsos]);
    aba.setFrozenRows(1);
  }
  return aba;
}

// Garante a aba e adiciona os avulsos que ainda não existem (dedup por Nome).
function importarAvulsos() {
  return comLock(function () {
    garantirAbaAvulsos();
    var existentes = lerAba(ABAS.AVULSOS);
    var nomes = existentes.map(function (r) { return String(r.Nome).toLowerCase().trim(); });
    var codigos = existentes.map(function (r) { return r.Codigo; });
    var adicionados = 0;
    AVULSOS_SEED.forEach(function (a) {
      if (nomes.indexOf(String(a[0]).toLowerCase().trim()) >= 0) return; // já existe
      var codigo = _proximoCodigo(_PREFIXO_CAT.avulso, codigos);
      codigos.push(codigo);
      anexarLinha(ABAS.AVULSOS, {
        Codigo: codigo, Nome: a[0], Tipo: a[1], Espessura_mm: '',
        Valor_por_m2: a[2], Preco_minimo: '', Descricao: a[3],
        Estoque_atual_m2: AVULSO_ESTOQUE.atual, Estoque_minimo_m2: AVULSO_ESTOQUE.minimo,
        Disponivel: true, Custo_por_m2: ''
      });
      adicionados++;
    });
    return 'Avulsos conferidos. Adicionados agora: ' + adicionados +
           ' (total na aba: ' + (existentes.length + adicionados) + ').';
  });
}
