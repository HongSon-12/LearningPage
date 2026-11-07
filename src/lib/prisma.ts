import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
function createClient() {
    const configured = Number(process.env.DATABASE_POOL_MAX || 10);
    const max = Number.isInteger(configured) && configured >= 2 && configured <= 100 ? configured : 10;
    const config = { connectionString: process.env.DATABASE_URL, max, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, query_timeout: 15000 };
    // Let the adapter own its pool: avoids cross-version pg instanceof checks and closes on disconnect.
    return new PrismaClient({ adapter: new PrismaPg(config, { schema: process.env.DATABASE_SCHEMA || "public" }) });
}
declare global {
    var prismaSchemaVersion: string | undefined;
    var prismaGlobal: PrismaClient | undefined;
}
const version = `authentik-sso-v7:${process.env.DATABASE_SCHEMA || "public"}`;
const prisma = globalThis.prismaSchemaVersion === version && globalThis.prismaGlobal ? globalThis.prismaGlobal : createClient();
if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
    globalThis.prismaSchemaVersion = version;
}
export default prisma;
