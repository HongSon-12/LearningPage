import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {Pool} from "pg";
import {hash,compare} from "bcryptjs";
async function main(){
 const schema="ttcc_self_"+randomUUID().replaceAll("-","");const pool=new Pool({connectionString:process.env.DATABASE_URL});let prisma:typeof import("../src/lib/prisma").default|undefined;
 try{
  await pool.query(`CREATE SCHEMA "${schema}"`);process.env.DATABASE_SCHEMA=schema;
  const client=await pool.connect();try{await client.query(`SET search_path TO "${schema}"`);for(const dir of (await readdir("prisma/migrations",{withFileTypes:true})).filter(d=>d.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))await client.query(await readFile(`prisma/migrations/${dir.name}/migration.sql`,"utf8"));}finally{client.release();}
  prisma=(await import("../src/lib/prisma")).default;const {persistOwnAccount}=await import("../src/lib/account-management");const password="self-fixture-password";
  const owner=await prisma.user.create({data:{username:"owner",passwordHash:await hash(password,12),role:"CLASS_MANAGER",email:"owner@example.test"}});
  const other=await prisma.user.create({data:{username:"other",passwordHash:"unused",role:"ADMIN",email:"other@example.test"}});
  await prisma.session.createMany({data:[{userId:owner.id,tokenHash:"owner-session",expiresAt:new Date(Date.now()+3600000)},{userId:owner.id,tokenHash:"owner-second-session",expiresAt:new Date(Date.now()+3600000)},{userId:other.id,tokenHash:"other-session",expiresAt:new Date(Date.now()+3600000)}]});
  const input={email:"owner@example.test",newPassword:"",confirmPassword:""};
  await assert.rejects(()=>persistOwnAccount(owner,{...input,email:"other@example.test"},"owner-session"));
  await assert.rejects(()=>persistOwnAccount(owner,{...input,id:other.id},"owner-session"));
  await assert.rejects(()=>persistOwnAccount(owner,{...input,role:"ADMIN"},"owner-session"));
  await assert.rejects(()=>persistOwnAccount(other,input,"owner-session"));
  await assert.rejects(()=>persistOwnAccount(owner,input,"missing-session"));
  await prisma.session.create({data:{userId:owner.id,tokenHash:"expired-session",expiresAt:new Date(Date.now()-1000)}});
  await assert.rejects(()=>persistOwnAccount(owner,input,"expired-session"));
  await prisma.session.delete({where:{tokenHash:"expired-session"}});
  await assert.rejects(()=>persistOwnAccount(owner,{...input,newPassword:"short",confirmPassword:"short"},"owner-session"));
  await assert.rejects(()=>persistOwnAccount(owner,{...input,newPassword:"new-fixture-password",confirmPassword:"different"},"owner-session"));
  assert.equal((await persistOwnAccount(owner,input,"owner-session")).changed,false);assert.equal(await prisma.session.count({where:{userId:owner.id}}),2);
  const challenge=await prisma.passwordResetChallenge.create({data:{userId:owner.id,emailHash:"synthetic",codeHash:"synthetic",expiresAt:new Date(Date.now()+600000)}});
  await persistOwnAccount(owner,{...input,email:"CHANGED@example.test"},"owner-session");
  const changed=await prisma.user.findUniqueOrThrow({where:{id:owner.id}});assert.equal(changed.email,"changed@example.test");assert.equal(changed.role,"CLASS_MANAGER");assert.equal(changed.active,true);assert.equal(changed.username,"owner");assert.equal(changed.passwordHash,owner.passwordHash);
  assert.equal(await prisma.session.count({where:{userId:owner.id}}),0);assert.equal(await prisma.session.count({where:{userId:other.id}}),1);assert.equal((await prisma.passwordResetChallenge.findUniqueOrThrow({where:{id:challenge.id}})).codeHash,null);
  await assert.rejects(()=>persistOwnAccount(owner,input,"owner-session"));
  await prisma.session.create({data:{userId:owner.id,tokenHash:"fresh-session",expiresAt:new Date(Date.now()+3600000)}});
  const update={...input,email:changed.email,newPassword:"next-fixture-password",confirmPassword:"next-fixture-password"};
  const race=await Promise.allSettled([1,2].map(()=>persistOwnAccount(owner,update,"fresh-session")));assert.equal(race.filter(r=>r.status==="fulfilled").length,1);
  assert(await compare(update.newPassword,(await prisma.user.findUniqueOrThrow({where:{id:owner.id}})).passwordHash));
  await prisma.session.create({data:{userId:owner.id,tokenHash:"disabled-session",expiresAt:new Date(Date.now()+3600000)}});await prisma.user.update({where:{id:owner.id},data:{active:false}});await assert.rejects(()=>persistOwnAccount(owner,input,"disabled-session"));
  assert.equal((await prisma.user.findUniqueOrThrow({where:{id:other.id}})).email,"other@example.test");
  console.log("PASS self account: updates without current password, ownership/session binding, missing/expired session denial, strict field allowlist, unique normalized email, unchanged role/status/username, password validation, no-op, revoked sessions and OTPs, stale/concurrent update and disabled account denial");
 }finally{await prisma?.$disconnect();assert.match(schema,/^ttcc_self_[a-f0-9]{32}$/);await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await pool.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
