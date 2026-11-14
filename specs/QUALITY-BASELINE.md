# Quality Baseline — v2.40.0

> **Snapshot de medição, não de promessa.** Build e primeiras execuções medidos em 2026-11-14 no commit `7c9de34` (v2.38.0); suíte e flake no commit `bd9b22f` (v2.39.0); cobertura no commit `c695bf3` (v2.40.0).
> Este arquivo é histórico, no mesmo espírito do `CHANGELOG.md`: `npm run verify:docs` não o valida nem o reescreve.
> Atualize-o ao fechar cada fase do plano de qualidade, nunca para "fazer o número bater".

---

## 1. Suíte de testes

| Métrica | Valor |
|---|---|
| Arquivos de teste | **104** (103 em `src/` + 1 em `tools/__tests__/`) |
| Casos de teste | **872** |
| Resultado | 872 passando, 0 falhando, 0 pendentes |
| Duração da última execução | **178,07 s** (transform 114,83 s · import 442,15 s · tests 106,19 s · environment 1.579,50 s) |
| Variação observada entre execuções | 155 s – 200 s no mesmo commit, antes da F2 |
| Suítes (arquivos + describes) | 355 |

O gargalo não é a execução dos casos (106 s): é a soma de tempo de ambiente entre workers (1.579 s). A falha intermitente de `src/components/__tests__/VaultModalScreens.test.tsx`, que motivou a F2, foi corrigida e está registrada em §6.

## 2. Build de produção (`npm run build`, vite 6)

| Chunk | Tamanho | gzip |
|---|---|---|
| `index-*.js` (entry) | **2.101,90 kB** | 589,95 kB |
| `xlsx` | 494,18 kB | 161,14 kB |
| `vendor-charts` (recharts) | 411,17 kB | 119,42 kB |
| `jspdf.es.min` | 390,66 kB | 128,81 kB |
| `usePositionHistory` | 205,37 kB | 28,03 kB |
| `html2canvas.esm` | 202,38 kB | 48,04 kB |
| `index.es` | 159,71 kB | 53,58 kB |
| `MarketAnalyticsDashboard` | 142,04 kB | 33,77 kB |
| `Settings` | 124,71 kB | 28,14 kB |
| `PortfolioPerformance` | 76,75 kB | 17,59 kB |
| `vendor-icons` (lucide-react) | 61,91 kB | 14,09 kB |
| `AiSettings` | 61,73 kB | 14,64 kB |

- Tempo de build: **1 min 37 s**; 46 assets em `dist/assets`; `dist` total **7,7 MB**.
- JavaScript total: **5.093.697 bytes** (≈ 4,86 MiB).
- Precache do PWA: **55 entradas / 6.625,53 KiB**.
- O entry de 2,1 MB é composto pelo que ainda é importado de forma eager em `src/App.tsx` (`Dashboard`, `OpenPositions`, `WorkSpace`, `AiChatDrawer`, `Sidebar`, `PositionsTicker` e modais). As 18 rotas lazy já existentes não entram nele.

## 3. Documentação

O guard vive em `tools/verify-docs.mjs` (fora de `scripts/`, que é ignorado pelo git) com testes em `tools/__tests__/`. Onze arquivos declaram fatos sobre o código e agora são verificados por `npm run verify:docs`:

`README.md`, `index.html`, `metadata.json`, `specs/ARCHITECTURE.md`, `specs/PRD.md` e os 6 arquivos de `user_manual/`.

O guard compara, linha a linha:

- versão (badge, cabeçalho, descrição de metadata e rodapé) contra `package.json`;
- contagem de arquivos de teste e de casos contra `.quality/test-suite.json`, gerado por `npm test`;
- contagem de chaves i18n contra `src/locales/*.json`, exigindo paridade entre os 6 idiomas.

O CI executa o guard **apenas em pull requests**: o semantic-release altera a versão em `main` antes de os documentos serem sincronizados, então bloquear pushes em `main` travaria o próprio release.

## 4. Limitações conhecidas nesta baseline

- **Cobertura global medida na F3** (§7): 43,62% das linhas de `src/`, com thresholds por diretório aplicados em `vite.config.ts`. Os pontos fracos são `src/components` (31,5%) e `src/hooks` (30,3%).
- **Flake do cofre corrigido na F2** (§6). As demais limitações abaixo continuam válidas.
- **Sem ESLint.** `npm run lint` continua sendo apenas `tsc --noEmit`; nenhuma regra de hooks, complexidade ou aritmética é aplicada (fases F4 e F5).
- **Contagem de testes é sensível a novas suítes.** Qualquer teste novo muda `.quality/test-suite.json` e exige atualizar os documentos no mesmo PR. É o comportamento desejado do ratchet, não um defeito.

## 5. Como reproduzir

```bash
npm ci
npm test              # 104 arquivos / 872 testes; grava .quality/test-suite.json
npm run verify:docs   # confere a documentação contra o código
npm run test:coverage # cobertura de toda a src/ + thresholds por diretório
npm run test:vault    # arquivo do cofre isolado, usado para investigar o flake
npm run lint          # tsc --noEmit
npm run build         # build de produção + precache do PWA
```

## 6. F2 — estabilização do teste do cofre

**Causa medida.** Uma única derivação PBKDF2-SHA-256 custa, no Node/jsdom desta máquina:

| Iterações | Tempo por derivação |
|---|---|
| 1.000 | 2,6 ms – 7,2 ms |
| 600.000 (produção) | 271 ms – 362 ms |

Cada fluxo de cofre exercitado pelos testes deriva a chave duas vezes (cifrar e decifrar), consumindo 540–720 ms dos 1.000 ms de orçamento do `waitFor` padrão do Testing Library. A falha dependia da carga da máquina, não da lógica do cofre.

**Correção.** `src/utils/cryptoLib.ts` passou a expor `getPbkdf2Iterations()` e `setPbkdf2IterationsForTesting(n)`. Os quatro pontos do `apiKeysStore` (`syncEncryption`, `initializeVault`, `changePassphrase`, `migrateUnencryptedKeys`) leem a iteração de `getPbkdf2Iterations()` em vez de usarem a constante diretamente, de modo que a chave derivada e o envelope gravado sempre concordam. O valor continua sendo gravado no envelope (`iter`), então o texto cifrado segue autodescritivo e a decifragem não depende do override estar ativo.

**Por que não um setup global.** `cryptoLib.test.ts` afirma que o envelope de produção grava `iter: 600000`. Um setup global reduzindo iterações para toda a suíte esconderia exatamente essa regressão. A injeção é explícita nos arquivos que exercitam o cofre (`VaultModalScreens.test.tsx`, `apiKeysStore.test.ts`), com `afterAll` restaurando `null`.

**Prova.** 10 execuções consecutivas de `src/components/__tests__/VaultModalScreens.test.tsx`: 10/10 com exit 0, zero falhas. Suíte completa após a mudança: 104 arquivos, 872 testes, 0 falhas em 178,07 s (antes: 155–190 s, com falha intermitente). `cryptoLib.test.ts` ganhou 4 casos cobrindo o default de 600.000, o `iter` injetado, o round-trip após remover o override e a rejeição de valores inválidos.

## 7. F3 — cobertura real de `src/` e ratchet por diretório

**O que estava errado.** `coverage.include` listava apenas `src/store/fundingStore.ts` e `src/services/funding/**`. O relatório, portanto, dizia "cobertura" mas media dois caminhos: os 253 arquivos restantes nem entravam no denominador. Qualquer número exibido era verdadeiro sobre um escopo irrelevante.

**O que passou a ser medido.** `include: ['src/**/*.{ts,tsx}']`, com `all` implícito do Vitest 4: o denominador inclui arquivos que nenhum teste importa. Excluídos apenas testes, `*.d.ts`, `src/main.tsx` (bootstrap de React + service worker, inalcançável em jsdom) e `node_modules`. Relatório em `.quality/coverage/` (`json-summary` + `text-summary`, diretório já ignorado pelo git).

**Medição.** `npm run test:coverage` em 2026-11-14, 104 arquivos / 872 testes verdes, 194,76 s:

| Métrica | Cobertura |
|---|---|
| Statements | **42,35%** (8.207/19.377) |
| Branches | **32,25%** (6.281/19.474) |
| Functions | **37,87%** (1.449/3.826) |
| Lines | **43,62%** (7.533/17.266) |

254 arquivos de origem, **79 deles com 0% de linhas** — 4.190 linhas que nenhuma execução toca.

| Diretório | Arquivos | Linhas | Lines | Statements | Branches | Functions |
|---|---|---|---|---|---|---|
| `src/components` | 144 | 6.648 | 31,5% | 30,9% | 21,7% | 26,8% |
| `src/services` | 35 | 5.797 | 49,7% | 48,2% | 35,7% | 51,5% |
| `src/hooks` | 25 | 2.143 | 30,3% | 30,1% | 21,6% | 38,6% |
| `src/utils` | 24 | 1.676 | 81,9% | 79,0% | 66,0% | 86,1% |
| `src/store` | 15 | 669 | 54,3% | 53,1% | 39,6% | 50,9% |
| `src/mock` (fixtures) | 1 | 143 | 96,5% | 95,7% | 84,0% | 100% |
| `src/App.tsx` + `src/types.ts` | 2 | 120 | 0% | 0% | 0% | 0% |
| `src/config` | 2 | 36 | 16,7% | 16,7% | 15,2% | 100% |
| `src/context` | 1 | 17 | 82,4% | 83,3% | 75,0% | 100% |
| `src/i18n` | 1 | 17 | 70,6% | 60,0% | 30,0% | 100% |

Os quatro maiores arquivos concentram o risco: `BitgetClassicAdapter.ts` (501 linhas, 54%), `BitgetUTAAdapter.ts` (454, 64%), `portfolioPerformanceEngine.ts` (437, 89%) e `BybitAdapter.ts` (427, **0%**). `historyCache.ts` — 1.458 linhas e 65 exports, candidato da F7 — aparece com 15% das 399 linhas que o v8 contabiliza, e `useFundingSync.ts` (304 linhas) com 0%.

**Thresholds aplicados** (`vite.config.ts`), cada um ~5 pontos abaixo do medido para absorver variação sem virar ruído:

| Escopo | Lines | Statements | Branches | Functions |
|---|---|---|---|---|
| global | 40 | 38 | 28 | 33 |
| `src/utils/**` | 76 | 74 | 61 | 81 |
| `src/store/**` | 50 | 48 | 35 | 46 |
| `src/services/**` | 45 | 44 | 31 | 47 |
| `src/hooks/**` | 26 | 26 | 17 | 34 |
| `src/components/**` | 27 | 26 | 17 | 22 |
| `src/config/**` | 12 | 12 | 10 | — |

O threshold é um **ratchet, não uma meta**: suba os números quando a cobertura subir, nunca desça para destravar um PR. A execução seguinte, já com os thresholds ativos, saiu com exit 0 e percentuais idênticos à medição (43,62% de linhas; functions variou 0,02 ponto), então a folga é real e não um número copiado.

**Cuidado operacional.** Como o denominador inclui arquivos que a execução não carregou, rodar `vitest run <arquivo> --coverage` falha todos os thresholds (medido: 0% de linhas, exit 1). Cobertura só faz sentido com a suíte inteira; é para isso que existe o script dedicado.

**Fora de escopo (F3).** O CI ainda **não** roda `npm run test:coverage`; adicioná-lo soma ~3 min ao job e precisa de decisão própria. Nenhum teste novo foi escrito para elevar os números — a fase foi de medição honesta, não de maquiagem.
