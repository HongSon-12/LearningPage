"use client";
import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SsoSessionGuard({children}:{children:ReactNode}) {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false, pending = false, generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timer);
      if (!cancelled && document.visibilityState === "visible") timer = setTimeout(() => { void check(); }, 20000);
    }
    const controller = new AbortController();
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("edu-session") : null;
    const check = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      clearTimeout(timer);
      const startedGeneration = generation;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        if (cancelled || generation !== startedGeneration) return;
        if (response.status === 401) { cover(); channel?.postMessage("signed-out"); window.location.replace("/da-dang-xuat"); return; }
        const authenticated = response.ok && (await response.json()).authenticated;
        if (cancelled || generation !== startedGeneration) return;
        if (!authenticated) throw Error();
        if(document.visibilityState !== "visible") return;
        const shield=document.getElementById("sso-session-shield"), content=document.getElementById("sso-protected-content");
        if(shield) shield.hidden=true;
        if(content) content.inert=false;
        setStatus("ok");
      } catch { if (!cancelled && generation === startedGeneration) { cover(); setStatus("error"); } }
      finally {
        pending = false;
        if (!cancelled && generation !== startedGeneration && document.visibilityState === "visible") void check();
        else schedule();
      }
    };
    const cover = () => {
      setStatus("checking");
      const shield = document.getElementById("sso-session-shield");
      if (shield) shield.hidden = false;
      const content=document.getElementById("sso-protected-content");if(content) content.inert=true;
    };
    // Hide before leaving the tab so restored snapshots cannot reveal stale content.
    const hide = () => { generation++; clearTimeout(timer); cover(); };
    const visibility = () => { if (document.visibilityState === "hidden") hide(); else void check(); };
    // Ordinary window focus is a background check, like polling: don't flash the UI.
    const focus = () => { void check(); };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) { cover(); void check(); } };
    if (channel) channel.onmessage = event => { if (event.data === "signed-out") { cover(); window.location.replace("/da-dang-xuat"); } };
    void check();
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", pageshow);
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); channel?.close(); window.removeEventListener("focus", focus); window.removeEventListener("pageshow", pageshow); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", visibility); };
  }, [retry]);
  useEffect(() => { const shield = document.getElementById("sso-session-shield"); if (shield) shield.hidden = status === "ok"; }, [status]);
  return <><div id="sso-protected-content" inert={status !== "ok"} aria-hidden={status !== "ok"}>{children}</div><div id="sso-session-shield" hidden={status === "ok"} className="fixed inset-0 z-[200] bg-background" role="status" aria-live="polite"><div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">{status !== "error" && <LoaderCircle className="size-6 animate-spin"/>}<p>{status === "error" ? "Chưa kiểm tra được phiên đăng nhập. Vui lòng thử lại." : "Đang kiểm tra phiên đăng nhập…"}</p>{status === "error" && <Button onClick={() => { setStatus("checking"); setRetry(value => value + 1); }}>Thử lại</Button>}</div></div></>;
}
