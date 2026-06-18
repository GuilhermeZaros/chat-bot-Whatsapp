// Api.gs — porta HTTP. doGet com ?action= responde JSON (somente leitura).
// Sem action, serve um placeholder (a interface chega na Fase 3).
// doPost é reservado: escrita acontece pela interface, não pela API pública.

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : null;
  if (!action) {
    // Interface humana: serve sempre. Quem tranca é a tela de login + a validação de
    // sessão no servidor — não o e-mail Google. O bot nunca cai aqui (usa ?action=).
    return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Vera Molduras — Estoque')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  try {
    return _json({ ok: true, dados: _rotear(action, e.parameter) });
  } catch (err) {
    return _json({ ok: false, erro: String(err && err.message ? err.message : err) });
  }
}

// Inclui o conteúdo de outro arquivo .html (Styles/JavaScript) dentro do template.
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  return _json({ ok: false, erro: 'Esta API é somente leitura. Use a interface interna para registrar movimentações.' });
}

function _rotear(action, p) {
  switch (action) {
    case 'ping':
      return { pong: true, hora: new Date() };
    case 'dashboardResumo':
      return dashboardResumo();
    case 'listarProdutos':
      return listarProdutos();
    case 'obterProduto':
      return obterProduto(p.codigo);
    case 'buscarMolduras':
      return buscarMolduras({ estilo: p.estilo, cor: p.cor, acabamento: p.acabamento, limite: p.limite });
    case 'listarMateriais':
      return listarMateriais(p.tipo);
    case 'consultarProduto':
      return consultarProduto(p.codigo);
    case 'calcularOrcamento':
      return orcamentoPorCodigos({
        moldura: p.moldura, vidro: p.vidro, chapa: p.chapa, espelho: p.espelho,
        largura: p.largura, altura: p.altura, objetoAlto: p.objetoAlto
      });
    case 'relatorios':
      return relatorios(p.periodo);
    case 'simularServico':
      return simularServico(p.moldura, p.quantidade, p.largura, p.altura);
    case 'simularServicoManual':
      return simularServicoManual(p.perfil, p.quantidade, p.largura, p.altura,
                                  p.varas, p.pedaco, _ehDisponivel(p.naoDesencabecado));
    default:
      throw new Error('Ação desconhecida: ' + action);
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
