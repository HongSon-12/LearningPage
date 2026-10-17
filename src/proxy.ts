import { NextResponse } from "next/server";
// Old sensitive paths must stay blocked even while a legacy migration/rollback is running.
export function proxy() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
export const config = { matcher: ["/uploads/:path*"] };
