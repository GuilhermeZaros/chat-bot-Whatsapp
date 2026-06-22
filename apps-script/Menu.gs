// Menu.gs — menu customizado na planilha. Roda quando você ABRE o Google Sheets.
// (É o menu do Sheets, não do web app. As ações tocam o Sheets, então a 1ª vez pede
//  autorização no navegador.)

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💰 Financeiro')
    .addItem('Atualizar dados dos CSV (importar histórico)', 'importarHistorico')
    .addItem('Recalcular dashboard (resumo mensal)', 'recalcularResumoMensal')
    .addSeparator()
    .addItem('Criar/conferir abas financeiras', 'garantirAbasFinanceiro')
    .addItem('Conferir/criar usuários (login)', 'garantirAbaUsuarios')
    .addItem('Criar aba Oficina + papéis (e gerar token do bot)', 'prepararOficina')
    .addSeparator()
    .addItem('Remover coluna Modelo das molduras (1x)', 'removerColunaModelo')
    .addItem('Importar custos das molduras (do relatório)', 'importarCustosMolduras')
    .addItem('Definir marca/fornecedor das molduras (+ coluna)', 'definirMarcaMolduras')
    .addItem('Importar fotos das molduras (Drive)', 'importarFotosMolduras')
    .addItem('Criar/atualizar avulsos (silicone + passepartout)', 'importarAvulsos')
    .addToUi();
}
