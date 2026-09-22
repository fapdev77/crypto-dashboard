import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Pause, ChevronDown, Check, Clock } from 'lucide-react';
import { useMarketAnalyticsStore } from '../../../store/marketAnalyticsStore';
import { PollingIntervalSeconds } from '../../../types/marketAnalytics';

const POLLING_OPTIONS: { val: PollingIntervalSeconds; label: string }[] = [
  { val: 5, label: '5s' },
  { val: 10, label: '10s' },
  { val: 15, label: '15s' },
  { val: 30, label: '30s' },
  { val: 60, label: '60s (Default)' },
  { val: 0, label: 'Paused' },
];

export const CircularCountdownRefresh: React.FC = () => {
  const {
    pollingIntervalSeconds,
    setPollingIntervalSeconds,
    refreshData,
    isLoading,
    lastFetched,
  } = useMarketAnalyticsStore();

  const [secondsRemaining, setSecondsRemaining] = useState<number>(pollingIntervalSeconds || 60);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // SVG circular geometry
  const size = 34;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Track seconds remaining and trigger refresh when countdown reaches 0
  useEffect(() => {
    if (pollingIntervalSeconds <= 0) {
      setSecondsRemaining(0);
      return;
    }

    setSecondsRemaining(pollingIntervalSeconds);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Trigger refresh and reset to interval
          refreshData();
          return pollingIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pollingIntervalSeconds, refreshData]);

  // When a manual or external refresh happens, reset countdown to full interval
  useEffect(() => {
    if (pollingIntervalSeconds > 0) {
      setSecondsRemaining(pollingIntervalSeconds);
    }
  }, [lastFetched]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Compute progress for strokeDashoffset (1 = full circle, 0 = depleted)
  const isPaused = pollingIntervalSeconds === 0;
  const progress = isPaused
    ? 0
    : Math.min(1, Math.max(0, secondsRemaining / (pollingIntervalSeconds || 1)));

  const strokeDashoffset = circumference * (1 - progress);

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    refreshData(true);
    if (pollingIntervalSeconds > 0) {
      setSecondsRemaining(pollingIntervalSeconds);
    }
  };

  return (
    <div className="relative flex items-center shrink-0" ref={menuRef}>
      {/* Unified Button: Circular Countdown + Interval Trigger */}
      <div
        className="flex items-center bg-[#1a1b22] hover:bg-[#20222b] border border-[#2a2b30] hover:border-[#383a45] rounded-xl p-1 transition-all shadow-sm group"
        title={
          isPaused
            ? 'Auto-refresh is paused. Click to refresh now.'
            : `Auto-refresh in ${secondsRemaining}s. Click to refresh now.`
        }
      >
        {/* Circular Action Button */}
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="relative flex items-center justify-center p-0.5 rounded-lg focus:outline-none transition-transform active:scale-95 cursor-pointer"
          aria-label="Refresh data"
        >
          <svg
            width={size}
            height={size}
            className="transform -rotate-90 block"
          >
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#2a2b30"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated Depleting Stroke */}
            {!isPaused && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={secondsRemaining <= 3 ? '#F59E0B' : '#2F6BFF'}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-linear"
              />
            )}
          </svg>

          {/* Center Content: Spinner during loading, or Countdown Value, or Pause Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#2F6BFF] animate-spin" />
            ) : isPaused ? (
              <Pause className="w-3 h-3 text-[#8E9299]" />
            ) : (
              <span className="text-[10px] font-bold text-white tracking-tighter leading-none group-hover:text-[#2F6BFF] transition-colors">
                {secondsRemaining}
              </span>
            )}
          </div>
        </button>

        {/* Dropdown Toggle Chevron for Polling Interval */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="px-1 py-1.5 text-[#8E9299] hover:text-white transition-colors focus:outline-none flex items-center"
          title="Change auto-refresh interval"
        >
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${
              isMenuOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </button>
      </div>

      {/* Interval Selector Popover Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#16171d] border border-[#2a2b30] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-[#2a2b30] flex items-center gap-1.5 text-[11px] font-semibold text-[#8E9299] uppercase tracking-wider">
            <Clock className="w-3 h-3 text-[#2F6BFF]" />
            <span>Refresh Interval</span>
          </div>

          <div className="p-1 space-y-0.5">
            {POLLING_OPTIONS.map((opt) => {
              const isSelected = pollingIntervalSeconds === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setPollingIntervalSeconds(opt.val);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#2F6BFF]/15 text-[#2F6BFF]'
                      : 'text-[#C5C8D0] hover:bg-[#1f212a] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />
                    )}
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2F6BFF]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
