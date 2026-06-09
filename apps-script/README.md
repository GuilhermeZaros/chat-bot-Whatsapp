# Apps Script — API de Estoque da Molduraria

Banco de dados em Google Sheets, lógica e API em Google Apps Script.
Código versionado via [clasp](https://github.com/google/clasp).

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `Config.gs` | Nomes de abas e cabeçalhos (fonte única) |
| `Calculo.gs` | Perímetro/área/orçamento — funções puras (testadas em Node) |
| `Repo.gs` | Acesso ao Sheets + `LockService` |
| `Catalogo.gs` | Leituras: buscar/listar/consultar/orçamento |
| `Movimentacao.gs` | Escritas: venda/entrada/histórico (para a Fase 3) |
| `Seed.gs` | `seedInicial()`: cria abas e popula o catálogo |
| `Api.gs` | `doGet`/`doPost` → JSON (somente leitura) |

## Comandos

```bash
clasp push -f      # sobe o código local pro Apps Script
clasp deploy       # publica nova versão do Web App
clasp open-script  # abre o editor no navegador
```

Rodar o seed inicial: abra o editor, selecione `seedInicial` e clique Executar
(autoriza os escopos na 1ª vez).

## API (somente leitura)

Endpoints via `GET ?action=`:

- `ping`
- `buscarMolduras&estilo=&cor=&acabamento=&limite=`
- `listarMateriais&tipo=vidro|chapa|espelho`
- `consultarProduto&codigo=`
- `calcularOrcamento&moldura=&vidro=&chapa=&espelho=&largura=&altura=`

Resposta: `{ "ok": true, "dados": ... }` ou `{ "ok": false, "erro": "..." }`.

A escrita (venda/entrada/edição) acontecerá pela interface interna (Fase 3),
não pela API pública.

## URLs do projeto

- **Planilha:** https://docs.google.com/spreadsheets/d/1Xl7lWIGA4LLsweTTzFFnk7wdcQBwd_es1N_Ff9WPNrw/edit
- **Editor do script:** https://script.google.com/d/13JDZCv_2ZkebT14NB-jbQ_5CGGpyh5cSc6yjaFDCfl3eOAp0CI7hRVg_/edit
- **Web App (`/exec`):** vai no `.env` do bot como `APPS_SCRIPT_URL` na Fase 2.

> A URL `/exec` muda a cada `clasp deploy` que cria um deployment novo. Para manter
> a mesma URL, atualize o deployment existente: `clasp deploy --deploymentId <ID>`.
