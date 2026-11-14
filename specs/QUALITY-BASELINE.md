# Quality Baseline — v2.40.0

> **Snapshot de medição, não de promessa.** Build e primeiras execuções medidos em 2026-11-14 no commit `7c9de34` (v2.38.0); suíte e flake no commit `bd9b22f` (v2.39.0); cobertura no commit `c695bf3` (v2.40.0).
> Este arquivo é histórico, no mesmo espírito do `CHANGELOG.md`: `npm run verify:docs` não o valida nem o reescreve.
> Atualize-o ao fechar cada fase do plano de qualidade, nunca para "fazer o número bater".

---

## 1. Suíte de testes

| Métrica | Valor |
|---|---|
| Arquivos de teste | **110** (109 em `src/` + 1 em `tools/__tests__/`) |
| Casos de teste | **921** |
| Resultado | 921 passando, 0 falhando, 0 pendentes |
| Duração da última execução | **160,46 s** (transform 110,37 s · import 440,04 s · tests 116,44 s · environment 1.398,60 s) |
| Variação observada entre execuções | 155 s – 210 s no mesmo commit, antes da F2 |
| Suítes (arquivos + describes) | 358 |

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

- **Cobertura global** (§7 e §9): 48,44% das linhas de `src/`, com thresholds por diretório em `vite.config.ts`. Os pontos fracos restantes são `src/components` (39,3%) e `src/hooks` (43,9%).
- **Flake do cofre corrigido na F2** (§6). As demais limitações abaixo continuam válidas.
- **ESLint bloqueia no CI, com teto ratchetado.** `npm run lint` continua sendo apenas `tsc --noEmit`; `npm run lint:eslint` roda também no job `validate` com `--max-warnings` fixado no medido (§9). Regras de aritmética/financeiras continuam ausentes.
- **Contagem de testes é sensível a novas suítes.** Qualquer teste novo muda `.quality/test-suite.json` e exige atualizar os documentos no mesmo PR. É o comportamento desejado do ratchet, não um defeito.

## 5. Como reproduzir

```bash
npm ci
npm test              # 105 arquivos / 882 testes; grava .quality/test-suite.json
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

**CI.** `npm run test:coverage` passou a rodar em **pull requests**, num job separado (`coverage`) que não alonga o caminho crítico do job de validação. Em `main` não roda: todo commit chega por PR e os commits de release não tocam `src/`. Enquanto isso, nenhum teste novo foi escrito apenas para elevar os números — a fase foi de medição honesta, não de maquiagem.

### 7.1 F4 — `useFundingSync` e o novo patamar de `src/hooks`

**O que foi testado.** `src/hooks/__tests__/useFundingSync.test.tsx`, 10 casos sobre os 304 linhas que estavam em 0%. O hook orquestra três fontes de I/O (rede, IndexedDB, stores) e timers, então os testes mockam `FundingService`, `historyCache` e `LogManager` e usam os stores reais, resetando o estado em `beforeEach`. Casos cobertos:

- modo mock: nenhuma chamada de rede, apenas o log `Mock mode active`;
- caminho feliz: 2 símbolos obsoletos de uma exchange → `saveFundingSummariesBatch` chamado **uma vez** com o lote, `syncMessage`, `lastHistoryFetch`, `lastSyncTime` e `lastSyncPerformance` atualizados;
- símbolos cujo último funding é `'0'` contados como pulados, sem gravar lote;
- cache fresco (`latestTimestamp` recente) pula o fetch de histórico inteiro;
- falha de uma exchange preserva as demais; falha de todas preserva o snapshot anterior e registra 3 erros;
- gate de `fundingHistoryInterval`: sem `getFundingMeta` quando o último fetch está dentro da janela;
- agendamento em `nextFundingTime + 60 s`, disparo do auto-sync e do evento `funding-cache-cleared`;
- pedido manual durante sync em voo vira restart, não descarte (verifica as duas mensagens de log e a segunda passada);
- `unmount` limpa interval/timeout e nenhuma busca acontece depois.

**Nova medição.** 105 arquivos / 882 testes verdes, 271,20 s, com os thresholds antigos ativos:

| Escopo | Lines | Statements | Branches | Functions |
|---|---|---|---|---|
| `src/hooks` | **43,86%** (940/2.143) | 42,03% (1.052/2.503) | 28,02% | 44,85% |
| global | 45,30% | 43,89% | 32,74% | 38,68% |

`src/hooks` subiu de 30,3% para 43,86% de linhas; o global foi de 43,62% para 45,30%. Os demais diretórios praticamente não se moveram, então só o threshold de `src/hooks` mudou: **38 / 37 / 23 / 39** (lines/statements/branches/functions), seguindo a mesma folga de ~5 pontos. O global continua em 40/38/28/33, ainda abaixo do medido.

**Timeout do job de cobertura.** A primeira execução completa com cobertura falhou por timeout: `src/components/__tests__/Settings.test.tsx` estourou os 5.000 ms padrão do Vitest sob instrumentação (o mesmo arquivo passa isolado em 2,48 s de testes e a suíte sem cobertura fechou verde duas vezes). Não é uma asserção afrouxada: o script `test:coverage` passou a usar `--testTimeout=15000`, porque a instrumentação multiplica a avaliação de módulos e os runners de CI são mais lentos que a máquina local. O `npm test` mantém os 5 s, que continuam valendo como detector de travamento na execução normal.

## 8. F5 — ESLint: hooks, complexidade e `any`

**Por que só agora.** `npm run lint` é `tsc --noEmit`, e o TypeScript não expressa três classes de defeito que já apareceram no projeto: hooks chamados fora de ordem (erro em tempo de execução, não de compilação), funções grandes demais para revisar e `any` explícito desligando a checagem justamente onde o dado vem de fora. Até esta fase nada disso era medido.

**Configuração.** ESLint 9 em flat config (`eslint.config.js`), com `typescript-eslint` 8.72.2 como parser e `eslint-plugin-react-hooks` 6.1.1. Escopo `src/**/*.{ts,tsx}`, quatro regras, nenhum preset "recommended" — um preset completo geraria centenas de achados de estilo e afogaria os que importam:

| Regra | Severidade | O que pega |
|---|---|---|
| `react-hooks/rules-of-hooks` | **error** | hook condicional, em loop ou depois de `return` antecipado |
| `react-hooks/exhaustive-deps` | warn | dependência ausente/instável em efeito |
| `complexity` (máx. 15) | warn | caminhos independentes por função |
| `@typescript-eslint/no-explicit-any` | warn | `any` escrito à mão |

O script `npm run lint:eslint` é separado de `npm run lint` de propósito: trocar o `lint` existente quebraria o job de CI que roda `tsc --noEmit`.

**Medição** (`npx eslint src -f json`, 363 arquivos analisados, 2026-11-14):

| Regra | Achados | Arquivos | Concentração |
|---|---|---|---|
| `@typescript-eslint/no-explicit-any` | **537** | 103 | `src/services` 315, `src/hooks` 93, `src/components` 80 |
| `complexity` | **194** | 106 | 34 funções acima de 50; `src/services` 78, `src/components` 72 |
| `react-hooks/exhaustive-deps` | **31** | 24 | `src/hooks` 21 |
| `react-hooks/rules-of-hooks` | **4** | 1 | corrigido nesta fase, ver abaixo |
| diretivas `eslint-disable` órfãs | **3** | 3 | supressão que não suprime mais nada |

Total: **765 avisos e 0 erros** em 161 dos 363 arquivos — 44% da base tem ao menos um achado, o que diz menos sobre o estilo e mais sobre onde a base concentra risco: os adaptadores de exchange e os executores de ferramentas de IA.

As dez funções mais complexas, que são o alvo natural da próxima fase de refatoração:

| Complexidade | Local |
|---|---|
| 181 | `InverseMarketService.fetchInverseMarketOverview` |
| 154 | `AiAuditDetailsModal` (componente) |
| 149 | `BitgetClassicAdapter.normalizeTxLogEntry` |
| 140 | `PositionCard` (componente) |
| 133 | `BitgetUTAAdapter.normalizeTxLogEntry` |
| 132 | `aiToolExecutors.aiGetFundingFeesHistory` |
| 118 | `OrderRow` (componente) |
| 104 | `MarketAnalyticsService.buildLiveSnapshot` |
| 97 | `transactionTypeMapper.getOkxUniversalType` |
| 92 | `OkxTransactionRow` (componente) |

**O bug que a regra encontrou.** `CrossExchangeAssetsChart` retornava `null` para lista vazia **antes** de chamar `useTranslation`, `useFormatCurrency` e dois seletores de `useSettingsStore` (linhas 142–145). Enquanto `data` fosse sempre não vazio o defeito ficava invisível; no primeiro render em que os dados chegassem vazios depois de um render com dados, o React lançaria "Rendered fewer hooks than expected" e a árvore cairia. A correção move o `return null` para abaixo dos hooks — quatro linhas, sem mudança de saída. Verificado com `npx eslint` no arquivo (0 erros restantes) e `npm run lint` (exit 0); não há teste de render cobrindo a transição de dados, então a garantia é estática, não comportamental.

As três diretivas órfãs (`OrderHistory.tsx:50`, `TradeHistory.tsx:48`, `Pagination.tsx:85`) suprimem `exhaustive-deps` sem que a regra dispare ali. Não indicam bug: indicam que a dependência foi corrigida e o comentário ficou. Ficaram como estão para não misturar limpeza com medição.

**Por que ainda não é gate.** Todas as regras restantes são avisos, então `npm run lint:eslint` sai com exit 0 e não bloqueia nada. Ligar isso no CI como está só adicionaria ruído. O passo seguinte, quando os achados caírem, é o mesmo ratchet da cobertura: `--max-warnings` um pouco acima do medido, baixando a cada fase, e só então o job no CI.

## 9. Fechamento de F3/F4 — gate de ESLint, `noImplicitAny` e cobertura de componentes

**Contexto.** §7.1 e §8 mediram; esta seção registra o que virou regra. Três frentes, todas verificadas por execução.

**1. ESLint como gate.** `npm run lint:eslint` passou a rodar no job `validate` do CI com `--max-warnings 747`, o número medido depois do lote de tipagem abaixo. É ratchet: o teto só desce. Qualquer aviso novo falha o PR antes de chegar ao `main`. O comando continua separado de `npm run lint` (`tsc --noEmit`), então nada mudou para quem depende do script antigo.

**2. `noImplicitAny: true`.** A suposição de que ligar a flag abriria centenas de erros estava errada: a base já anotava quase tudo, e só **4** erros apareceram — um `any` implícito de retorno recursivo (`AiTableRenderer`), um index de `CurrencyStats` escondido por `as any`, um parâmetro de `list.map` no `BybitAdapter` e a ausência de `@types/react-dom` (adicionado como devDependency). Os quatro foram corrigidos sem cast novo, e `npm run lint` segue exit 0 com a flag ligada.

**3. Primeiro lote de `any` — `src/utils/`.** 13 sites removidos, zero restantes no diretório (excluindo testes). O padrão que substituiu o `any` foi `unknown` + leitura segura de propriedade, não `as`. `retryHelper.ts` foi o caso central: `isRateLimited`, `isAuthError`, `isTransientError`, `classifyError` e `executeWithRetry` agora aceitam `unknown` e leem status/código/mensagem por uma função `get()`, porque as cinco exchanges discordam sobre a chave da mensagem de erro. `transactionTypeMapper` ganhou a interface `TxEntryLike` que os payloads crus satisfazem estruturalmente. Os 59 testes de `utils` continuam verdes.

Contagem de `no-explicit-any` no ESLint: **537 → 519** (o lote de `utils` mais os `as any` removidos). `: any` literal: **329 → 316**, ainda concentrado em `src/services` (172), `src/components` (70) e `src/hooks` (55). Esses três diretórios são os próximos lotes, na ordem do plano.

**4. Cobertura de `src/components`.** Cinco arquivos de caracterização novos atacaram os maiores buracos: `PositionCard` (98,2%), `OpenPositions` (93,3%), `ClosedPositions` (86,9%), `Dashboard` (83,4%) e `SecurityBackupCard` (48,7%). Resultado no diretório: **31,5% → 39,34%** de linhas, e o global foi de 45,30% para **48,44%**.

| Escopo | Antes | Depois | Novo threshold |
|---|---|---|---|
| `src/components` | 31,5% | **39,34%** | 34/24/28/34 (stmts/branches/funcs/lines) |
| global | 45,30% | **48,44%** | 42/31/37/43 (stmts/branches/funcs/lines) |

Ainda restam **50 arquivos de `components` em 0%**, somando ~2.200 linhas — o maior deles é `AiChatDrawer` (186 linhas), seguido de `TradeHistory` (172) e `OrderHistory` (128). A cobertura subiu nos arquivos que mais importam para o produto, não por igual.

**Estado:** 110 arquivos / 921 testes, exit 0; `npm run lint` exit 0 com `noImplicitAny: true`; `npm run lint:eslint` exit 0 com 747 avisos; `npm run test:coverage` exit 0 com os thresholds acima; `verify:docs` OK.
