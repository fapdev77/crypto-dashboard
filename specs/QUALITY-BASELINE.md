# Quality Baseline — v2.39.0

> **Snapshot de medição, não de promessa.** Build e primeiras execuções medidos em 2026-11-14 no commit `7c9de34` (v2.38.0); contagens e durações finais atualizadas no commit `77690c7` (v2.39.0).
> Este arquivo é histórico, no mesmo espírito do `CHANGELOG.md`: `npm run verify:docs` não o valida nem o reescreve.
> Atualize-o ao fechar cada fase do plano de qualidade, nunca para "fazer o número bater".

---

## 1. Suíte de testes

| Métrica | Valor |
|---|---|
| Arquivos de teste | **104** (103 em `src/` + 1 em `tools/__tests__/`) |
| Casos de teste | **872** |
| Resultado | 868 passando, 0 falhando, 0 pendentes |
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

- **Cobertura global ainda não medida.** `vite.config.ts` mantém `coverage.include` restrito a `src/store/fundingStore.ts` e `src/services/funding/**`. O script `npm run test:coverage` já existe; a medição real de toda a `src/` é a fase F3.
- **Flake do cofre corrigido na F2** (§6). As demais limitações abaixo continuam válidas.
- **Sem ESLint.** `npm run lint` continua sendo apenas `tsc --noEmit`; nenhuma regra de hooks, complexidade ou aritmética é aplicada (fases F4 e F5).
- **Contagem de testes é sensível a novas suítes.** Qualquer teste novo muda `.quality/test-suite.json` e exige atualizar os documentos no mesmo PR. É o comportamento desejado do ratchet, não um defeito.

## 5. Como reproduzir

```bash
npm ci
npm test              # 104 arquivos / 868 testes; grava .quality/test-suite.json
npm run verify:docs   # confere a documentação contra o código
npm run test:coverage # cobertura (escopo ainda restrito a funding)
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
