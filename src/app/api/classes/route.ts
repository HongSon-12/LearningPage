import { createHash } from "node:crypto";
import { publicClassAvailability } from "@/lib/public-classes";
export async function GET(request: Request) {
  const body = JSON.stringify(await publicClassAvailability());
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  const headers = { "Cache-Control": "public, no-cache", ETag: etag };
  const unchanged = request.headers.get("if-none-match")?.split(",").some(value => value.trim() === "*" || value.trim().replace(/^W\//, "") === etag);
  if (unchanged) return new Response(null, { status: 304, headers });
  return new Response(body, { headers: { ...headers, "Content-Type": "application/json" } });
}
