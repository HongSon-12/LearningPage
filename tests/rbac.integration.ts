import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { defaultRolePermissions, permissionKeys } from "../src/lib/permission-catalog";
import { can, classScope } from "../src/lib/permissions";
async function main() {
  const schema = "ttcc_rbac_" + randomUUID().replaceAll("-", "");
  const legacyManagerRole=randomUUID(),legacyAccountingRole=randomUUID();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let prisma: typeof import("../src/lib/prisma").default | undefined;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`); process.env.DATABASE_SCHEMA = schema;
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      for (const dir of (await readdir("prisma/migrations", { withFileTypes: true })).filter(dir=>dir.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))
        {
          if(dir.name==="20261107000300_configurable_permissions")for(const [id,role] of [[legacyManagerRole,"CLASS_MANAGER"],[legacyAccountingRole,"ACCOUNTANT"]])await client.query(`INSERT INTO "CustomRole" (id,name,"nameKey","baseRole",permissions,"updatedAt") VALUES ($1,$1,$1,$2,ARRAY['dashboard.view','classes.view'],now())`,[id,role]);
          await client.query(await readFile(`prisma/migrations/${dir.name}/migration.sql`,"utf8"));
        }
    } finally { client.release(); }
    prisma = (await import("../src/lib/prisma")).default;
    const legacyManager=await prisma.customRole.findUniqueOrThrow({where:{id:legacyManagerRole}}),legacyAccounting=await prisma.customRole.findUniqueOrThrow({where:{id:legacyAccountingRole}});
    assert.deepEqual(legacyManager.permissions,["dashboard.view","classes.view"]);assert.equal(legacyManager.version,1);
    assert.deepEqual(legacyAccounting.permissions,["dashboard.view","classes.view","classes.all"]);assert.equal(legacyAccounting.version,2);
    await prisma.customRole.deleteMany({where:{id:{in:[legacyManagerRole,legacyAccountingRole]}}});
    const { freshActor, transactionPermission } = await import("../src/lib/rbac");
    const { persistRolePolicy } = await import("../src/lib/role-management");
    const accounts = await Promise.all((["ADMIN","CLASS_MANAGER","ACCOUNTANT"] as const).map(role=>prisma!.user.create({data:{username:role,passwordHash:"unused",role}})));
    const [admin, manager, accountant] = await Promise.all(accounts.map(user=>freshActor(user)));
    for (const actor of [admin,manager,accountant]) {
      assert(actor.role);
      const allowed = permissionKeys.filter(key=>can(actor,key));
      assert.deepEqual([...allowed].sort(), [...defaultRolePermissions[actor.role]].sort());
    }
    const accountantVersion=(await prisma.rolePolicy.findUniqueOrThrow({where:{role:"ACCOUNTANT"}})).version;
    assert.deepEqual(classScope(manager), {managerId:manager.id}); assert.deepEqual(classScope(accountant), {});
    await assert.rejects(()=>persistRolePolicy(manager,{role:"CLASS_MANAGER",version:1,permissions:[]}));
    await assert.rejects(()=>persistRolePolicy({...manager,role:"ADMIN"},{role:"CLASS_MANAGER",version:1,permissions:[]}));
    await assert.rejects(()=>persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion,permissions:["unknown"]}));
    await assert.rejects(()=>persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion,permissions:["roles.manage","roles.manage"]}));
    await persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion,permissions:["roles.manage"]});
    const delegated=await freshActor(accountant);assert(can(delegated,"roles.manage"));assert(!can(delegated,"dashboard.view"));
    await persistRolePolicy(delegated,{role:"ADMIN",version:1,permissions:[]});
    assert(!can(await freshActor(admin),"roles.manage"),'ADMIN must honor its stored permissions');
    await assert.rejects(()=>persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion+1,permissions:[]}));
    await persistRolePolicy(delegated,{role:"ADMIN",version:2,permissions:permissionKeys});
    const result = await persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion+1,permissions:[]}); assert.equal(result.version,accountantVersion+2);
    assert.equal(can(await freshActor(accountant),"payments.manage"),false);
    assert.equal(can(await freshActor(accountant),"dashboard.view"),false);
    await assert.rejects(()=>prisma!.$transaction(tx=>transactionPermission(tx,accountant,"payments.manage")));
    await assert.rejects(()=>persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion+1,permissions:[]}));
    const grants = ["payments.manage"];
    const race = await Promise.allSettled([1,2].map(()=>persistRolePolicy(admin,{role:"ACCOUNTANT",version:accountantVersion+2,permissions:grants})));
    assert.equal(race.filter(item=>item.status==="fulfilled").length,1);
    assert.equal(can(await freshActor(accountant),"payments.manage"),true);
    assert.equal(can(await freshActor(accountant),"registrations.view"),false,'Permissions must be independent');
    assert.equal(can(await freshActor(accountant),"invoices.manage"),false);
    const current = await freshActor(accountant); await prisma.user.update({where:{id:accountant.id},data:{active:false}});
    await assert.rejects(()=>prisma!.$transaction(tx=>transactionPermission(tx,current,"payments.manage")));
    const course = await prisma.class.create({data:{code:"ISOLATED-RBAC",name:"Kiểm thử",startTime:"08:00",endTime:"12:00",managerId:manager.id}});
    const reg = await prisma.registration.create({data:{classId:course.id,fullName:"Synthetic",phone:"0900000000",dob:new Date("1990-01-01")}});
    const file = await prisma.storedFile.create({data:{classId:course.id,kind:"ID_PHOTO",storageKey:randomUUID()+".png",mime:"image/png",size:1,sha256:"fixture",registrationId:reg.id}});
    await prisma.registration.update({where:{id:reg.id},data:{idPhotoFileId:file.id}});
    const { accessibleFile } = await import("../src/lib/stored-files");
    const { saveClassSession } = await import("../src/lib/attendance");
    const { excelExport } = await import("../src/lib/excel");
    assert.equal((await accessibleFile(file.id,manager))?.id,file.id);
    const sessionInput = {title:"Buổi kiểm thử",location:"Phòng kiểm thử",startsAt:"2099-01-01T08:00",endsAt:"2099-01-01T12:00"};
    await saveClassSession(manager,course.id,null,sessionInput);
    await excelExport(manager,course.id,false);
    await persistRolePolicy(admin,{role:"CLASS_MANAGER",version:1,permissions:[]});
    assert.equal(await accessibleFile(file.id,manager),null);
    await assert.rejects(()=>saveClassSession(manager,course.id,null,sessionInput));
    await assert.rejects(()=>excelExport(manager,course.id,false));
    assert.equal(await prisma.classSession.count(),1);
    assert.equal(await prisma.registration.count(),1);
    // Missing policies deny instead of silently restoring the defaults.
    await prisma.rolePolicy.delete({where:{role:"CLASS_MANAGER"}});
    assert.equal(can(await freshActor(manager),"classes.view"),false);
    console.log("PASS isolated RBAC: preserved defaults, editable ADMIN/delegation, role-forgery denial, independent grants/unknown validation, empty-policy deny, immediate revocation, stale/concurrent write protection, active account checks, class scope, stale file/session/Excel denial and missing-policy denial");
  } finally {
    await prisma?.$disconnect(); assert.match(schema,/^ttcc_rbac_[a-f0-9]{32}$/); await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await pool.end();
  }
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
