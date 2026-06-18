// SeedFinanceiro.gs — importação ÚNICA do histórico (fev–mai) pras abas Saidas/Entradas.
//
// Os CSVs estão embutidos VERBATIM abaixo (origem: saidas_molduraria.csv / entradas_molduraria.csv),
// pra a importação ser um clique no menu, sem depender de upload no Drive. Idempotente:
// reimportar remove só as linhas origem='historico' e regrava — NUNCA toca no que você lançou
// pelo app (origem='app'). Datas DD/MM viram Date com ANO_HISTORICO; valores pt-BR viram número.

var CSV_SAIDAS_HISTORICO = `
mes;data;descricao;valor;categoria;pagamento;obs
Fevereiro;01/02;Descricao ilegivel (topo);1300,00;Outros;Pix;topo da pagina - rever no caderno
Fevereiro;03/02;Pagamento Gui;2000,00;Salarios;Pix;
Fevereiro;03/02;Pagamento Bruna;1633,20;Salarios;Pix;
Fevereiro;04/02;Pagamento Marcos;150,00;Salarios;Boleto;venc 10/02
Fevereiro;04/02;Sistema;185,00;Contas;Cartao;software/ERP
Fevereiro;04/02;Cartao Bruna (Arquiteta Maringa);93,00;Financiamento;RB;
Fevereiro;06/02;Pendurador e prego;111,00;Materia-Prima;RB;
Fevereiro;07/02;Fita gomada;0,00;Materia-Prima;;sem valor registrado (bloco fecha em 5.472,20 sem ela)
Fevereiro;09/02;Cartao loja;1216,76;Financiamento;Boleto;total do cartao anotado 1.986,76
Fevereiro;10/02;Solucao Network;124,99;Contas;Boleto;internet
Fevereiro;11/02;Acerto Marcos;64,52;Salarios;Boleto;
Fevereiro;12/02;Logo marketing / Trafego Pago;550,00;Marketing;Boleto;venc 15/02
Fevereiro;12/02;BNDES 16/22;362,60;Financiamento;Boleto;parcela emprestimo
Fevereiro;13/02;Ruberti Molduras 4/4;405,70;Materia-Prima;Boleto;venc 17/02
Fevereiro;13/02;Receita Federal;76,22;Impostos;Boleto;venc 20/02
Fevereiro;18/02;Chapa Eucatex;265,55;Materia-Prima;Pix;leitura: "Chopp Bucoteca"
Fevereiro;18/02;FGTS Digital;223,04;Impostos;Boleto;venc 20/02
Fevereiro;18/02;Pedanos Porto loja;150,00;Outros;Pix;leitura incerta
Fevereiro;18/02;Pare facil;10,00;Outros;RB;estacionamento
Fevereiro;18/02;Simples Nacional;200,38;Impostos;Boleto;venc 20/02
Fevereiro;20/02;Foto Paranavai (carla shots);7,00;Outros;RB;
Fevereiro;23/02;Espelho Carla (comissao);110,00;Outros;Pix;comissao
Fevereiro;23/02;DAS Bruna;82,32;Impostos;Boleto;venc 20/02
Fevereiro;27/02;Molducenter 4/4;816,00;Materia-Prima;Boleto;
Fevereiro;27/02;North Molduras 4/5;1709,91;Materia-Prima;Boleto;venc 28/02
Fevereiro;27/02;Ludimila marketing;750,00;Marketing;Pix;
Marco;04/03;Pagamento Gui;1600,00;Salarios;Pix;
Marco;04/03;Pagamento Bruna;2300,00;Salarios;Pix;
Marco;07/03;Vassoura;30,00;Outros;RB;leitura: "Cassoura"
Marco;09/03;Moldare Molduras 1/3;673,09;Materia-Prima;Boleto;venc 13/03
Marco;09/03;Sistema;150,00;Contas;RB;pagamento em maos
Marco;09/03;Solucao Network;124,99;Contas;Boleto;internet - venc 15/03
Marco;10/03;Cartao loja;990,05;Financiamento;Boleto;total 1.690,05 / parte mae 700,00
Marco;11/03;BNDES 17/22;362,60;Financiamento;Boleto;venc 15/03
Marco;12/03;Mega Sing (RPC);20,00;Marketing;Pix;categoria incerta
Marco;13/03;Frete molduras Taynara;128,00;Frete;Pix;
Marco;14/03;Trafego Pago;550,00;Marketing;Pix;
Marco;20/03;Simples Nacional;122,04;Impostos;Boleto;venc 20/03
Marco;20/03;FGTS;95,02;Impostos;Boleto;venc 20/03
Marco;20/03;DAS Bruna (Simples Nacional);82,05;Impostos;Boleto;venc 20/03
Marco;20/03;Graphite tintas;43,00;Materia-Prima;RB;
Marco;23/03;Ludimila marketing;750,00;Marketing;Pix;venc 27/03
Marco;23/03;North Molduras 5/5;1709,91;Materia-Prima;Boleto;venc 25/03
Marco;23/03;Moldare Molduras 1/4;830,38;Materia-Prima;Boleto;venc 27/03
Marco;23/03;Sacola;14,80;Outros;RB;embalagem
Marco;24/03;Irineu grampo;210,00;Materia-Prima;Pix;40,00 RB + restante Pix
Marco;24/03;Guia do Marceneiro;265,60;Marketing;Pix;anuncio/diretorio
Abril;02/04;Pagamento Gui;1600,00;Salarios;Pix;
Abril;02/04;Pagamento Bruna;2300,00;Salarios;Pix;
Abril;04/04;Kosmo Tecnologia;150,00;Contas;Boleto;TI/software - venc 10/04
Abril;04/04;Moldare Molduras 2/3;673,00;Materia-Prima;Boleto;venc 12/04
Abril;07/04;Solucao Network;124,99;Contas;Boleto;internet - venc 15/04
Abril;07/04;IPTU loja;74,74;Contas;Boleto;imposto predial (despesa fixa)
Abril;09/04;Douglas eletricista;140,00;Outros;Pix;manutencao
Abril;09/04;Cartao Renael loja;1408,38;Financiamento;Boleto;total 2.108,38 - venc 10/04
Abril;12/04;Moldare Molduras 1/2 (Taynara);488,04;Materia-Prima;Boleto;venc 12/04
Abril;12/04;Tara loro loja;628,91;Contas;Boleto;leitura incerta - venc 15/05
Abril;12/04;BNDES 18/22;362,60;Financiamento;Boleto;venc 15/05
Abril;14/04;Fita gomada;80,00;Materia-Prima;RB;
Abril;13/04;Honorario Escritorio;208,40;Contas;Boleto;contador - venc 15/04
Abril;13/04;Trafego Pago;550,00;Marketing;Pix;
Abril;18/04;Simples Nacional Bruna;82,05;Impostos;Boleto;venc 20/04
Abril;18/04;FGTS Digital;81,60;Impostos;Boleto;venc 20/04
Abril;18/04;Aplicador cola quente;31,99;Materia-Prima;Pix;
Abril;22/04;Mega Sing;32,50;Marketing;Pix;categoria incerta
Abril;24/04;Ludimila marketing;650,00;Marketing;Pix;
Abril;24/04;Frete mold. Aguiar;150,00;Frete;Pix;
Abril;27/04;Molduras Decor 2/4 Aguiar;829,00;Materia-Prima;Boleto;venc 26/04
Abril;27/04;Chapa Eucatex;333,48;Materia-Prima;Pix;leitura: "Chopp Bucoter"
Abril;29/04;Broco loja (Ecletica);250,00;Outros;RB;ferragem/ferramenta? incerto
Maio;04/05;Pagamento Gui;1600,00;Salarios;Pix;
Maio;04/05;Pagamento Bruna;2300,00;Salarios;Pix;
Maio;04/05;North Molduras 1/3;397,33;Materia-Prima;Boleto;venc 03/05
Maio;04/05;Espelho Angelo;244,82;Materia-Prima;Pix;leitura incerta
Maio;07/05;Kosmo Tecnologia;150,00;Contas;Boleto;venc 10/05
Maio;08/05;Cartao loja;2000,52;Financiamento;Boleto;total 2.700,52 - 700,00 - venc 10/05
Maio;08/05;Moldurarte Molduras 1/4;919,35;Materia-Prima;Boleto;venc 11/05
Maio;08/05;Cola;50,00;Materia-Prima;RB;
Maio;08/05;BNDES 19/22;362,60;Financiamento;Boleto;venc 15/05
Maio;08/05;Coleta lixo casa mae;562,29;Contas;Boleto;verificar (pessoal?) - venc 15/05
Maio;08/05;Solucao Network;124,99;Contas;Boleto;internet - venc 15/05
Maio;08/05;Molduras Aguia (Taynara 2/2);487,00;Materia-Prima;Cartao;
Maio;08/05;Molduras Aguiar 3/4;830,38;Materia-Prima;Boleto;venc 26/05
Maio;12/05;Mega Sing (porta retrato);170,00;Marketing;Pix;categoria incerta
Maio;12/05;Cartao Bruna (trafego pago);242,00;Marketing;RB;trafego pago no cartao
Maio;12/05;Honorario Escritorio;275,00;Contas;RB;contador
Maio;15/05;Molduras Aguiar 3/3;691,83;Materia-Prima;Boleto;venc 12/05
Maio;15/05;Trafego Pago;550,00;Marketing;;
Maio;19/05;Simples Nacional;178,22;Impostos;Boleto;venc 20/05
Maio;19/05;FGTS;81,60;Impostos;Boleto;venc 20/05
Maio;19/05;Renovar certificado Digital;175,00;Contas;Pix;
Maio;20/05;North Molduras 2/3;397,34;Materia-Prima;Boleto;venc 31/05
Maio;20/05;Simples Nacional Bruna;82,05;Impostos;Boleto;venc 20/05
Maio;20/05;Mega Sing (Alexandre/Nossara);45,00;Marketing;Pix;categoria incerta
Maio;20/05;TIM;52,99;Contas;Boleto;telefone - venc 15/05
Maio;20/05;Mega Sing (Alexandre);15,00;Marketing;;categoria incerta
Maio;25/05;Moldare Molduras 1/2 (Taynara);590,33;Materia-Prima;;
Maio;25/05;Ludimila marketing;650,00;Marketing;;
`;

var CSV_ENTRADAS_HISTORICO = `
mes;data;descricao;valor;categoria;tipo;obs
Fevereiro;02/02;Caixa vendas;1209,65;Vendas;Entrada;bloco 02-03/02
Fevereiro;04/02;Caixa vendas;1481,88;Vendas;Entrada;bloco 04-07/02
Fevereiro;08/02;Caixa vendas;1335,71;Vendas;Entrada;data do bloco incerta (08-10/02)
Fevereiro;11/02;Caixa vendas;2327,04;Vendas;Entrada;bloco 11-13/02
Fevereiro;14/02;Caixa vendas;1543,04;Vendas;Entrada;bloco 14-18/02
Fevereiro;19/02;Caixa vendas;1034,62;Vendas;Entrada;bloco 19-20/02
Fevereiro;23/02;Caixa vendas;3266,82;Vendas;Entrada;bloco 23-27/02
Marco;02/03;Caixa vendas;1268,08;Vendas;Entrada;
Marco;03/03;Caixa vendas;3148,09;Vendas;Entrada;
Marco;04/03;Caixa vendas;1065,26;Vendas;Entrada;bloco 04-07/03
Marco;09/03;Caixa vendas;1125,27;Vendas;Entrada;bloco 09-10/03
Marco;11/03;Caixa vendas;2572,46;Vendas;Entrada;bloco 11-14/03
Marco;16/03;Caixa vendas;1011,24;Vendas;Entrada;bloco 16-17/03
Marco;18/03;Caixa vendas;852,64;Vendas;Entrada;bloco 18-19/03
Marco;20/03;Caixa vendas;1031,66;Vendas;Entrada;
Marco;21/03;Caixa vendas;330,30;Vendas;Entrada;
Marco;24/03;Caixa vendas;3696,80;Vendas;Entrada;inclui Coopcana cheque 1.965,60
Marco;27/03;Caixa vendas;3253,70;Vendas;Entrada;inclui Taynara 1.940,00
Marco;30/03;Caixa vendas;2077,72;Vendas;Entrada;inclui Fabio 1.300,00
Abril;01/04;Caixa vendas;1981,52;Vendas;Entrada;bloco 01-02/04
Abril;03/04;Caixa vendas;2748,40;Vendas;Entrada;bloco 03-07/04
Abril;08/04;Caixa vendas;1923,60;Vendas;Entrada;bloco 08-09/04
Abril;10/04;Caixa vendas;1746,30;Vendas;Entrada;bloco 10-13/04
Abril;14/04;Caixa vendas;1409,76;Vendas;Entrada;bloco 14-17/04
Abril;18/04;Caixa vendas;1777,69;Vendas;Entrada;bloco 18-23/04
Abril;24/04;Caixa vendas;923,59;Vendas;Entrada;bloco 24-25/04
Abril;27/04;Caixa vendas;1528,89;Vendas;Entrada;bloco 27-28/04
Abril;30/04;Caixa vendas;1564,38;Vendas;Entrada;
Maio;02/05;Caixa vendas;533,60;Vendas;Entrada;bloco 02-04/05
Maio;06/05;Caixa vendas;4890,39;Vendas;Entrada;inclui lancamentos altos (2.890,42 e Miguel 1.117,92)
Maio;08/05;Caixa vendas;1641,63;Vendas;Entrada;bloco 08-09/05; inclui Poliana 1.242 (3 cheques)
Maio;12/05;Caixa vendas;2103,44;Vendas;Entrada;
Maio;14/05;Caixa vendas;934,18;Vendas;Entrada;bloco 14-18/05
Maio;19/05;Caixa vendas;874,86;Vendas;Entrada;
Maio;20/05;Caixa vendas;817,34;Vendas;Entrada;
Maio;21/05;Caixa vendas;1336,49;Vendas;Entrada;bloco 21-23/05
Maio;25/05;Caixa vendas;1435,92;Vendas;Entrada;bloco 25-27/05
Maio;28/05;Caixa vendas;1380,21;Vendas;Entrada;bloco 28-29/05
`;

// Saídas: mes;data;descricao;valor;categoria;pagamento;obs  -> schema da aba Saidas.
function _linhasSaidasHistorico() {
  return _parseCSV(CSV_SAIDAS_HISTORICO).map(function (r, i) {
    var cat = _resolverCategoria(r.categoria, CATEGORIAS_SAIDA);
    if (!cat.reconhecida) Logger.log('Saída histórica fora do enum: "' + r.categoria + '" -> Outros');
    return {
      id: 'HS-' + String(i + 1).padStart(4, '0'),
      timestamp: new Date(),
      data: _parseDataBR(r.data, ANO_HISTORICO),
      descricao: r.descricao || '',
      valor: _parseValorBR(r.valor),
      categoria: cat.categoria,
      pagamento: r.pagamento || '',
      obs: r.obs || '',
      origem: 'historico'
    };
  });
}

// Entradas: mes;data;descricao;valor;categoria;tipo;obs (cada linha = um fechamento de caixa)
//  -> schema da aba Entradas. Sem forma de pagamento no histórico; descrição+obs viram obs.
function _linhasEntradasHistorico() {
  return _parseCSV(CSV_ENTRADAS_HISTORICO).map(function (r, i) {
    var obs = [r.descricao, r.obs].filter(function (x) { return x; }).join(' — ');
    return {
      id: 'HE-' + String(i + 1).padStart(4, '0'),
      timestamp: new Date(),
      data: _parseDataBR(r.data, ANO_HISTORICO),
      valor: _parseValorBR(r.valor),
      forma_pagamento: '',
      cliente: '',
      obs: obs,
      origem: 'historico'
    };
  });
}

// Reescreve a aba: mantém as linhas origem!='historico' (lançadas no app) e troca as históricas.
function _reimportarAba(nomeAba, novasHistoricas) {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba);
  var header = CABECALHOS_FIN[nomeAba];
  var mantidas = lerAba(nomeAba).filter(function (l) { return String(l.origem) !== 'historico'; });
  var todas = mantidas.concat(novasHistoricas);
  if (aba.getLastRow() > 1) aba.getRange(2, 1, aba.getLastRow() - 1, header.length).clearContent();
  if (todas.length) {
    var matriz = todas.map(function (o) {
      return header.map(function (col) { return (o[col] === undefined || o[col] === null) ? '' : o[col]; });
    });
    aba.getRange(2, 1, matriz.length, header.length).setValues(matriz);
  }
  return novasHistoricas.length;
}

// Importação única (idempotente). Rode pelo menu "Financeiro > Importar histórico dos CSV".
function importarHistorico() {
  return comLock(function () {
    garantirAbasFinanceiro();
    var ns = _reimportarAba(ABAS_FIN.SAIDAS, _linhasSaidasHistorico());
    var ne = _reimportarAba(ABAS_FIN.ENTRADAS, _linhasEntradasHistorico());
    _escreverResumoMensal();
    return 'Histórico importado: ' + ns + ' saídas + ' + ne + ' entradas (origem=historico). Lançamentos do app preservados.';
  });
}
