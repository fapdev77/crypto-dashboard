import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AiSettings } from '../AiSettings';
import '../../../i18n/config';

vi.mock('../../ui/Tooltip', () => ({
  AppTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../AiModelList', () => ({
  AiModelList: () => <div data-testid="ai-model-list">Ai Model List</div>,
}));

vi.mock('../AiTelemetryCards', () => ({
  AiTelemetryCards: () => <div data-testid="ai-telemetry-cards">Ai Telemetry Cards</div>,
}));

vi.mock('../AiModelStatsTable', () => ({
  AiModelStatsTable: () => <div data-testid="ai-model-stats-table">Ai Model Stats Table</div>,
}));

vi.mock('../AiDailyTokenChart', () => ({
  AiDailyTokenChart: () => <div data-testid="ai-daily-token-chart">Ai Daily Token Chart</div>,
}));

vi.mock('../AiAuditLogTable', () => ({
  AiAuditLogTable: () => <div data-testid="ai-audit-log-table">Ai Audit Log Table</div>,
}));

vi.mock('../AiModelModal', () => ({
  AiModelModal: () => <div data-testid="ai-model-modal">Ai Model Modal</div>,
}));

describe('AiSettings component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AI Assistant Settings title and toggle', () => {
    render(<AiSettings />);

    expect(screen.getByText(/AI Assistant & Intelligence Settings|PIKA Assistant Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Enable AI Assistant|Enable PIKA Assistant/i)).toBeInTheDocument();
  });

  it('renders global inference and telemetry sections', () => {
    render(<AiSettings />);

    expect(screen.getByText(/Global Inference & Safety Parameters/i)).toBeInTheDocument();
    expect(screen.getByText(/Automatic Failover \(Fallback\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Value Obfuscation/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Engine Telemetry & Consumption|AI Consumption & Real-Time Telemetry/i)).toBeInTheDocument();
  });
});
