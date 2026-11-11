"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function LiveRosterRefresh({initialSnapshot}:{initialSnapshot:string}) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false, pending = false, snapshot = initialSnapshot, etag: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    function schedule() {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible") timer = setTimeout(() => void poll(), 20000);
    }
    async function poll() {
      if (stopped || pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const response = await fetch("/api/classes", { signal: controller.signal, cache: "no-store", headers: etag ? { "If-None-Match": etag } : {} });
        if (stopped) return;
        if (response.status === 304) return;
        if (response.ok) {
          const next = await response.text();
          if (stopped || document.visibilityState !== "visible") return;
          etag = response.headers.get("etag");
          if (!stopped && snapshot !== next) router.refresh();
          snapshot = next;
        }
      } catch { /* Retry on the next visible interval. */ }
      finally { pending = false; schedule(); }
    }
    function visibility() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") void poll();
    }
    // Server-rendered availability is already fresh. No duplicate GET on hydration.
    schedule();
    document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [router, initialSnapshot]);
  return null;
}
