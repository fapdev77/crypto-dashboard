# Relatório de Análise e Plano de Melhoria de Arquitetura (V2)

## 1. Contexto e Descobertas
Após a primeira rodada de unificação, a arquitetura do projeto evoluiu substancialmente, desacoplando o UI do core das exchanges, centralizando regras de negócio nos *adapters* e *unifiers*. Porém, após uma varredura rigorosa pelos componentes React (`/src/components`), identificamos que **ainda existem gambiarras na camada visual (UI)**. Algumas pontas soltas foram mantidas pelo isolamento do PR anterior e devem ser purgadas.

### 1.1 Pontas Soltas Identificadas
- **Fuga de Abstração via `raw` em `ClosedPositions.tsx`**: O painel de posições fechadas utiliza o objeto de fallback `p.raw` (ex: `p.raw.pnl`, `p.raw.cumEntryValue`, `p.raw.roi`) de maneira condicional para as exchanges `okx` e `bybit`. Isso quebra o princípio de que o UI "só não pode conhecer o payload do broker".
- **Dispersão de Modelagem Numérica (`.toFixed()`)**: Alguns módulos de visualização analítica (como `HedgeProDashboard.tsx`, `CrossExchangeAssetsChart.tsx` e `ReportsDashboard.tsx`) usam formatação inline em string (`val.toFixed(8)`) no lugar de usar globalmente as funções centralizadas (`formatValue` e `formatCrypto`) localizadas em `formatters.ts`. Isso previne a capacidade da aplicação formatar com separadores de milhares e perde integridade de UI.
- **Micro-Lógica de Parser de Datas nas Views**: A conversão de `timestamp` para datas por vezes possui checagens prolixas injetadas na pipeline de render do DOM *(ex:`t.closeUpdateTime ? new Date(Math.floor(Number(t.closeUpdateTime))) : new Date()`)*, algo que deveria estar em um formatter ou no adaptador (que hoje realiza um puro `parseInt`).

---

## 2. Plano de Execução de Melhorias (V2)

Este plano deve ser executado para isolar 100% o UI da formatação e da lógica de API das exchanges.

- [ ] **Tarefa 1: Extensão das Interfaces Unificadas (Types)**
  - Expandir a interface genérica `UnifiedHistoryPosition` (`/src/types.ts`) adicionando propriedades base que garantem pureza sem recorrer ao "raw":
    - `roi?: number;` (Return on Investment / Equity)
    - `leverage?: number;`
    - `notionalUsd?: number;` (ou entryValue)
    - `marginMode?: UnifiedMarginMode;`
    - `createdTime?: number;`

- [ ] **Tarefa 2: Refatoração de Formatadores Globais (`formatters.ts`)**
  - Adicionar a função global `formatDate(timestamp: number | undefined | null, formatStr: string = 'MMM dd HH:mm'): string` no de `/src/utils/formatters.ts`. Ela será responsável pelas proteções visuais (`Math.floor`, `isNaN`), tornando os módulos do Dashboard mais enxutos.

- [ ] **Tarefa 3: Preenchimento nos Adapters**
  - Alterar o `OkxAdapter.ts`, `BybitAdapter.ts`, `BitgetAdapter.ts` para capturar os respectivos valores e normalizados e alocá-los dentro das novas variáveis definidas em `UnifiedHistoryPosition` do Item 1 `(roi, leverage, notionalUsd, marginMode, createdTime)`.
  - Atualizar os *mocks* em `/src/mock/generateMocks.js` correspondentes ao histórico (`history`).

- [ ] **Tarefa 4: Profilaxia Visual no Analytics (UI Layer)**
  - Limpar a dívida visual em `/src/components/analytics/HedgeProDashboard.tsx` substituindo `.toFixed(2)` e `.toFixed(8)` por `formatValue`, `formatCrypto` e `formatPrice` com fallback implícito.
  - Substituir parses customizados de datas via `date-fns / new Date()` pelas chamadas seguras passando por `formatDate`.

- [ ] **Tarefa 5: Remoção do `raw` em `ClosedPositions.tsx`**
  - Limpar **toda e qualquer** iteração de `p.raw` que acontece próximo à linha 212 de `ClosedPositions.tsx`. Recalcular/aproveitar dados providos de `roi`, e `notionalUsd` previamente populado no Adaptador, removendo todos "ifs" de provedores base (`if exchange === okx`).

- [ ] **Tarefa 6: Documentação**
  - Atualizar os esquemas em `/specs/unified-interfaces.md` contemplando o upgrade de base properties para `UnifiedHistoryPosition`.

## 3. Resultado Esperado
Com essa V2 de melhorias, a camada da UI (`/src/components/*`) se consolidará exclusivamente como uma **Visão Tola (Dumb Views)** – não tomando decisões baseadas nos payloads individuais de corretoras e confiando cegamente no schema nativo do app, que reflete perfeitamente as propriedades já saneadas através de `/utils` e `Adapters`.
