# Plano de Implementação: Arquitetura Unificada Multi-Exchange

Este documento rastreia a evolução da implementação da Camada de Normalização (Normalization Layer) para as integrações com Bybit, Bitget e OKX, seguindo as diretrizes de Spec-Driven Development (SDD) e Clean Code.

## Fase 1: Análise e Fundação (Tarefas Simples) - [CONCLUÍDO]
- [X] **Tarefa 1 (Análise):** Análise do codebase, documentações das APIs (v5 UTA, v2, v5) e alinhamento dos contratos unificados (UnifiedBalance, UnifiedPosition, UnifiedPnLRecord). Registro das decisões arquiteturais em *ARCHITECTURE.md*.
- [X] **Tarefa 2 (Desenho e Planejamento):** Estruturação do esqueleto da camada de adaptadores (pasta `src/services/adapters/`), separando responsabilidades por corretoras seguindo o Padrão Adapter.
- [X] **Tarefa 3 (Fundação de Exibição):** Refatoração massiva das funções de formatação `formatPrice`, `formatValue` e `formatCrypto` (`src/utils/formatters.ts`) com base na regra de ouro SDD: fixação robusta entre 2 e 4 casas para Stablecoins e até 8 casas decimais para Assets/Criptos voláteis baseada nas propensões numéricas.

## Fase 2: Normalização Core e Cálculos Sensíveis (Tarefas Médias) - [CONCLUÍDO]
- [X] **Tarefa 1 (Normalização de Contratos):** Implementação lógica na identificação da base de cálculo dos derivativos (determinação se o ativo é um *Inverse Contract* como `BTCUSD` x *Usdt-Margined* como `BTCUSDT` x *USDC-Margined* x *Fiat/EUR*). 
- [X] **Tarefa 2 (Unificação do Campo *Size*):** Abstração estrita no cálculo da métrica de Quantidade (Size):
    - Extração do PnL base retroagido / Diferença de preços nas chamadas da OKX via REST onde a API reporta Contratos Unitários.
    - Divisões reversas do Notional Financeiro (`cumEntryValue` / `entryPrice`) na Bybit para determinar as criptos totais reais posicionadas em contratos inversos.
- [X] **Tarefa 3 (Refatoração de Paineis GUI):** Atualização dos componentes React de listagem (*ClosedPositions*, *OpenPositions*, *PositionsTicker*) para renderizar a abstração `Base Coin Size` VS `Notional USD Value` fluentemente e sem degradações lógicas.

## Fase 3: Lógica Histórica, Real-Time Orquestrado e Gestão (Tarefas Complexas) - [CONCLUÍDA]
- [X] **Tarefa 1 (Saldos e Agregação):** Consolidar o endpoint final `getBalance()` via Aggregators. Limpar conversões arbitrárias de `totalEquity`, `usdtEquity` e `totalEq`, blindando os dados para UI através de *Big.js/Math*. (Implementado via `ExchangeAggregator.ts` com Bootloader Híbrido).
- [X] **Tarefa 2 (Sincronia WebSocket Unificada):** Normalizar definitivamente campos como `holdSide`, `side`, `posSide` na injeção bruta dos *WsAdapters* e consolidar as tratativas de Updates/Flickers sem interferir no estado real React Zustand. (Adapters únicos concentraram a lógica).
- [X] **Tarefa 3 (Tratamento de Rate Limits e Janelas Históricas):** Auditar e alertar as lacunas e *rate limit limits* inerentes de cada *Exchange* ao longo das interfaces de Relatórios.
  - [X] Criar compomente `HistoryLimitWarning.tsx` para apresentar alertas elegamentes sobre limite da API.
  - [X] Implementar regra de detecção: Limitados Bitget (90 dias) e OKX (90 dias) vs Bybit (2 anos).
  - [X] Injetar o alerta nas telas `ClosedPositions.tsx`, `AnalyticsDashboard.tsx`, e `ReportsDashboard.tsx`.
