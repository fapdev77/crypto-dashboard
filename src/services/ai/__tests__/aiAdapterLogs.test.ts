import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiToolRegistry } from '../aiToolRegistry';
import { aiToolExecutors } from '../aiToolExecutors';
import { exportAiAnalysisToPdf } from '../aiReportExporter';
import { useLogStore } from '../../../store/logStore';

vi.mock('../aiToolExecutors', () => ({
  aiToolExecutors: {
    aiGetPortfolioBalances: vi.fn(),
    aiGetOpenPositions: vi.fn(),
    aiGetHedgeCorrelationSummary: vi.fn(),
    aiGetFundingFeesHistory: vi.fn(),
    aiGetTradingFeesHistory: vi.fn(),
    aiGetClosedPositionsSummary: vi.fn(),
  },
}));

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      throw new Error('PDF Generation failure simulated');
    }),
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AI Subsystem - logging standardization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLogStore.setState({ entries: [] });
  });

  const getLogs = (tag?: string) => {
    const entries = useLogStore.getState().entries;
    return tag ? entries.filter(e => e.source === tag) : entries;
  };

  it('emits INFO logs on tool invocation and successful completion under AI.Tools', async () => {
    vi.mocked(aiToolExecutors.aiGetPortfolioBalances).mockResolvedValue({ totalEquityUsd: 10000 } as any);

    const result = await aiToolRegistry.executeToolCall('aiGetPortfolioBalances', {});

    expect(result.error).toBeUndefined();

    const toolLogs = getLogs('AI.Tools');
    const startLog = toolLogs.find(l => l.level === 'INFO' && l.message.includes('Invoking tool "aiGetPortfolioBalances"'));
    const successLog = toolLogs.find(l => l.level === 'INFO' && l.message.includes('executed successfully'));

    expect(startLog).toBeDefined();
    expect(successLog).toBeDefined();
  });

  it('emits WARN log when an unknown tool is invoked', async () => {
    const result = await aiToolRegistry.executeToolCall('unknownNonExistentTool', {});

    expect(result.error).toBeDefined();

    const warnLogs = getLogs('AI.Tools').filter(l => l.level === 'WARN');
    expect(warnLogs.length).toBe(1);
    expect(warnLogs[0].message).toContain('not found or not allowed');
  });

  it('emits WARN log when tool execution throws an error', async () => {
    vi.mocked(aiToolExecutors.aiGetOpenPositions).mockRejectedValue(new Error('Exchange positions query failed'));

    const result = await aiToolRegistry.executeToolCall('aiGetOpenPositions', { exchange: 'bybit' });

    expect(result.error).toContain('Exchange positions query failed');

    const warnLogs = getLogs('AI.Tools').filter(l => l.level === 'WARN');
    expect(warnLogs.length).toBe(1);
    expect(warnLogs[0].message).toContain('Tool "aiGetOpenPositions" execution failed');
  });

  it('emits ERROR log with tag AI.Reports when PDF generation fails', async () => {
    await exportAiAnalysisToPdf({
      title: 'Test Report',
      markdownContent: 'Sample content',
    });

    const reportLogs = getLogs('AI.Reports').filter(l => l.level === 'ERROR');
    expect(reportLogs.length).toBe(1);
    expect(reportLogs[0].message).toContain('Failed to export PDF report');
  });
});
