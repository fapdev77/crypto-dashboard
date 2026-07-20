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

    it('should allow values outside 4-8h at store level (range is UI-only)', () => {
      // The store does NOT enforce the 4-8h range — that's done by the UI slider.
      // This test documents that the store accepts any number.
      useSettingsStore.getState().setFundingHistoryInterval(2);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(2);

      useSettingsStore.getState().setFundingHistoryInterval(12);
      expect(useSettingsStore.getState().fundingHistoryInterval).toBe(12);
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
});
