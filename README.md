# Chat-bot WhatsApp + Controle de Estoque — Vera Molduras e Decoração

Sistema de atendimento automatizado no WhatsApp e controle de estoque para a
molduraria **Vera Molduras e Decoração** (Paranavaí-PR).

## O que faz

- **Atendente virtual no WhatsApp ("Bruna")**: responde clientes, busca molduras e
  materiais, calcula orçamento e envia fotos. Feito em Node + [Baileys](https://github.com/WhiskeySockets/Baileys)
  (WhatsApp) + Google Gemini.
- **Controle de estoque** com Google Sheets como banco de dados e Google Apps Script
  como API e interface web dos funcionários (vendas, entradas, cadastro de produtos,
  relatórios financeiros e um simulador de viabilidade de serviço).

## Regras de negócio

- Moldura é cobrada pelo **perímetro** (metro linear).
- Vidro, chapa e espelho são cobrados pela **área** (m²).
- A **baixa de estoque** da moldura usa o consumo real na vara: perímetro + cantos
  (8 × perfil) + a perda dos cortes em 45° (4 × √2 × perfil, que cresce com a largura
  do perfil) + a perda da serra. A cobrança ao cliente continua pelo perímetro.

## Estrutura

| Pasta | O quê |
|---|---|
| `apps-script/` | Backend no Google Apps Script: cálculo de orçamento, API JSON, e a interface web dos funcionários (HTML/CSS/JS) |
| `lib/` | O bot do WhatsApp (Baileys + Gemini), as tools e o acesso à API |
| `index.js` | Loop principal do WhatsApp |
| `scripts/` | Utilitários (chat no terminal, smoke tests) |
| `test/` | Testes automatizados (`node --test`) |

## Como rodar

```bash
npm install
npm test        # roda os testes
npm run chat    # conversa com a Bruna no terminal
npm start       # sobe o bot do WhatsApp
```

O backend (Apps Script) é versionado com [clasp](https://github.com/google/clasp):
`clasp push` para subir o código e `clasp deploy` para publicar.

### Variáveis de ambiente (`.env`)

```
GEMINI_API_KEY=...
APPS_SCRIPT_URL=...   # URL /exec do Web App do Apps Script
```
