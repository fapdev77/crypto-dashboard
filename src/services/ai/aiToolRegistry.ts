import { AiToolDefinition, AiToolCallResult } from '../../types/aiTypes';
import { aiToolExecutors } from './aiToolExecutors';
import { LogManager } from '../LogManager';

export const AI_TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: 'aiGetPortfolioBalances',
    description: 'Returns consolidated portfolio balances, total equity in USD, available margin, and breakdown of assets across connected exchanges (Bybit, OKX, Bitget).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'aiGetOpenPositions',
    description: 'Retrieves active open positions across exchanges with entry prices, current mark prices, unrealized PnL (UPL in USD), liquidation prices, margin mode, and leverage.',
    parameters: {
      type: 'object',
      properties: {
        exchange: {
          type: 'string',
          description: 'Optional exchange name filter (e.g. bybit, okx, bitget).',
          enum: ['bybit', 'okx', 'bitget'],
        },
        symbol: {
          type: 'string',
          description: 'Optional symbol or asset ticker filter (e.g. BTC, ETH, SOL).',
        },
        side: {
          type: 'string',
          description: 'Optional position direction filter (long or short).',
          enum: ['long', 'short'],
        },
      },
      required: [],
    },
  },
  {
    name: 'aiGetHedgeCorrelationSummary',
    description: 'Calculates cross-exchange hedge analysis (e.g. Long on Bybit vs Short on OKX), net delta exposure, and single-leg liquidation risk metrics.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'aiGetFundingFeesHistory',
    description: 'Queries actual cash-flow funding fees credited/debited to your wallet from real exchange transaction logs in USD. Returns exact pre-computed total received ($), total paid ($), net funding ($), per-asset breakdown with position status (OPEN/CLOSED), and individual audit settlements. Use this when the user asks how much funding they received or paid.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: "Timeframe period to analyze. Use 'today_utc' for calendar day starting 00:00 UTC (standard exchange settlement day), 'today_local' for user local day, 'yesterday_utc', 'yesterday_local', '7d', or '30d'.",
          enum: ['today_utc', 'today_local', 'yesterday_utc', 'yesterday_local', '7d', '30d', 'custom'],
        },
        days: {
          type: 'number',
          description: 'Number of past days to analyze (e.g. 1, 7, 30). Optional fallback.',
        },
        symbol: {
          type: 'string',
          description: 'Optional symbol ticker to filter (e.g. BTC, ETH, ADA).',
        },
        exchange: {
          type: 'string',
          description: 'Optional exchange filter (bybit, okx, bitget).',
          enum: ['bybit', 'okx', 'bitget'],
        },
        startDate: {
          type: 'string',
          description: 'Optional start date in YYYY-MM-DD or ISO format for custom period.',
        },
        endDate: {
          type: 'string',
          description: 'Optional end date in YYYY-MM-DD or ISO format for custom period.',
        },
      },
      required: [],
    },
  },
  {
    name: 'aiGetMarketFundingRates',
    description: 'Queries market-wide perpetual funding rates (%), historical multi-horizon cumulative rates (today, current month, last month, 3 months, 6-12 months for Bybit), cross-exchange rate comparisons for a coin (e.g. BTC across Bybit vs OKX vs Bitget), or rankings of top highest/lowest funding rate assets in the market. Use this when the user asks about market rates, which exchange pays more/less, or coin rate benchmarks.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Optional symbol ticker (e.g. BTC, ETH, SOL) to inspect or compare across active exchanges.',
        },
        exchange: {
          type: 'string',
          description: 'Optional exchange filter (bybit, okx, bitget).',
          enum: ['bybit', 'okx', 'bitget'],
        },
        ranking: {
          type: 'string',
          description: "Optional ranking mode: 'top_positive' (highest rates), 'top_negative' (lowest/most negative rates), or 'top_and_bottom' (both highest and lowest).",
          enum: ['top_positive', 'top_negative', 'top_and_bottom'],
        },
        horizon: {
          type: 'string',
          description: "Historical rate horizon for comparison/ranking: 'last_rate' (current/latest), 'today', 'current_month', 'last_month', 'last_3_months', 'last_6_months', 'last_12_months'.",
          enum: ['last_rate', 'today', 'current_month', 'last_month', 'last_3_months', 'last_6_months', 'last_12_months'],
          default: 'last_rate',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return in ranking or list (default: 5, max: 20).',
          default: 5,
        },
      },
      required: [],
    },
  },
  {
    name: 'aiGetTradingFeesHistory',
    description: 'Queries exchange trading fees and commissions paid on recent executions over the last X days.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of past days to analyze (default 7 days).',
          default: 7,
        },
        exchange: {
          type: 'string',
          description: 'Optional exchange filter (bybit, okx, bitget).',
          enum: ['bybit', 'okx', 'bitget'],
        },
      },
      required: [],
    },
  },
  {
    name: 'aiGetClosedPositionsSummary',
    description: 'Queries historical closed positions summary (realized PnL, count of winning vs losing trades, and win rate %).',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of past days to analyze (default 7 days).',
          default: 7,
        },
        symbol: {
          type: 'string',
          description: 'Optional symbol filter (e.g. BTC).',
        },
      },
      required: [],
    },
  },
];

class AiToolRegistry {
  public getToolDefinitions(): AiToolDefinition[] {
    return AI_TOOL_DEFINITIONS;
  }

  public getOpenAiToolsSchema() {
    return AI_TOOL_DEFINITIONS.map((def) => ({
      type: 'function' as const,
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      },
    }));
  }

  public getGeminiToolsSchema() {
    return AI_TOOL_DEFINITIONS.map((def) => ({
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    }));
  }

  public async executeToolCall(name: string, args: Record<string, any> = {}): Promise<AiToolCallResult> {
    const startTime = performance.now();
    LogManager.info('AI.Tools', `Invoking tool "${name}"`, args);

    try {
      let result: any;

      switch (name) {
        case 'aiGetPortfolioBalances':
          result = await aiToolExecutors.aiGetPortfolioBalances();
          break;
        case 'aiGetOpenPositions':
          result = await aiToolExecutors.aiGetOpenPositions(args);
          break;
        case 'aiGetHedgeCorrelationSummary':
          result = await aiToolExecutors.aiGetHedgeCorrelationSummary();
          break;
        case 'aiGetFundingFeesHistory':
          result = await aiToolExecutors.aiGetFundingFeesHistory(args);
          break;
        case 'aiGetMarketFundingRates':
          result = await aiToolExecutors.aiGetMarketFundingRates(args);
          break;
        case 'aiGetTradingFeesHistory':
          result = await aiToolExecutors.aiGetTradingFeesHistory({
            days: args?.days || 7,
            exchange: args?.exchange,
          });
          break;
        case 'aiGetClosedPositionsSummary':
          result = await aiToolExecutors.aiGetClosedPositionsSummary({
            days: args?.days || 7,
            symbol: args?.symbol,
          });
          break;
        default:
          const unknownError = `Tool '${name}' not found or not allowed in PIKA tool catalog.`;
          LogManager.warn('AI.Tools', unknownError);
          return {
            name,
            result: null,
            executionTimeMs: Math.round(performance.now() - startTime),
            error: unknownError,
          };
      }

      const executionTimeMs = Math.round(performance.now() - startTime);
      LogManager.info('AI.Tools', `Tool "${name}" executed successfully (${executionTimeMs}ms)`);

      return {
        name,
        result,
        executionTimeMs,
      };
    } catch (err: any) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      LogManager.warn('AI.Tools', `Tool "${name}" execution failed:`, err);
      return {
        name,
        result: null,
        executionTimeMs,
        error: `Failed to execute local tool '${name}': ${err.message || 'Unknown error'}`,
      };
    }
  }
}

export const aiToolRegistry = new AiToolRegistry();
