import { AiToolDefinition, AiToolCallResult } from '../../types/aiTypes';
import { aiToolExecutors } from './aiToolExecutors';

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
    description: 'Queries funding fee history, live funding rates in pure 8-decimal precision (e.g. 0.00010000 = +0.01%), multi-horizon cumulative rates (today, current month, last 3 months, and up to 2 years for Bybit), and actual cash-flow funding fees paid/received.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of past days to analyze (default 7 days, up to 730 days for Bybit, up to 90 days for OKX and Bitget).',
          default: 7,
        },
        symbol: {
          type: 'string',
          description: 'Optional symbol ticker to filter (e.g. BTC, ETH, BTCUSDT).',
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
          result = await aiToolExecutors.aiGetFundingFeesHistory({
            days: args?.days || 7,
            symbol: args?.symbol,
            exchange: args?.exchange,
          });
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
          return {
            name,
            result: null,
            executionTimeMs: Math.round(performance.now() - startTime),
            error: `Tool '${name}' not found or not allowed in PIKA tool catalog.`,
          };
      }

      return {
        name,
        result,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    } catch (err: any) {
      return {
        name,
        result: null,
        executionTimeMs: Math.round(performance.now() - startTime),
        error: `Failed to execute local tool '${name}': ${err.message || 'Unknown error'}`,
      };
    }
  }
}

export const aiToolRegistry = new AiToolRegistry();
