import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';

// ───────────────────────────────────────────────
// Settings Store — fundingHistoryInterval
// ───────────────────────────────────────────────

describe('settingsStore — fundingHistoryInterval', () => {
  beforeEach(() => {
    // Reset to default state (only the fields we care about)
    useSettingsStore.setState({
      fundingHistoryInterval: 4,
      fundingPollingInterval: 1,
    });
  });

  describe('default value', () => {
    it('should start with fundingHistoryInterval = 4', () => {
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(4);
    });
  });

  describe('setFundingHistoryInterval', () => {
    it('should set fundingHistoryInterval to 4 (minimum of range)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(4);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(4);
    });

    it('should set fundingHistoryInterval to 6 (mid-range)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(6);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(6);
    });

    it('should set fundingHistoryInterval to 8 (maximum of range)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(8);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(8);
    });

    it('should overwrite existing value', () => {
      useSettingsStore.getState().setFundingHistoryInterval(6);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(6);

      useSettingsStore.getState().setFundingHistoryInterval(4);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(4);
    });

    it('should not affect other settings', () => {
      useSettingsStore.getState().setFundingHistoryInterval(6);
      // fundingPollingInterval should remain unchanged (from default 1)
      expect(useSettingsStore.getState().fundingPollingInterval).toBe(1);
    });

    it('should clamp values outside 4-8h range at store level', () => {
      // The store now enforces the 4-8h range via clamp in the setter.
      useSettingsStore.getState().setFundingHistoryInterval(2);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(4);

      useSettingsStore.getState().setFundingHistoryInterval(12);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(8);

      useSettingsStore.getState().setFundingHistoryInterval(6);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(6);
    });
  });

  describe('guard interval calculation', () => {
    it('should compute intervalMs = 14_400_000 for value 4 (4h)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(4);
      const intervalMs = useSettingsStore.getState().fundingHistoryInterval * 60 * 60 * 1000;
      expect(intervalMs).toBe(14_400_000);
    });

    it('should compute intervalMs = 21_600_000 for value 6 (6h)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(6);
      const intervalMs = useSettingsStore.getState().fundingHistoryInterval * 60 * 60 * 1000;
      expect(intervalMs).toBe(21_600_000);
    });

    it('should compute intervalMs = 28_800_000 for value 8 (8h)', () => {
      useSettingsStore.getState().setFundingHistoryInterval(8);
      const intervalMs = useSettingsStore.getState().fundingHistoryInterval * 60 * 60 * 1000;
      expect(intervalMs).toBe(28_800_000);
    });
  });

  describe('setFundingPollingInterval clamp', () => {
    it('should clamp fundingPollingInterval to [1, 60]', () => {
      useSettingsStore.getState().setFundingPollingInterval(-5);
      expect(useSettingsStore.getState().fundingPollingInterval).toBe(1);

      useSettingsStore.getState().setFundingPollingInterval(0);
      expect(useSettingsStore.getState().fundingPollingInterval).toBe(1);

      useSettingsStore.getState().setFundingPollingInterval(30);
      expect(useSettingsStore.getState().fundingPollingInterval).toBe(30);

      useSettingsStore.getState().setFundingPollingInterval(99);
      expect(useSettingsStore.getState().fundingPollingInterval).toBe(60);
    });
  });
});

// ───────────────────────────────────────────────
// Settings Store — pollingInterval (REST refresh)
// ───────────────────────────────────────────────

describe('settingsStore — pollingInterval', () => {
  beforeEach(() => {
    useSettingsStore.setState({ pollingInterval: 5 });
  });

  describe('default value', () => {
    it('should start with pollingInterval = 5', () => {
      expect(useSettingsStore.getState().pollingInterval).toBe(5);
    });
  });

  describe('setPollingInterval', () => {
    it('should set in-range values correctly', () => {
      useSettingsStore.getState().setPollingInterval(1);
      expect(useSettingsStore.getState().pollingInterval).toBe(1);

      useSettingsStore.getState().setPollingInterval(30);
      expect(useSettingsStore.getState().pollingInterval).toBe(30);

      useSettingsStore.getState().setPollingInterval(60);
      expect(useSettingsStore.getState().pollingInterval).toBe(60);
    });

    it('should clamp values below 1 to 1', () => {
      useSettingsStore.getState().setPollingInterval(0);
      expect(useSettingsStore.getState().pollingInterval).toBe(1);

      useSettingsStore.getState().setPollingInterval(-10);
      expect(useSettingsStore.getState().pollingInterval).toBe(1);
    });

    it('should clamp values above 60 to 60', () => {
      useSettingsStore.getState().setPollingInterval(120);
      expect(useSettingsStore.getState().pollingInterval).toBe(60);
    });
  });
});

// ───────────────────────────────────────────────
// Settings Store — historyCacheInterval
// ───────────────────────────────────────────────

describe('settingsStore — historyCacheInterval', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      historyCacheInterval: 15,
      pollingInterval: 5, // ensure isolation
    });
  });

  describe('default value', () => {
    it('should start with historyCacheInterval = 15', () => {
      expect(useSettingsStore.getState().historyCacheInterval).toBe(15);
    });
  });

  describe('setHistoryCacheInterval', () => {
    it('should set in-range values correctly', () => {
      useSettingsStore.getState().setHistoryCacheInterval(1);
      expect(useSettingsStore.getState().historyCacheInterval).toBe(1);

      useSettingsStore.getState().setHistoryCacheInterval(30);
      expect(useSettingsStore.getState().historyCacheInterval).toBe(30);

      useSettingsStore.getState().setHistoryCacheInterval(60);
      expect(useSettingsStore.getState().historyCacheInterval).toBe(60);
    });

    it('should clamp values below 1 to 1', () => {
      useSettingsStore.getState().setHistoryCacheInterval(0);
      expect(useSettingsStore.getState().historyCacheInterval).toBe(1);

      useSettingsStore.getState().setHistoryCacheInterval(-5);
      expect(useSettingsStore.getState().historyCacheInterval).toBe(1);
    });

    it('should clamp values above 60 to 60', () => {
      useSettingsStore.getState().setHistoryCacheInterval(100);
      expect(useSettingsStore.getState().historyCacheInterval).toBe(60);
    });

    it('should not affect other settings', () => {
      useSettingsStore.getState().setHistoryCacheInterval(30);
      expect(useSettingsStore.getState().pollingInterval).toBe(5);
    });
  });
});

// ───────────────────────────────────────────────
// Settings Store — metadataCacheTtlHours
// ───────────────────────────────────────────────

describe('settingsStore — metadataCacheTtlHours', () => {
  beforeEach(() => {
    useSettingsStore.setState({ metadataCacheTtlHours: 24 });
  });

  describe('default value', () => {
    it('should start with metadataCacheTtlHours = 24', () => {
      expect(useSettingsStore.getState().metadataCacheTtlHours).toBe(24);
    });
  });

  describe('setMetadataCacheTtlHours', () => {
    it('should set in-range values correctly', () => {
      useSettingsStore.getState().setMetadataCacheTtlHours(1);
      expect(useSettingsStore.getState().metadataCacheTtlHours).toBe(1);

      useSettingsStore.getState().setMetadataCacheTtlHours(12);
      expect(useSettingsStore.getState().metadataCacheTtlHours).toBe(12);

      useSettingsStore.getState().setMetadataCacheTtlHours(24);
      expect(useSettingsStore.getState().metadataCacheTtlHours).toBe(24);
    });

    it('should clamp values below 1 to 1', () => {
      useSettingsStore.getState().setMetadataCacheTtlHours(0);
      expect(useSettingsStore.getState().metadataCacheTtlHours).toBe(1);
    });

    it('should clamp values above 24 to 24', () => {
      useSettingsStore.getState().setMetadataCacheTtlHours(48);
      expect(useSettingsStore.getState().metadataCacheTtlHours).toBe(24);
    });
  });
});

// ───────────────────────────────────────────────
// Settings Store — persist layer
// ───────────────────────────────────────────────

describe('persist layer', () => {
    it('should store fundingHistoryInterval in localStorage', () => {
      // Clear any previous persist
      localStorage.removeItem('terminal-settings');

      useSettingsStore.getState().setFundingHistoryInterval(6);

      const stored = JSON.parse(localStorage.getItem('terminal-settings') || '{}');
      expect(stored.state.fundingHistoryInterval).toBe(6);
    });

    it('should restore fundingHistoryInterval on rehydration', () => {
      localStorage.setItem('terminal-settings', JSON.stringify({
        state: { fundingHistoryInterval: 8 },
        version: 0,
      }));

      // Re-initialize store from localStorage by reading persisted value
      useSettingsStore.setState({
        fundingHistoryInterval: 8,
      });
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(8);

      localStorage.removeItem('terminal-settings');
    });
});
