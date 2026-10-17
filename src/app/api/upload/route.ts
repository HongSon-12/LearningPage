import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export async function POST(request:Request) {
 try {
  const form=await request.formData();const file=form.get("file");
  const types:Record<string,string>={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","application/pdf":"pdf"};
  if(!(file instanceof File)||file.size>5*1024*1024||file.size===0||!types[file.type]) return NextResponse.json({success:false,error:"Chọn ảnh PNG/JPG/WebP hoặc PDF, tối đa 5 MB."},{status:400});
  const buffer=Buffer.from(await file.arrayBuffer());const ext=types[file.type];
  const valid=ext==="png"?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):ext==="jpg"?buffer[0]===255&&buffer[1]===216:ext==="pdf"?buffer.subarray(0,5).toString()==="%PDF-":buffer.subarray(0,4).toString()==="RIFF"&&buffer.subarray(8,12).toString()==="WEBP";
  if(!valid)return NextResponse.json({success:false,error:"Nội dung file không đúng định dạng."},{status:400});
  const name=`${randomUUID()}.${ext}`;const folder=join(process.cwd(),"public","uploads");await mkdir(folder,{recursive:true});await writeFile(join(folder,name),buffer);
  return NextResponse.json({success:true,url:`/uploads/${name}`});
 }catch{return NextResponse.json({success:false,error:"Không thể tải hồ sơ. Vui lòng thử lại."},{status:500});}
}
