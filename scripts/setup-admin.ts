import "dotenv/config";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import prisma from "../src/lib/prisma";
async function main() {
 const legacy = "$2b$10$EP/k11Z66F/eD9G20X.tTu2y1X9jI03pD4D/6B.uE6YtJ5pB0lCUK";
 const existing=await prisma.user.findUnique({where:{username:"admin"}});
 if(existing && existing.passwordHash!==legacy) {console.log("Existing admin preserved; no password changed.");return;}
 const password=process.env.BOOTSTRAP_ADMIN_PASSWORD || randomBytes(24).toString("base64url");
 if(password.length<12||password.length>72) throw new Error("Bootstrap password must contain 12–72 characters.");
 const passwordHash=await hash(password,12);
 await prisma.user.upsert({where:{username:"admin"},create:{username:"admin",passwordHash,role:"ADMIN"},update:{passwordHash}});
 await mkdir(".local",{recursive:true,mode:0o700});
 await writeFile(".local/admin-access.txt",`Tên đăng nhập: admin\nMật khẩu: ${password}\nĐường dẫn: http://localhost:3001/login\n`,{mode:0o600});
 await chmod(".local/admin-access.txt",0o600);
 console.log("Admin initialized with a strong password. Credentials saved to .local/admin-access.txt (not tracked).");
}
main().then(async()=>{await prisma.$disconnect();process.exit(0);}).catch(error=>{console.error(error);process.exit(1);});
