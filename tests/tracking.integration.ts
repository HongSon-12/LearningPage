import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedDatabase } from './isolated-db';
isolatedDatabase('tracking', async (prisma) => {
    const { persistTracking } = await import('../src/lib/tracking');
    for (const input of [{ sessionId: 'invalid', source: 'direct', eventName: 'page_load' }, { sessionId: randomUUID(), source: 'x'.repeat(6000), eventName: 'page_load' }, { sessionId: randomUUID(), source: 'direct', eventName: 'unknown' }])
        await assert.rejects(() => persistTracking(input, 'synthetic'));
    assert.equal(await prisma.trackingEvent.count(), 0);
    const sessionId = randomUUID();
    await Promise.all(Array.from({ length: 20 }, () => persistTracking({ sessionId, source: 'direct', eventName: 'page_load' }, 'synthetic')));
    assert.equal(await prisma.trackingEvent.count(), 1);
    for (let i = 0; i < 40; i++)
        await persistTracking({ sessionId, source: 'direct', eventName: 'page_load' }, 'synthetic');
    await assert.rejects(() => persistTracking({ sessionId, source: 'direct', eventName: 'view_hero' }, 'synthetic'), (error: unknown) => !!error && typeof error === 'object' && 'status' in error && error.status === 429);
    console.log('PASS tracking validation, concurrent deduplication and limits');
}).catch(error => { console.error(error); process.exitCode = 1; });
