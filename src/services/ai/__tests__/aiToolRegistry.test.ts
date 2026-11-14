import { describe, it, expect } from 'vitest';
import { aiToolRegistry } from '../aiToolRegistry';

describe('aiToolRegistry', () => {
  it('exposes tool definitions with correct schemas', () => {
    const tools = aiToolRegistry.getToolDefinitions();
    expect(tools.length).toBeGreaterThanOrEqual(6);

    const balanceTool = tools.find((t) => t.name === 'aiGetPortfolioBalances');
    expect(balanceTool).toBeDefined();
    expect(balanceTool?.description.toLowerCase()).toContain('portfolio');

    const posTool = tools.find((t) => t.name === 'aiGetOpenPositions');
    expect(posTool).toBeDefined();
    expect(posTool?.parameters.properties.exchange).toBeDefined();
  });

  it('formats tools for OpenAI / Ollama compatible format', () => {
    const openAiTools = aiToolRegistry.getOpenAiToolsSchema();
    expect(Array.isArray(openAiTools)).toBe(true);
    expect(openAiTools[0].type).toBe('function');
    expect(openAiTools[0].function.name).toBeDefined();
  });

  it('formats tools for Gemini SDK functionDeclarations format', () => {
    const geminiTools = aiToolRegistry.getGeminiToolsSchema();
    expect(Array.isArray(geminiTools)).toBe(true);
    expect(geminiTools[0].name).toBeDefined();
    expect(geminiTools[0].parameters).toBeDefined();
  });

  it('executes valid registered tool and returns benchmarked result', async () => {
    const res = await aiToolRegistry.executeToolCall('aiGetPortfolioBalances', {});
    expect(res.name).toBe('aiGetPortfolioBalances');
    expect(res.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(res.result).toBeDefined();
    expect(res.error).toBeUndefined();
  });

  it('exposes and executes aiGetMarketFundingRates tool', async () => {
    const tools = aiToolRegistry.getToolDefinitions();
    const marketRatesTool = tools.find((t) => t.name === 'aiGetMarketFundingRates');
    expect(marketRatesTool).toBeDefined();
    expect(marketRatesTool?.parameters.properties.ranking).toBeDefined();
    expect(marketRatesTool?.parameters.properties.horizon).toBeDefined();

    const res = await aiToolRegistry.executeToolCall('aiGetMarketFundingRates', { ranking: 'top_positive', limit: 3 });
    expect(res.name).toBe('aiGetMarketFundingRates');
    expect(res.error).toBeUndefined();
    expect(res.result.mode).toBe('RANKING');
  });

  it('handles unknown tool gracefully with error response', async () => {
    const res = await aiToolRegistry.executeToolCall('unknownTool', {});
    expect(res.name).toBe('unknownTool');
    expect(res.error).toContain('not found');
  });
});
