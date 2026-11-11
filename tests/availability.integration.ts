import "dotenv/config";
import assert from "node:assert/strict";
import { isolatedDatabase } from "./isolated-db";

async function main() {
  await isolatedDatabase("availability", async prisma => {
    const { GET } = await import("../src/app/api/classes/route");
    const { invalidatePublicClasses } = await import("../src/lib/public-classes");
    const course = await prisma.class.create({ data: { code: "availability", name: "Private class metadata must not enter this response", startTime: "08:00", endTime: "12:00", targetAudiences: [] } });
    await prisma.class.create({ data: { code: "closed", name: "Closed", startTime: "08:00", endTime: "12:00", status: "DONE", targetAudiences: [] } });
    const read = (etag?: string) => GET(new Request("http://fixture.test/api/classes", { headers: etag ? { "If-None-Match": etag } : {} }));
    const initial = await read();
    assert.equal(initial.status, 200);
    assert.deepEqual(await initial.json(), [{ id: course.id, capacity: 40, count: 0 }]);
    const etag = initial.headers.get("etag")!;assert(etag);
    const unchanged = await read(etag);assert.equal(unchanged.status, 304);assert.equal(await unchanged.text(), "");
    assert.equal((await read(`W/${etag}`)).status, 304);
    assert.equal((await read(`"unrelated", ${etag}`)).status, 304);
    await prisma.class.update({ where: { id: course.id }, data: { capacity: 45 } });
    invalidatePublicClasses();
    const changed = await read(etag);assert.equal(changed.status, 200);assert.notEqual(changed.headers.get("etag"), etag);
    assert.deepEqual(await changed.json(), [{ id: course.id, capacity: 45, count: 0 }]);
    await prisma.class.update({ where: { id: course.id }, data: { status: "DONE" } });invalidatePublicClasses();
    assert.deepEqual(await (await read()).json(), []);
    console.log("PASS compact public availability, conditional GET/304, weak/list ETags, closed-class exclusion and immediate mutation invalidation");
  });
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
