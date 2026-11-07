import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir, lstat, realpath, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { Pool } from 'pg';
export async function isolatedDatabase(label: string, work: (prisma: typeof import('../src/lib/prisma').default) => Promise<void>) {
    assert.match(label, /^[a-z_]{1,30}$/);
    const connection = process.env.DATABASE_URL;
    assert(connection && ['localhost', '127.0.0.1', '::1'].includes(new URL(connection).hostname), 'Tests require local PostgreSQL');
    const schema = `ttcc_${label}_${randomUUID().replaceAll('-', '')}`, pool = new Pool({ connectionString: connection });
    let prisma: typeof import('../src/lib/prisma').default | undefined;
    try {
        await pool.query(`CREATE SCHEMA "${schema}"`);
        process.env.DATABASE_SCHEMA = schema;
        const client = await pool.connect();
        try {
            await client.query(`SET search_path TO "${schema}"`);
            for (const dir of (await readdir('prisma/migrations', { withFileTypes: true })).filter(d => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)))
                await client.query(await readFile(`prisma/migrations/${dir.name}/migration.sql`, 'utf8'));
        }
        finally {
            client.release();
        }
        prisma = (await import('../src/lib/prisma')).default;
        await work(prisma);
    }
    finally {
        await prisma?.$disconnect();
        assert.match(schema, /^ttcc_[a-z_]+_[a-f0-9]{32}$/);
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await pool.end();
        const storage=resolve('.local',schema),entry=await lstat(storage).catch(()=>null);
        if(entry){
            const root=await realpath(process.cwd()),actual=await realpath(storage),rel=relative(root,actual);
            if(!rel || rel==='..' || rel.startsWith('..'+sep) || isAbsolute(rel))throw Error('Unsafe fixture storage cleanup');
            await rm(storage,{recursive:true,force:true});
        }
    }
}
