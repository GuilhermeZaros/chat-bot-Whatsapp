// Config.gs — onde está cada coisa. Toda referência a aba/coluna passa por aqui.

var ABAS = {
  MOLDURAS: 'Molduras',
  VIDROS: 'Vidros',
  CHAPAS: 'Chapas',
  ESPELHOS: 'Espelhos',
  HISTORICO: 'Historico'
};

// Categoria (singular) -> aba correspondente.
var ABA_POR_CATEGORIA = {
  moldura: ABAS.MOLDURAS,
  vidro: ABAS.VIDROS,
  chapa: ABAS.CHAPAS,
  espelho: ABAS.ESPELHOS
};

// Cabeçalhos exatos de cada aba (ordem das colunas).
var CABECALHOS = {
  Molduras: ['Codigo', 'Nome', 'Modelo', 'Estilo', 'Cor', 'Acabamento',
             'Largura_perfil_cm', 'Valor_por_metro', 'Preco_minimo', 'Foto_URL',
             'Descricao', 'Tags', 'Estoque_atual_m', 'Estoque_minimo_m', 'Disponivel',
             'Custo_por_metro'],
  Vidros:   ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Chapas:   ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Espelhos: ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Historico:['Data_hora', 'Tipo_movimentacao', 'Categoria', 'Produto', 'Quantidade',
             'Unidade', 'Valor', 'Cliente', 'Observacoes', 'Codigo']
};
