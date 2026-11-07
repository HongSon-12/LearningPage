import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedDatabase } from './isolated-db';
async function main() {
    await isolatedDatabase('concurrency', async (prisma) => {
        const { reserveOnline, rosterTransaction, lockClasses, availableClass, occupiedWhere, fullMessage } = await import('../src/lib/admissions');
        const { transferInTransaction } = await import('../src/lib/transfers');
        const actor = await prisma.user.create({ data: { username: 'concurrency-admin', passwordHash: 'unused', role: 'ADMIN' } });
        const base = { name: 'Synthetic concurrency class', startTime: '08:00', endTime: '12:00', startDate: new Date('2099-01-01'), endDate: new Date('2099-01-01'), fee: 400000 };
        const course = (code: string, capacity: number) => prisma.class.create({ data: { ...base, code, capacity } });
        let sequence = 0;
        const input = (classId: string, cccd?: string) => ({ classId, fullName: 'Synthetic Applicant', dob: new Date('1990-01-01'), phone: '0900000000', cccd: cccd || '999999' + String(++sequence).padStart(6, '0'), requestKey: randomUUID(), receiptToken: randomUUID() + randomUUID() });
        const last = await course('LAST-SEAT', 40);
        await prisma.registration.createMany({ data: Array.from({ length: 39 }, (_, i) => ({ classId: last.id, fullName: 'Seed ' + i, dob: new Date('1990-01-01'), phone: '0900000000', cccd: '888888' + String(i).padStart(6, '0') })) });
        const start = performance.now(), race = await Promise.allSettled(Array.from({ length: 64 }, () => reserveOnline(input(last.id))));
        assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
        assert(race.every(r => r.status === 'fulfilled' || r.reason.message === fullMessage));
        assert.equal(await prisma.registration.count({ where: { classId: last.id, ...occupiedWhere } }), 40);
        console.log(`PASS last seat: 64 simultaneous submissions, exactly 1 accepted, no overbooking (${Math.round(performance.now() - start)} ms)`);
        const replay = await course('REPLAY', 10), request = input(replay.id);
        const repeated = await Promise.all(Array.from({ length: 32 }, () => reserveOnline(request)));
        assert.equal(new Set(repeated.map(r => r.registration.id)).size, 1);
        assert.equal(repeated.filter(r => r.created).length, 1);
        assert.equal(await prisma.registration.count({ where: { classId: replay.id } }), 1);
        await assert.rejects(() => reserveOnline({ ...request, receiptToken: randomUUID() + randomUUID() }));
        const alternate = await course('ALTERED-CLASS', 10);
        await assert.rejects(() => reserveOnline({ ...request, classId: alternate.id }));
        console.log('PASS idempotency: 32 identical retries create 1 record; wrong token or class is denied');
        const duplicate = await course('DUPLICATE', 10), cccd = '777777000001';
        const duplicates = await Promise.allSettled(Array.from({ length: 16 }, () => reserveOnline(input(duplicate.id, cccd))));
        assert.equal(duplicates.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(await prisma.registration.count({ where: { classId: duplicate.id, cccd, ...occupiedWhere } }), 1);
        console.log('PASS same identity: 16 different request keys create 1 active registration in the same class');
        const parallel = await Promise.all(Array.from({ length: 8 }, (_, i) => course('PARALLEL-' + i, 10)));
        await Promise.all(parallel.map(c => reserveOnline(input(c.id, '777777000002'))));
        assert.equal(await prisma.student.count({ where: { cccd: '777777000002' } }), 1);
        assert.equal(await prisma.registration.count({ where: { cccd: '777777000002' } }), 8);
        console.log('PASS cross-class identity creation: 8 concurrent classes share one canonical student');
        const busy = await course('BUSY', 3), free = await course('FREE', 3);
        let unlock!: () => void, locked!: () => void;
        const barrier = new Promise<void>(resolve => { locked = resolve; }), release = new Promise<void>(resolve => { unlock = resolve; });
        const held = prisma.$transaction(async (tx) => { await lockClasses(tx, [busy.id]); locked(); await release; }, { timeout: 15000 });
        await barrier;
        try {
            const reserved = await Promise.race([reserveOnline(input(free.id)), new Promise<never>((_, reject) => setTimeout(() => reject(Error('Unrelated class was blocked')), 3000))]);
            assert(reserved.created);
        }
        finally {
            unlock();
            await held;
        }
        console.log('PASS class isolation: holding one class lock does not block another class');
        const from = await course('TRANSFER-SOURCE', 5), to = await course('TRANSFER-LAST', 1), moving = await reserveOnline(input(from.id));
        const contest = await Promise.allSettled([rosterTransaction(tx => transferInTransaction(tx, actor, moving.registration.id, to.id, 'Concurrent last seat')), reserveOnline(input(to.id))]);
        assert.equal(contest.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(await prisma.registration.count({ where: { classId: to.id, ...occupiedWhere } }), 1);
        console.log('PASS transfer vs online reservation: exactly one wins the final seat');
        const restore = await course('RESTORE-LAST', 1), old = await reserveOnline(input(restore.id));
        await prisma.registration.update({ where: { id: old.registration.id }, data: { status: 'REJECTED' } });
        const restoration = rosterTransaction(async (tx) => { await availableClass(tx, restore.id, old.registration.id, true); return tx.registration.update({ where: { id: old.registration.id }, data: { status: 'PENDING' } }); });
        const restoring = await Promise.allSettled([restoration, reserveOnline(input(restore.id))]);
        assert.equal(restoring.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(await prisma.registration.count({ where: { classId: restore.id, ...occupiedWhere } }), 1);
        console.log('PASS restore vs online reservation: no overbooking');
        const resizing = await course('RESIZE', 2);
        await reserveOnline(input(resizing.id));
        const resized = rosterTransaction(async (tx) => {
            await lockClasses(tx, [resizing.id]);
            const count = await tx.registration.count({ where: { classId: resizing.id, ...occupiedWhere } });
            if (count > 1)
                throw Error('Cannot shrink below occupancy');
            return tx.class.update({ where: { id: resizing.id }, data: { capacity: 1 } });
        });
        await Promise.allSettled([resized, reserveOnline(input(resizing.id))]);
        const actual = await prisma.class.findUniqueOrThrow({ where: { id: resizing.id } });
        assert((await prisma.registration.count({ where: { classId: resizing.id, ...occupiedWhere } })) <= actual.capacity);
        console.log('PASS capacity edit vs reservation: occupied seats never exceed committed capacity');
        // The identity can change while an unlisted/new class registration is waiting.
        // Duplicate detection must wait for that identity lock BEFORE reading the old snapshot.
        const { lockStudentIdentities } = await import('../src/lib/students');
        const identityA = await course('IDENTITY-A', 3), identityB = await course('IDENTITY-B', 3);
        const oldCccd = '777777000003', newCccd = '777777000004';
        const original = await reserveOnline(input(identityA.id, oldCccd));
        await reserveOnline(input(identityB.id, oldCccd));
        let identityReady!: () => void, confirmIdentity!: () => void;
        const identityBarrier = new Promise<void>(resolve => { identityReady = resolve; }), confirmation = new Promise<void>(resolve => { confirmIdentity = resolve; });
        const editing = prisma.$transaction(async (tx) => { await lockStudentIdentities(tx, [oldCccd, newCccd]); identityReady(); await confirmation; await tx.student.update({ where: { id: original.registration.studentId! }, data: { cccd: newCccd } }); await tx.registration.updateMany({ where: { studentId: original.registration.studentId }, data: { cccd: newCccd } }); }, { timeout: 15000 });
        await identityBarrier;
        const waiting = reserveOnline(input(identityB.id, newCccd)).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
        try {
            let waitingOnIdentity = false;
            for (let attempt = 0; attempt < 200; attempt++) {
                const key = `ttcc:${process.env.DATABASE_SCHEMA}:class:${identityB.id}`;
                const result = await prisma.$transaction(tx => tx.$queryRaw<{
                    locked: boolean;
                }[]> `SELECT pg_try_advisory_xact_lock(hashtext(${key})) AS locked`);
                if (!result[0].locked) {
                    waitingOnIdentity = true;
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            assert(waitingOnIdentity, 'Registration should hold its class lock while waiting for identity confirmation');
        }
        finally {
            confirmIdentity();
            await editing;
        }
        const afterConfirmation = await waiting;
        assert.equal(afterConfirmation.ok, false);
        assert.equal(await prisma.registration.count({ where: { classId: identityB.id, ...occupiedWhere } }), 1);
        console.log('PASS concurrent identity confirmation: no duplicate is created from a stale CCCD snapshot');
    });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
