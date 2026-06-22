// Config.gs — onde está cada coisa. Toda referência a aba/coluna passa por aqui.

var ABAS = {
  MOLDURAS: 'Molduras',
  VIDROS: 'Vidros',
  CHAPAS: 'Chapas',
  ESPELHOS: 'Espelhos',
  AVULSOS: 'Avulsos',
  HISTORICO: 'Historico'
};

// Categoria (singular) -> aba correspondente.
var ABA_POR_CATEGORIA = {
  moldura: ABAS.MOLDURAS,
  vidro: ABAS.VIDROS,
  chapa: ABAS.CHAPAS,
  espelho: ABAS.ESPELHOS,
  avulso: ABAS.AVULSOS
};

// Cabeçalhos exatos de cada aba (ordem das colunas).
var CABECALHOS = {
  Molduras: ['Codigo', 'Nome', 'Marca', 'Estilo', 'Cor', 'Acabamento',
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
  // Avulsos: materiais vendidos à parte (por m²), FORA do cálculo automático do quadro
  // (o orçamento só conhece moldura/vidro/chapa/espelho). Ex.: silicone, passepartout.
  Avulsos:  ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Historico:['Data_hora', 'Tipo_movimentacao', 'Categoria', 'Produto', 'Quantidade',
             'Unidade', 'Valor', 'Cliente', 'Observacoes', 'Codigo']
};

// ====================== FINANCEIRO (caderno digital) ======================
// Módulo separado do estoque: gastos (Saidas) e vendas (Entradas) lançados por você.

// Ano dos lançamentos históricos importados dos CSV (datas vêm como DD/MM).
var ANO_HISTORICO = 2026;

// Abas do financeiro — propositalmente FORA de CABECALHOS (que o seedInicial limpa),
// pra um seed do catálogo nunca apagar dados financeiros.
var ABAS_FIN = {
  SAIDAS: 'Saidas',
  ENTRADAS: 'Entradas',
  RESUMO_MENSAL: 'ResumoMensal',
  USUARIOS: 'Usuarios',
  OFICINA: 'Oficina'
};

var CABECALHOS_FIN = {
  Saidas:       ['id', 'timestamp', 'data', 'descricao', 'valor', 'categoria', 'pagamento', 'obs', 'origem'],
  Entradas:     ['id', 'timestamp', 'data', 'valor', 'forma_pagamento', 'cliente', 'obs', 'origem'],
  ResumoMensal: ['mes', 'ano', 'entrada', 'saida', 'saldo', 'margem'],
  Usuarios:     ['email', 'senha', 'nome', 'ativo', 'papeis'],
  // Oficina: ordens de serviço (texto livre). Protegida do seed, como o resto do financeiro.
  Oficina:      ['ID', 'Data_criacao', 'Cliente', 'Telefone', 'Descricao', 'Prazo', 'Valor',
                 'Status', 'Aviso', 'Data_aviso', 'Data_pronto', 'Data_entrega',
                 'Lancado_financeiro', 'Criado_por', 'Finalizado_por', 'Obs']
};

// Papéis de acesso (login). Acumuláveis (vírgula). 'oficina' só vê a fila de produção;
// 'atendimento'/'dono' veem tudo. Vazio conta como 'atendimento' (retrocompat).
var PAPEIS = ['atendimento', 'oficina', 'dono'];

// Enum fixo de categorias de SAÍDA. O que vier fora cai em 'Outros' (com aviso no log).
var CATEGORIAS_SAIDA = ['Salários', 'Impostos', 'Contas', 'Matéria-Prima',
  'Marketing', 'Financiamento', 'Frete', 'Outros'];

// Formas de pagamento (dropdown dos lançamentos).
var FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito', 'Cartão parcelado',
  'Cheque', 'Link', 'Boleto'];
