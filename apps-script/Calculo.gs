// Calculo.gs — cálculo de orçamento. Funções PURAS (sem SpreadsheetApp),
// para serem a fonte única da regra de preço e testáveis em Node.
//
// Regras da loja:
//  - Moldura: cobrada pelo PERÍMETRO -> 2*(largura+altura), em metros lineares.
//  - Vidro/chapa/espelho: cobrados pela ÁREA -> largura*altura, em m².

function perimetroM(larguraCm, alturaCm) {
  return Number((2 * (Number(larguraCm) + Number(alturaCm)) / 100).toFixed(4));
}

function areaM2(larguraCm, alturaCm) {
  return Number(((Number(larguraCm) / 100) * (Number(alturaCm) / 100)).toFixed(4));
}

// Perda da serra por corte (kerf), em metros. 0,2 cm = 2 mm — igual à Calculadora de Molduras.
var KERF_M = 0.002;

// Perda ao desencabeçar UMA ponta (1 corte em 45°): o triângulo (√2 × perfil) + 1 kerf.
// ESCALA com o perfil — quanto mais largo o perfil, maior a perda.
function desencabecoM(perfilCm) {
  var p = Number(perfilCm) / 100;
  return (p > 0 ? Math.SQRT2 * p : 0) + KERF_M;
}

// Consumo REAL de moldura por quadro (baixa de estoque) — modelo da Calculadora de Molduras
// do dono. A COBRANÇA continua pelo perímetro; isto é só pra dar baixa no estoque.
//   total = perímetro + 8×perfil      (cantos — moldura que fica no quadro)
//         + 4×√2×perfil               (triângulos perdidos nos 4 cortes de 45°; escala c/ o perfil)
//         + 8×kerf                    (perda da serra — 8 cortes)
// Conferido contra a calculadora: 90×60, perfil 2 cm → 328,9 cm.
function consumoMolduraM(larguraCm, alturaCm, perfilCm) {
  var perim = perimetroM(larguraCm, alturaCm);
  var p = Number(perfilCm) / 100;
  if (!p || p <= 0) return perim; // sem perfil cadastrado: baixa só pelo perímetro
  var cantos = 8 * p;
  var triangulos = 4 * Math.SQRT2 * p;
  var serra = 8 * KERF_M;
  return Number((perim + cantos + triangulos + serra).toFixed(3));
}

// Comprimento padrão da vara entregue pelos fornecedores (a maioria entrega 2,70 m).
var VARA_PADRAO_M = 2.70;

// Veredito de viabilidade pra um lote de quadros da MESMA moldura e tamanho.
// Usa o MESMO consumo da baixa real (consumoUnitarioM = consumoMolduraM por quadro),
// pra o simulador nunca divergir do que a venda de fato desconta. Somente leitura.
function simularServicoMoldura(consumoUnitarioM, quantidade, estoqueM, varaM) {
  var cu = Number(consumoUnitarioM) || 0;
  var n = Number(quantidade) || 0;
  var estoque = Number(estoqueM) || 0;
  var vara = Number(varaM) || 0;
  var necessario = Number((cu * n).toFixed(3));
  var sobra = Number((estoque - necessario).toFixed(3));
  var da = sobra >= 0;
  var falta = da ? 0 : Number((-sobra).toFixed(3));
  return {
    consumo_unitario_m: cu,
    quantidade: n,
    necessario_m: necessario,
    estoque_m: estoque,
    sobra_m: da ? sobra : 0,
    falta_m: falta,
    da: da,
    max_quadros: cu > 0 ? Math.floor(estoque / cu) : 0,
    varas_necessarias: vara > 0 ? Math.ceil(necessario / vara) : 0,
    varas_comprar: (da || vara <= 0) ? 0 : Math.ceil(falta / vara)
  };
}

// Modo MANUAL (moldura que não está no sistema): o funcionário informa quanto tem em mãos —
// varas inteiras + um pedaço solto. Se o pedaço ainda não foi desencabeçado (ponta fechada),
// desconta a perda de abrir a ponta (perfil + DESENCABECO_EXTRA). Tudo puro.
function estoqueManualM(varas, pedacoM, perfilCm, pedacoNaoDesencabecado, varaM) {
  var v = Number(varas) || 0;
  var ped = Number(pedacoM) || 0;
  var vara = Number(varaM) || VARA_PADRAO_M;
  var disp = v * vara + ped;
  if (pedacoNaoDesencabecado && ped > 0) {
    disp -= desencabecoM(perfilCm);
  }
  return Number(Math.max(0, disp).toFixed(3));
}

// Simulador no modo manual: perfil digitado (não vem do catálogo), estoque informado à mão.
function simularServicoManual(perfilCm, quantidade, largura, altura, varas, pedacoM, pedacoNaoDesencabecado) {
  var lg = Number(largura), al = Number(altura);
  if (!lg || !al) throw new Error('Informe largura e altura em cm.');
  var consumo = consumoMolduraM(lg, al, perfilCm);
  var estoque = estoqueManualM(varas, pedacoM, perfilCm, pedacoNaoDesencabecado, VARA_PADRAO_M);
  var r = simularServicoMoldura(consumo, quantidade, estoque, VARA_PADRAO_M);
  r.perfil_cm = Number(perfilCm) || 0;
  r.sem_perfil = (r.perfil_cm <= 0);
  r.manual = true;
  return r;
}

// Distribui o valor cobrado (override do funcionário) proporcionalmente entre os itens,
// pra o histórico somar EXATAMENTE o cobrado. A última linha absorve o arredondamento.
// Sem override válido (<=0) ou total calculado 0, devolve os próprios valores calculados.
function _distribuirValor(valoresCalculados, valorTotalCalculado, valorCobrado) {
  var temOverride = Number(valorCobrado) > 0 && Number(valorTotalCalculado) > 0;
  if (!temOverride) {
    return valoresCalculados.map(function (v) { return Number(Number(v).toFixed(2)); });
  }
  var fator = Number(valorCobrado) / Number(valorTotalCalculado);
  var out = [];
  var acum = 0;
  for (var i = 0; i < valoresCalculados.length; i++) {
    if (i === valoresCalculados.length - 1) {
      out.push(Number((Number(valorCobrado) - acum).toFixed(2)));
    } else {
      var v = Number((valoresCalculados[i] * fator).toFixed(2));
      out.push(v);
      acum += v;
    }
  }
  return out;
}

// Taxa fixa pra pintar a chapa quando o quadro leva um OBJETO em relevo/volumoso
// preso nela (camiseta, uniforme, medalha). Independe de tamanho e cor.
var TAXA_PINTURA_CHAPA = 25;

// itens: array de { categoria:'moldura'|'vidro'|'chapa'|'espelho', nome, preco }
// opcoes (opcional): { objetoAlto:true } soma TAXA_PINTURA_CHAPA ao total (taxa interna).
// Retorna o orçamento detalhado item a item.
function calcularOrcamento(larguraCm, alturaCm, itens, opcoes) {
  opcoes = opcoes || {};
  var perim = perimetroM(larguraCm, alturaCm);
  var area = areaM2(larguraCm, alturaCm);
  var linhas = [];
  var total = 0;

  for (var i = 0; i < itens.length; i++) {
    var it = itens[i];
    var bruto, calculoTxt, quantidade, unidade, consumo;

    if (it.categoria === 'moldura') {
      quantidade = perim;
      unidade = 'm';
      bruto = perim * Number(it.preco);
      calculoTxt = 'perímetro ' + perim.toFixed(2) + 'm x R$ ' + it.preco + '/m';
      // baixa de estoque pelo consumo real na vara (cobrança fica no perímetro)
      consumo = consumoMolduraM(larguraCm, alturaCm, it.perfilCm);
    } else {
      quantidade = area;
      unidade = 'm²';
      bruto = area * Number(it.preco);
      calculoTxt = 'área ' + area.toFixed(3) + 'm² x R$ ' + it.preco + '/m²';
      consumo = area; // materiais: baixa pela área mesmo
    }

    var valor = bruto;
    linhas.push({
      categoria: it.categoria,
      item: it.nome,
      quantidade: Number(quantidade.toFixed(3)),
      unidade: unidade,
      calculo: calculoTxt,
      valor: Number(valor.toFixed(2)),
      consumo: Number(consumo.toFixed(3))
    });
    total += valor;
  }

  // Objeto em relevo na chapa → pintura da chapa (taxa fixa interna, não detalhada ao cliente).
  var pinturaChapa = opcoes.objetoAlto ? TAXA_PINTURA_CHAPA : 0;
  total += pinturaChapa;

  var resultado = {
    largura_cm: Number(larguraCm),
    altura_cm: Number(alturaCm),
    perimetro_m: Number(perim.toFixed(2)),
    area_m2: Number(area.toFixed(3)),
    itens: linhas,
    valor_total: Number(total.toFixed(2))
  };
  if (pinturaChapa) resultado.pintura_chapa = pinturaChapa;
  return resultado;
}

// Decide os valores gravados na venda de quadro: distribui os itens e separa a taxa de
// pintura numa linha própria, de modo que (soma dos itens + pintura) = total cobrado.
//  - partes: valores calculados de cada item (SEM a taxa)
//  - valorTotalCalc: orc.valor_total (JÁ inclui a taxa)
//  - taxa: TAXA_PINTURA_CHAPA quando objeto em relevo, senão 0
//  - override: valor cobrado digitado pelo funcionário (0/NaN = sem override)
function _montarValoresQuadro(partes, valorTotalCalc, taxa, override) {
  taxa = Number(taxa) || 0;
  var temOverride = Number(override) > 0;
  var totalCobrado = temOverride ? Number(override) : Number(valorTotalCalc);
  var alvoItens = Number((totalCobrado - taxa).toFixed(2));
  var somaCalc = partes.reduce(function (s, v) { return s + Number(v); }, 0);
  // Só engata a distribuição quando há override ou taxa; senão mantém os valores calculados.
  var cobradoArg = (temOverride || taxa > 0) ? alvoItens : 0;
  var valores = _distribuirValor(partes, somaCalc, cobradoArg);
  return { valores: valores, pintura: taxa, total: Number(totalCobrado.toFixed(2)) };
}
