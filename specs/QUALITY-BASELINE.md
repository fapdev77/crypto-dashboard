# Quality Baseline — v2.38.0

> **Snapshot de medição, não de promessa.** Números coletados em 2026-11-14 a partir do commit `7c9de34`.
> Este arquivo é histórico, no mesmo espírito do `CHANGELOG.md`: `npm run verify:docs` não o valida nem o reescreve.
> Atualize-o ao fechar cada fase do plano de qualidade, nunca para "fazer o número bater".

---

## 1. Suíte de testes

| Métrica | Valor |
|---|---|
| Arquivos de teste | **104** (103 em `src/` + 1 em `tools/__tests__/`) |
| Casos de teste | **868** |
| Resultado | 868 passando, 0 falhando, 0 pendentes |
| Duração da última execução | **155,29 s** (transform 92,84 s · import 368,61 s · tests 89,63 s · environment 1.445,36 s) |
| Variação observada entre execuções | 155 s – 200 s no mesmo commit |
| Suítes (arquivos + describes) | 355 |

O gargalo não é a execução dos casos (89 s): é a soma de tempo de ambiente entre workers (1.445 s). A afirmação anterior de "100% verde" era verdadeira nesta execução, mas houve uma falha em `src/components/__tests__/VaultModalScreens.test.tsx` em execução anterior — ver §4.

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
- **Flake não corrigido.** `VaultModalScreens.test.tsx` falhou uma vez e passou nas execuções seguintes. A hipótese principal é o custo real de PBKDF2 (600.000 iterações) dentro do `waitFor` de 1 s; correção prevista na fase F2, com injeção de iterações em ambiente de teste.
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
