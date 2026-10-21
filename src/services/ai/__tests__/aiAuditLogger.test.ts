import { describe, it, expect, beforeEach } from 'vitest';
import { aiAuditLogger } from '../aiAuditLogger';
import { AiAuditLogEntry } from '../../../types/aiTypes';

describe('aiAuditLogger', () => {
  beforeEach(async () => {
    await aiAuditLogger.clearLogs();
  });

  it('records log entry and retrieves recent logs sorted by timestamp desc', async () => {
    const entryData = {
      timestamp: Date.now(),
      modelId: 'test-model-1',
      modelName: 'Ollama Test',
      provider: 'ollama' as const,
      wasFallback: false,
      type: 'chat_query' as const,
      userMessage: 'What is my balance on OKX?',
      assistantResponse: 'Your balance on OKX is $5,000.',
      toolsInvoked: [
        {
          name: 'aiGetPortfolioBalances',
          args: {},
          executionTimeMs: 15,
          resultSummary: 'Returned 1 exchange',
        },
      ],
      promptTokens: 120,
      completionTokens: 40,
      totalTokens: 160,
      durationMs: 850,
      status: 'success' as const,
    };

    const id = await aiAuditLogger.logEntry(entryData);
    expect(id).toBeDefined();

    const logs = await aiAuditLogger.getRecentLogs(10);
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe(id);
    expect(logs[0].userMessage).toBe('What is my balance on OKX?');
    expect(logs[0].toolsInvoked.length).toBe(1);
  });

  it('exports logs to JSON and CSV formats', async () => {
    await aiAuditLogger.logEntry({
      timestamp: 1700000000000,
      modelId: 'gemini-1',
      modelName: 'Gemini Flash',
      provider: 'gemini',
      wasFallback: false,
      type: 'chat_query',
      userMessage: 'Test message',
      assistantResponse: 'Test reply',
      toolsInvoked: [],
      promptTokens: 50,
      completionTokens: 20,
      totalTokens: 70,
      durationMs: 500,
      status: 'success',
    });

    const jsonStr = await aiAuditLogger.exportLogsAsJson();
    expect(jsonStr).toContain('Gemini Flash');

    const csvStr = await aiAuditLogger.exportLogsAsCsv();
    expect(csvStr).toContain('Timestamp,Model,Provider,Type,Status,DurationMs,Tokens');
    expect(csvStr).toContain('Gemini Flash');
  });

  it('retrieves log by ID and stores rawDebug and fullPayloadSnapshot', async () => {
    const rawDebugData = {
      request: {
        endpoint: '/api/ai/chat',
        modelId: 'gemini-3.8-flash',
        systemInstruction: 'You are a crypto auditor',
        messages: [{ role: 'user', content: 'Funding summary' }],
        parameters: { temperature: 0.1, maxTokens: 2048 },
      },
      toolsExecution: [
        {
          turn: 1,
          name: 'aiGetFundingFeesHistory',
          inputArgs: { days: 7 },
          rawResult: { periodDays: 7, symbols: [{ symbol: 'BTCUSDT', fundingRate: 0.01 }] },
          executionTimeMs: 25,
        },
      ],
      response: {
        status: 200,
        text: 'You received positive funding.',
      },
    };

    const id = await aiAuditLogger.logEntry({
      timestamp: Date.now(),
      modelId: 'gemini-3.8-flash',
      modelName: 'Gemini 3.8 Flash',
      provider: 'gemini',
      wasFallback: false,
      type: 'chat_query',
      userMessage: 'Funding summary',
      assistantResponse: 'You received positive funding.',
      toolsInvoked: [
        {
          name: 'aiGetFundingFeesHistory',
          args: { days: 7 },
          executionTimeMs: 25,
          resultSummary: 'Executed successfully',
        },
      ],
      promptTokens: 400,
      completionTokens: 80,
      totalTokens: 480,
      durationMs: 950,
      status: 'success',
      rawDebug: rawDebugData,
      fullPayloadSnapshot: {
        sentPrompt: 'You are a crypto auditor',
        rawToolResults: rawDebugData.toolsExecution,
        rawDebug: rawDebugData,
      },
    });

    const fetched = await aiAuditLogger.getLogById(id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(id);
    expect(fetched?.rawDebug?.request?.modelId).toBe('gemini-3.8-flash');
    expect(fetched?.rawDebug?.toolsExecution?.[0]?.name).toBe('aiGetFundingFeesHistory');
    expect(fetched?.rawDebug?.toolsExecution?.[0]?.rawResult?.symbols[0]?.symbol).toBe('BTCUSDT');
    expect(fetched?.fullPayloadSnapshot?.sentPrompt).toBe('You are a crypto auditor');
  });
});
