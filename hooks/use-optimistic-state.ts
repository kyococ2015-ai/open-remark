import { useState, useEffect, useCallback } from 'react';

/**
 * Manages local state with optimistic updates for list data.
 *
 * Uses manual useState instead of React's useOptimistic because
 * useOptimistic auto-reverts pending updates when the async action
 * completes unless the base state reference changes. Since parent
 * Server Components don't re-fetch on success, the base state never
 * changes and the optimistic update would be silently discarded.
 */
export function useOptimisticState<T>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Reset to server data on navigation, filter change, or page refresh
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const updateItem = useCallback(
    (match: (item: T) => boolean, changes: Partial<T>) => {
      setData((prev) =>
        prev.map((item) => (match(item) ? { ...item, ...changes } : item))
      );
    },
    []
  );

  const revertItem = useCallback(
    (match: (item: T) => boolean, original: T) => {
      setData((prev) =>
        prev.map((item) => (match(item) ? original : item))
      );
    },
    []
  );

  const setBusy = useCallback((id: string, busy: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const isBusy = useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds]
  );

  return {
    data,
    updateItem,
    revertItem,
    setBusy,
    isBusy,
  };
}
