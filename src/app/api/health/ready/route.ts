import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    // Check a migrated application table, not just TCP/database availability.
    await prisma.$queryRaw`SELECT 1 FROM "Setting" LIMIT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
