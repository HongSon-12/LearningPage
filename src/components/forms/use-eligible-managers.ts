"use client";
import { useEffect, useState } from "react";
export type ManagerOption = { id: string; username: string; name: string | null };

// Mounted forms own their request. Closing or switching forms aborts stale responses.
export function useEligibleManagers(enabled: boolean, classId?: string) {
  const [revision, setRevision] = useState(0);
  const key = `${classId || "new"}:${revision}`;
  const [state, setState] = useState<{ key?: string; data?: ManagerOption[]; error?: string }>({});
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/admin/managers${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được người phụ trách.");
        if (!controller.signal.aborted) setState({ key, data: result });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Không tải được người phụ trách." });
      }
    })();
    return () => controller.abort();
  }, [enabled, classId, key]);
  const current = enabled && state.key === key ? state : {};
  return { ...current, loading: enabled && !current.data && !current.error, retry: () => { setState({}); setRevision(value => value + 1); } };
}
