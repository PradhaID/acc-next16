"use client";

import { useState, useCallback } from "react";

export function useSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === ids.length && ids.length > 0) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectAll = useCallback(() => setSelected(new Set(ids)), [ids]);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected,
    count: selected.size,
    isAllSelected: ids.length > 0 && selected.size === ids.length,
    toggle,
    toggleAll,
    clear,
    selectAll,
    isSelected,
  };
}
