import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, AlertCircle, Clock, Check } from 'lucide-react';
import { formatIsoDateTime } from '../../utils/dateTimeHelper';

export interface CustomDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: string, endDate: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function CustomDateRangeModal({
  isOpen,
  onClose,
  onApply,
  initialStartDate = '',
  initialEndDate = '',
}: CustomDateRangeModalProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when modal opens or initial dates change
  useEffect(() => {
    if (isOpen) {
      const todayStr = formatIsoDateTime(new Date(), false);
      const defaultStart = initialStartDate || todayStr;
      const defaultEnd = initialEndDate || todayStr;
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      setValidationError(null);
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  // Validate dates whenever either changes
  useEffect(() => {
    if (startDate && endDate) {
      if (startDate > endDate) {
        setValidationError('Start date must be before or equal to End date');
        return;
      }
    }
    setValidationError(null);
  }, [startDate, endDate]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (validationError) return;
    if (!startDate && !endDate) {
      setValidationError('Please select at least a start or end date');
      return;
    }
    onApply(startDate, endDate);
    onClose();
  };

  // Helper presets for fast selection inside the modal
  const applyPreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (daysBack - 1));
    setStartDate(formatIsoDateTime(start, false));
    setEndDate(formatIsoDateTime(end, false));
  };

  const applyThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(formatIsoDateTime(start, false));
    setEndDate(formatIsoDateTime(now, false));
  };

  const applyLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(formatIsoDateTime(start, false));
    setEndDate(formatIsoDateTime(end, false));
  };

  const applyThisYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    setStartDate(formatIsoDateTime(start, false));
    setEndDate(formatIsoDateTime(now, false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-date-range-title"
        className="w-full max-w-md bg-[#16171a] border border-[#2a2b30] rounded-xl shadow-2xl p-5 sm:p-6 text-white space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a2b30]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2F6BFF]/15 border border-[#2F6BFF]/30 flex items-center justify-center text-[#2F6BFF]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 id="custom-date-range-title" className="text-base font-semibold text-white">
                Select Custom Date Range
              </h3>
              <p className="text-xs text-[#8E9299]">Filter activity by precise calendar day boundaries</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8E9299] hover:text-white p-1 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick presets pills */}
        <div>
          <label className="text-xs font-medium text-[#8E9299] block mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="px-2.5 py-1 text-xs bg-[#202227] hover:bg-[#2F6BFF]/20 hover:text-white text-gray-300 rounded-md border border-[#2a2b30] transition-colors"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="px-2.5 py-1 text-xs bg-[#202227] hover:bg-[#2F6BFF]/20 hover:text-white text-gray-300 rounded-md border border-[#2a2b30] transition-colors"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={applyThisMonth}
              className="px-2.5 py-1 text-xs bg-[#202227] hover:bg-[#2F6BFF]/20 hover:text-white text-gray-300 rounded-md border border-[#2a2b30] transition-colors"
            >
              This Month (MTD)
            </button>
            <button
              type="button"
              onClick={applyLastMonth}
              className="px-2.5 py-1 text-xs bg-[#202227] hover:bg-[#2F6BFF]/20 hover:text-white text-gray-300 rounded-md border border-[#2a2b30] transition-colors"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={applyThisYear}
              className="px-2.5 py-1 text-xs bg-[#202227] hover:bg-[#2F6BFF]/20 hover:text-white text-gray-300 rounded-md border border-[#2a2b30] transition-colors"
            >
              This Year (YTD)
            </button>
          </div>
        </div>

        {/* Date Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div>
            <label htmlFor="custom-start-date" className="block text-xs font-medium text-gray-300 mb-1.5">
              Start Date (From)
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <label htmlFor="custom-end-date" className="block text-xs font-medium text-gray-300 mb-1.5">
              End Date (To)
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Validation warning */}
        {validationError && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Active Range Preview */}
        {!validationError && startDate && endDate && (
          <div className="flex items-center justify-between text-xs text-[#8E9299] bg-[#1a1b1e]/60 px-3 py-2 rounded-lg border border-[#2a2b30]/60">
            <span>Selected Range:</span>
            <span className="font-mono text-gray-200">
              {startDate} <span className="text-[#8E9299]">to</span> {endDate}
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2a2b30]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#8E9299] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!!validationError || (!startDate && !endDate)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#2F6BFF] hover:bg-[#285ce0] text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
}
