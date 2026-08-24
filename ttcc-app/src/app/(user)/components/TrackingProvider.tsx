"use client";

import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/app/actions/tracking";

export default function TrackingProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Setup Session ID
    let sessionId = sessionStorage.getItem("ttcc_session_id");
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem("ttcc_session_id", sessionId);
    }

    // 2. Setup Source UTM
    const sourceParam = searchParams.get("source");
    if (sourceParam) {
      sessionStorage.setItem("ttcc_source", sourceParam);
    } else if (!sessionStorage.getItem("ttcc_source") && document.referrer) {
      // Bắt Referer tự động
      const ref = document.referrer.toLowerCase();
      if (ref.includes("facebook.com") || ref.includes("fb.com")) {
        sessionStorage.setItem("ttcc_source", "facebook");
      } else if (ref.includes("zalo.me") || ref.includes("zaloapp")) {
        sessionStorage.setItem("ttcc_source", "zalo");
      } else if (ref.includes("google.com")) {
        sessionStorage.setItem("ttcc_source", "google");
      }
    }
    const currentSource = sessionStorage.getItem("ttcc_source") || "direct";

    // 3. Track Page Load event immediately
    trackEvent(sessionId, currentSource, "page_load");
  }, [searchParams]);

  return <>{children}</>;
}
