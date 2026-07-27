# Market Overview KPI Cards

## Resumo

Seção de **cards de KPI** no topo do Funding Dashboard com métricas globais de mercado de funding rate. Versão simplificada — sem cards de posições pessoais.

## Entendimento (Understanding Lock)

- **O que:** Grid de KPI cards com métricas de mercado (cards numéricos + mini-listas de ranking)
- **Por que:** Dar visibilidade imediata sobre condições de mercado de funding sem poluir a interface
- **Para quem:** Traders de futuros perpétuos (Bybit, OKX, Bitget)
- **Formato:** Cards compactos para métricas numéricas, mini-listas para rankings
- **Atualização:** Globais recalculam no ciclo de polling existente; contagem regressiva em tempo real (1s)

## Arquitetura

```
FundingDashboard
  │
  ├─ useFundingData() → aggregatedData
  ├─ useFundingStore → currentRates
  │
  ├─ useKpiMetrics(aggregatedData, currentRates) → { marketMetrics, rankings }
  │     ├─ marketMetrics (totalSymbols, usdtmSymbols, coinmSymbols, positiveRatePct,
  │     │                negativeRatePct, neutralRatePct, netPositiveSpread,
  │     │                avgTodayRate, stdDevTodayRate, nextFundingCountdown)
  │     └─ rankings (topPayers, bottomPayers, highestVolatility)
  │
  └─ <MarketOverviewCards marketMetrics={...} rankings={...} />
        ├─ Active Symbols      (custom: total + USDT‑M / COIN‑M breakdown)
        ├─ Distribution Today  (custom: Positive / Neutral / Negative rows + Net spread)
        ├─ Rate Stats          (custom: Avg Rate + Std Dev rows)
        └─ KpiRankingList × 3  (Top Payers, Bottom Payers, Highest Volatility)
```

## Componentes

### `useKpiMetrics` (Hook)

```typescript
interface MarketMetrics {
  totalSymbols: number;
  usdtmSymbols: number;
  coinmSymbols: number;
  positiveRatePct: number;
  negativeRatePct: number;
  neutralRatePct: number;
  netPositiveSpread: number;    // positiveRatePct - negativeRatePct
  avgTodayRate: number;
  stdDevTodayRate: number;
  nextFundingCountdown: number; // ms until next global funding settlement
}

interface Rankings {
  topPayers: { symbol: string; rate: number }[];
  bottomPayers: { symbol: string; rate: number }[];
  highestVolatility: { symbol: string; rate: number }[];
}
```

### `KpiRankingList` — Mini-lista rankeada

Props: `title`, `items[]`, `color`, `icon`, `tooltip?`

### `MarketOverviewCards` — Container principal

Recebe `marketMetrics` + `rankings` como props. Possui toggle collapsível com persistência em localStorage (`fundingDashboard_marketOverviewExpanded`). Mostra preview compacto (média + desvio padrão) quando colapsado.

**3 cards na linha superior (grid `lg:grid-cols-3`):**

| Card | Conteúdo |
|------|----------|
| **Active Symbols** | Total de símbolos + breakdown USDT‑M / COIN‑M |
| **Distribution Today** | % Positive / Neutral / Negative (linhas) + Net spread |
| **Rate Stats** | Avg Rate (colorido) + Std Dev |

## Cálculos

### Market Metrics
- `totalSymbols`: aggregatedData.length
- `usdtmSymbols`: count where instrumentType === 'USDT-M'
- `coinmSymbols`: count where instrumentType === 'COIN-M'
- `positiveRatePct`: (count where todaySum > 0) / total * 100
- `negativeRatePct`: (count where todaySum < 0) / total * 100
- `neutralRatePct`: (count where todaySum === 0) / total * 100
- `netPositiveSpread`: positiveRatePct - negativeRatePct
- `avgTodayRate`: sum(todaySum) / totalSymbols (Big.js)
- `stdDevTodayRate`: sqrt(sum((x - avg)²) / N) (Big.js)
- `nextFundingCountdown`: min(nextFundingTimes) - Date.now() (atualizado a cada 1s)

### Rankings
- `topPayers`: sorted by todaySum descending, top 5
- `bottomPayers`: sorted by todaySum ascending, top 5 (most negative)
- `highestVolatility`: sorted by |todaySum| descending, top 5

## Layout

```
┌─ FilterBar (com Favorites + Open Positions como prepend) ──────────┐
│  [Fav] [Open]  [Exchange ▼]  [Instrument ▼]  [Search...]          │
└────────────────────────────────────────────────────────────────────┘

┌─ Market Overview ──────── collapsible ────────────────────────────┐
│  Row 1 (3 cards, lg:grid-cols-3):                                  │
│  ┌─ Active Symbols ──┐ ┌─ Distribution Today ──┐ ┌─ Rate Stats ─┐ │
│  │  1,234            │ │  ↑ Positive  66.7%    │ │  Avg Rate    │ │
│  │  USDT-M     890   │ │  — Neutral   19.1%    │ │  -0.0012%    │ │
│  │  COIN-M     344   │ │  ↓ Negative  14.2%    │ │  Std Dev     │ │
│  │                   │ │  Net          +52.5%   │ │  0.0034%     │ │
│  └───────────────────┘ └───────────────────────┘ └──────────────┘ │
│  Row 2 (3 colunas):                                                │
│  [Top Payers] [Bottom Payers] [Highest Volatility]                 │
└────────────────────────────────────────────────────────────────────┘

┌─ Funding Tables ──────────────────────────────────────────────────┐
│  ...                                                              │
└────────────────────────────────────────────────────────────────────┘
```

## Privacidade

Como os cards são apenas dados de mercado (públicos), não há mascaramento. A privacidade (`isPrivateMode`) não afeta esta seção.

## Edge Cases

- `aggregatedData` vazio → componente não renderiza (`return null`)
- Apenas 1 símbolo disponível → rankings mostram 1 item, cards funcionam
- `todaySum` zero → neutro, não quebra média nem rankings
- Exchange offline (sem currentRates) → countdown fica zerado

## Decision Log

| # | Decisão | Alternativas | Por quê |
|---|---------|-------------|---------|
| 1 | Hook + Componente Modular | Tudo no Dashboard / Store | Separação de responsabilidades |
| 2 | Hybrid (polling + 1s timer p/ countdown) | Só polling / só real-time | Performance + UX de countdown |
| 3 | Cards numéricos + mini-listas separados | Cards híbridos / tabelas | Melhor hierarquia visual |
| 4 | `useMemo` para cálculos | `useEffect` com setState | Dados derivados, sem estado próprio |
| 5 | Big.js para médias/desvios | number nativo | Precisão financeira |
| 6 | Tooltips em cada card | Sem tooltips | Transparência das métricas |
| 7 | **Removido: seção YourPositions** | Manter cards pessoais | Simplificação — estava poluído |
| 8 | **Collapsível com localStorage** | Sempre expandido | Usuário controla visibilidade |
| 9 | **MarketOverview recebe dados via props** | Hook chamado internamente | Mais flexível para reuso/layout |

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useKpiMetrics.ts` | Hook com cálculos de market metrics e rankings |
| `src/components/analytics/FundingFees/MarketOverviewCards.tsx` | Container collapsível do Market Overview |
| `src/components/analytics/FundingFees/KpiRankingList.tsx` | Mini-lista de ranking |
| `src/components/analytics/FundingFees/KpiMetricCard.tsx` | Card numérico (atualmente não usado — mantido para reuso futuro) |
