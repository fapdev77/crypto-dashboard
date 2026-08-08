import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Check } from 'lucide-react';

interface PaginationProps {
  id?: string;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  /** When this string value changes, a subtle refresh animation (spinner → checkmark → fade) plays inside the pagination bar. */
  refreshKey?: string;
  /** Custom label for the loading state (default: 'Updating'). */
  refreshLabel?: string;
  /** When false, the refresh indicator waits for this to become true before transitioning from loading to done. */
  refreshDataReady?: boolean;
}

export function Pagination({
  id = 'pagination',
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  refreshKey,
  refreshLabel,
  refreshDataReady,
}: PaginationProps) {
  // ── Refresh animation indicator ──
  const [refreshAnim, setRefreshAnim] = useState<'idle' | 'loading' | 'done' | 'fading'>('idle');
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRefreshRef = useRef(true);
  /** Deferred check: set true after 'loading' first commits, so hooks have time to set isLoading. */
  const loadingDeferredRef = useRef(false);
  /** Counter to force a re-render after deferred check, ensuring Effect 2 fires a second time. */
  const [deferredTick, setDeferredTick] = useState(0);

  const clearAllTimers = () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  };

  // ─── Effect 1: refreshKey change → start loading ───
  useEffect(() => {
    if (!refreshKey) return;
    if (isFirstRefreshRef.current) {
      isFirstRefreshRef.current = false;
      return;
    }
    clearAllTimers();
    loadingDeferredRef.current = false;
    setRefreshAnim('loading');
  }, [refreshKey]);

  // ─── Effect 2: loading → done (data-driven or timer fallback) ───
  // Uses a deferred check: on first render with 'loading', let hooks settle.
  // On subsequent renders with 'loading' still active, check refreshDataReady.
  useEffect(() => {
    if (refreshAnim !== 'loading') {
      loadingDeferredRef.current = false;
      return;
    }

    // Deferred: skip the first render where 'loading' was just committed.
    // This gives descendant hooks (usePositionHistory etc.) time to set isLoading=true.
    if (!loadingDeferredRef.current) {
      loadingDeferredRef.current = true;
      setDeferredTick(t => t + 1); // force re-render so effect fires again
      return;
    }

    // Second+ render with 'loading': hooks have had time to process.
    if (typeof refreshDataReady === 'boolean' && !refreshDataReady) {
      // Data still loading asynchronously — wait for refreshDataReady to become true
      return;
    }

    // Data is ready (or timer fallback when no refreshDataReady prop)
    const delay = typeof refreshDataReady === 'boolean' ? 200 : 400;
    clearAllTimers();
    loadingTimerRef.current = setTimeout(() => {
      setRefreshAnim('done');
    }, delay);

    // Only clean up THIS effect's timer — not doneTimer/fadeTimer from Effect 3
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAnim, refreshDataReady, deferredTick]);

  // ─── Effect 3: done → fading → idle (auto-advance) ───
  useEffect(() => {
    if (refreshAnim !== 'done') return;

    doneTimerRef.current = setTimeout(() => {
      setRefreshAnim('fading');
      fadeTimerRef.current = setTimeout(() => {
        setRefreshAnim('idle');
      }, 400);
    }, 2200);

    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [refreshAnim]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems === 0) return null;

  // Calculate slice coordinates for status text
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div
      id={id}
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-[#111216] border border-[#2a2b30] rounded-xl text-sm"
    >
      {/* Items Count Summary */}
      <div className="flex items-center gap-2">
        <div id={`${id}-summary`} className="text-gray-400 font-medium">
          Showing <span className="text-white font-mono">{startItem}</span> to{' '}
          <span className="text-white font-mono">{endItem}</span> of{' '}
          <span className="text-white font-mono">{totalItems}</span> records
        </div>
        {refreshAnim === 'loading' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] leading-tight font-medium bg-blue-500/10 text-blue-400 select-none">
            <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
            {refreshLabel || 'Updating'}
          </span>
        )}
        {(refreshAnim === 'done' || refreshAnim === 'fading') && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] leading-tight font-medium bg-emerald-500/10 text-emerald-400 select-none transition-all duration-[400ms] ease-out ${
            refreshAnim === 'fading' ? 'opacity-0 scale-50' : ''
          }`}
            style={refreshAnim === 'done' ? { animation: 'refresh-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' } : undefined}
          >
            <Check className="w-3 h-3 shrink-0" style={refreshAnim === 'done' ? { animation: 'refresh-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' } : undefined} />
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div id={`${id}-controls`} className="flex items-center gap-1.5 flex-wrap">
        {/* First Page */}
        <button
          id={`${id}-btn-first`}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded bg-[#1a1b1e] border border-[#2a2b30] text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          id={`${id}-btn-prev`}
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="p-1.5 rounded bg-[#1a1b1e] border border-[#2a2b30] text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Buttons */}
        <div id={`${id}-pages`} className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-gray-500 font-mono select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                id={`${id}-btn-page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] px-2 py-1 rounded text-center font-mono font-medium transition-colors cursor-pointer select-none ${
                  isCurrent
                    ? 'bg-[#2F6BFF] text-white font-bold'
                    : 'bg-[#1a1b1e] border border-[#2a2b30] text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          id={`${id}-btn-next`}
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded bg-[#1a1b1e] border border-[#2a2b30] text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          id={`${id}-btn-last`}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded bg-[#1a1b1e] border border-[#2a2b30] text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
