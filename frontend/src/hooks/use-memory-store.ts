"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  addMemory,
  initialPlaygroundState,
  resolveContradiction,
  searchMemories,
  type PlaygroundState,
} from "@/lib/memory/simulation";

/** Shared simulation operations; each demo owns an independent store. */
export function useMemoryStore(
  createStore: () => PlaygroundState = initialPlaygroundState,
) {
  const [store, setStore] = useState(createStore);
  const current = useRef(store);

  const commit = useCallback((next: PlaygroundState) => {
    current.current = next;
    setStore(next);
    return next;
  }, []);

  const add = useCallback(
    (content: string, importance: number) => {
      const result = addMemory(current.current, content, importance);
      commit(result.state);
      return result;
    },
    [commit],
  );

  const resolve = useCallback(
    (contradictionId: string, winnerId: string) => {
      return commit(
        resolveContradiction(current.current, contradictionId, winnerId),
      );
    },
    [commit],
  );

  const setImportance = useCallback(
    (memoryId: string, importance: number) => {
      return commit({
        ...current.current,
        memories: current.current.memories.map((memory) =>
          memory.id === memoryId ? { ...memory, importance } : memory,
        ),
      });
    },
    [commit],
  );

  const reset = useCallback(() => commit(createStore()), [commit, createStore]);
  const search = useCallback((query: string, limit = 5) => {
    return searchMemories(current.current, query, limit);
  }, []);

  const activeMemories = useMemo(
    () => store.memories.filter((memory) => memory.is_active),
    [store.memories],
  );
  const openContradictions = useMemo(() => {
    const active = new Set(activeMemories.map((memory) => memory.id));
    return store.contradictions.filter(
      (conflict) =>
        conflict.status === "open" &&
        active.has(conflict.new_memory.id) &&
        active.has(conflict.existing_memory.id),
    );
  }, [store.contradictions, activeMemories]);

  return {
    store,
    activeMemories,
    openContradictions,
    add,
    resolve,
    setImportance,
    reset,
    search,
  };
}
