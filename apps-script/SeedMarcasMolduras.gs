// SeedMarcasMolduras.gs — coluna Marca (fornecedor) das molduras. Cria a coluna logo após Nome
// (Codigo · Nome · Marca · Estilo · Cor · ...) e popula pelo Codigo. Rode pelo menu. Idempotente.

var MARCAS_MOLDURAS = {
  "060-116": "Art Mold",
  "160-RM9": "Ruberti",
  "066-R315": "Art Mold",
  "054-R385": "Art Mold",
  "066-R390": "Art Mold",
  "050-R390": "Art Mold",
  "050-R385": "Art Mold",
  "397-R395": "Art Mold",
  "0870-7705": "Aguiar",
  "0870-7704": "Aguiar",
  "9N-9221": "Moldurarte",
  "9N-9219": "Moldurarte",
  "0122-2071": "Aguiar",
  "3085-9325": "Moldurarte",
  "114-BTLA": "Ruberti",
  "400-R385": "Art Mold",
  "400-R300": "Art Mold",
  "914-804": "Art Mold",
  "401-R385": "Art Mold",
  "401-R390": "Art Mold",
  "395-3059": "Art Mold",
  "395-R166": "Art Mold",
  "395-R116": "Art Mold",
  "395-R390": "Art Mold",
  "395-R385": "Art Mold",
  "395-R405": "Art Mold",
  "245-406": "Art Mold",
  "060-655": "Art Mold",
  "115-VO": "Ruberti",
  "115-AF": "Ruberti",
  "014-AF": "Ruberti",
  "3043-24": "Moldurarte",
  "390-166": "Art Mold",
  "390-R305": "Art Mold",
  "390-3175": "Art Mold",
  "390-116": "Art Mold",
  "390-3059": "Art Mold",
  "390-R390": "Art Mold",
  "375-3059": "Art Mold",
  "375-R315": "Art Mold",
  "360-R400": "Art Mold",
  "375-R385": "Art Mold",
  "375-R405": "Art Mold",
  "375-R300": "Art Mold",
  "360-166": "Art Mold",
  "375-R390": "Art Mold",
  "360-116": "Art Mold",
  "194-RM10": "Ruberti",
  "194-PPF": "Ruberti",
  "194-RM3": "Ruberti",
  "800-R166": "Art Mold",
  "060-3059": "Art Mold",
  "165-3059": "Art Mold",
  "165-R-305": "Art Mold",
  "165-R385": "Art Mold",
  "245-3059": "Art Mold",
  "060-3260": "Art Mold",
  "054-600": "Art Mold",
  "050-R345": "Art Mold",
  "054-R345": "Art Mold",
  "1018-1215": "Art Mold",
  "1304-2125": "Aguiar",
  "957-1010": "Art Mold",
  "0473-2017": "Aguiar",
  "0836-8215": "Aguiar",
  "947-1010": "Art Mold",
  "054-3175": "Aguiar",
  "054-R350": "Art Mold",
  "115-AL": "Ruberti",
  "0847-6001": "Aguiar",
  "245-3140": "Art Mold",
  "947-2010": "Art Mold",
  "1018-2515": "Art Mold",
  "0394-2504": "Aguiar",
  "0473-2018": "Aguiar",
  "1014-3140": "Art Mold",
  "0011-2070": "Aguiar",
  "870-2260": "Aguiar",
  "225-116": "Art Mold",
  "0058-0060": "Aguiar",
  "245-116": "Art Mold",
  "M48312014-2": "Moldurarte",
  "300-RM-116": "Art Mold",
  "0004-7705": "Aguiar"
};

function definirMarcaMolduras() {
  return comLock(function () {
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.MOLDURAS);
    var header = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    if (header.indexOf('Marca') < 0) {
      var posNome = header.indexOf('Nome'); // 0-based
      aba.insertColumnAfter(posNome + 1);   // cria coluna em branco após Nome
      aba.getRange(1, posNome + 2).setValue('Marca');
    }
    var molduras = lerAba(ABAS.MOLDURAS);
    var n = 0;
    molduras.forEach(function (m) {
      var marca = MARCAS_MOLDURAS[String(m.Codigo).trim()];
      if (marca) { atualizarCelula(ABAS.MOLDURAS, m._linha, 'Marca', marca); n++; }
    });
    return 'Coluna Marca pronta; marca definida em ' + n + ' molduras.';
  });
}
