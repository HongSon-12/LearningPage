import "dotenv/config";
import assert from "node:assert/strict";
import {seedDemoData,clearDemoData} from "../src/lib/demo-data";
async function main(){
 assert(process.env.NODE_ENV!=="production","Dữ liệu mẫu chỉ dành cho local.");
 assert(process.env.DATABASE_URL && ["localhost","127.0.0.1","::1"].includes(new URL(process.env.DATABASE_URL).hostname),"Dữ liệu mẫu chỉ dành cho PostgreSQL local.");
 const prisma=(await import("../src/lib/prisma")).default;
 try{if(process.argv.includes("--clear")){await clearDemoData(prisma);console.log("Đã xóa đúng bộ dữ liệu mẫu local.");}else console.log(JSON.stringify(await seedDemoData(prisma)));}finally{await prisma.$disconnect();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
