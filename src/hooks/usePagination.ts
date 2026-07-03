import { useState, useEffect, useMemo, useCallback, type DependencyList } from 'react';

export interface UsePaginationResult<T> {
  /** Current active page (1-indexed) */
  page: number;
  /** Set the current page */
  setPage: (page: number) => void;
  /** Sliced array for the current page */
  paginated: T[];
  /** Total number of pages */
  totalPages: number;
  /** 1-based start item index (for "Showing X to Y" labels) */
  startItem: number;
  /** 1-based end item index  */
  endItem: number;
  /** Total items being paginated across */
  totalItems: number;
}

/**
 * Centralized pagination hook.
 *
 * @param data    The full (filtered) array to paginate.
 * @param itemsPerPage  Items per page (default 50).
 * @param resetDeps     Dependency list — page resets to 1 when these change.
 */
export function usePagination<T>(
  data: T[],
  itemsPerPage = 50,
  resetDeps: DependencyList = [],
): UsePaginationResult<T> {
  const [page, setPageState] = useState(1);

  // Reset to page 1 when filters/data deps change
  useEffect(() => {
    setPageState(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / itemsPerPage)),
    [data.length, itemsPerPage],
  );

  // Clamp page when data shrinks
  useEffect(() => {
    if (page > totalPages) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  const setPage = useCallback((next: number) => {
    setPageState(next);
  }, []);

  const paginated = useMemo(
    () => data.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [data, page, itemsPerPage],
  );

  const startItem = data.length === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, data.length);

  return { page, setPage, paginated, totalPages, startItem, endItem, totalItems: data.length };
}
