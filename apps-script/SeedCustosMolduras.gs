// SeedCustosMolduras.gs — preenche o Custo_por_metro das molduras (custos informados pelo dono,
// conferidos por fornecedor: Art Mold / Ruberti / Aguiar / Moldurarte). Casa pelo Codigo (= referência).
// Os 'X' da lista (sem custo no fornecedor) ficam de fora. Rode pelo menu. Idempotente; guarda custo < venda.

var CUSTOS_MOLDURAS = {
  "060-116": 3.36,
  "160-RM9": 6.91,
  "066-R315": 5.48,
  "054-R385": 4.13,
  "066-R390": 5.48,
  "050-R390": 3.65,
  "050-R385": 3.65,
  "397-R395": 7.18,
  "0870-7705": 6.5,
  "0870-7704": 6.5,
  "9N-9221": 14.25,
  "9N-9219": 14.25,
  "0122-2071": 6.58,
  "3085-9325": 15.3,
  "114-BTLA": 10.37,
  "914-804": 11.45,
  "401-R390": 10.26,
  "395-3059": 15.7,
  "395-R166": 10.1,
  "395-R116": 11.76,
  "395-R390": 1,
  "395-R385": 11.76,
  "395-R405": 11.76,
  "245-406": 3.91,
  "060-655": 3.36,
  "115-AF": 5.63,
  "014-AF": 7.06,
  "3043-24": 5.31,
  "390-166": 11.65,
  "390-3175": 12,
  "390-116": 12.46,
  "390-3059": 15.33,
  "375-3059": 10.61,
  "375-R315": 7.91,
  "360-R400": 9.15,
  "375-R385": 9.61,
  "375-R405": 7.18,
  "375-R300": 7.18,
  "360-166": 10.11,
  "375-R390": 9.61,
  "360-116": 10.11,
  "194-RM10": 14.11,
  "194-PPF": 12.28,
  "194-RM3": 13.58,
  "060-3059": 4.54,
  "165-3059": 8.58,
  "245-3059": 5.82,
  "060-3260": 4.53,
  "054-600": 3.98,
  "050-R345": 3.9,
  "054-R345": 5.23,
  "1018-1215": 7.66,
  "1304-2125": 8.38,
  "957-1010": 7.23,
  "0473-2017": 11.98,
  "0836-8215": 5.79,
  "947-1010": 6.5,
  "054-3175": 4.2,
  "054-R350": 3.91,
  "115-AL": 7.43,
  "0847-6001": 4.91,
  "245-3140": 4.95,
  "947-2010": 5.66,
  "1018-2515": 7.66,
  "0394-2504": 2.64,
  "0473-2018": 9.79,
  "1014-3140": 9.33,
  "0011-2070": 5.18,
  "870-2260": 6.5,
  "225-116": 5.37,
  "0058-0060": 3.17,
  "245-116": 4.87,
  "0004-7705": 3.88
};

function importarCustosMolduras() {
  return comLock(function () {
    var molduras = lerAba(ABAS.MOLDURAS);
    var aplicadas = 0, puladas = 0;
    molduras.forEach(function (m) {
      var custo = CUSTOS_MOLDURAS[String(m.Codigo).trim()];
      if (custo === undefined) return;
      if (!(custo < Number(m.Valor_por_metro))) { puladas++; return; } // custo >= venda: não aplica
      atualizarCelula(ABAS.MOLDURAS, m._linha, 'Custo_por_metro', custo);
      aplicadas++;
    });
    return 'Custos aplicados: ' + aplicadas + ' molduras (puladas ' + puladas +
      ' por custo >= venda). As demais não têm custo definido.';
  });
}
