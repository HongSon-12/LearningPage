import Link from "next/link";
import prisma from "@/lib/prisma";
import { occupiedWhere } from "@/lib/admissions";
import { programs, type ProgramType } from "@/lib/programs";
export default async function RelatedCourses({excludeId,type}:{excludeId?:string;type?:ProgramType}) {
 const courses=await prisma.class.findMany({where:{status:"OPEN",startDate:{gte:new Date(new Date().setHours(0,0,0,0))},...(excludeId?{id:{not:excludeId}}:{})},orderBy:{startDate:"asc"},take:30,include:{_count:{select:{registrations:{where:occupiedWhere}}}}});
 const sorted=[...courses].sort((a,b)=>Number(b.courseType===type)-Number(a.courseType===type)).slice(0,6);
 return <section className="py-12 space-y-6"><h2 className="text-3xl font-bold">Các lớp đang và sắp khai giảng</h2><p>Chọn lịch học hoặc khám phá chương trình phù hợp với bạn.</p>
 {sorted.length?<div className="grid md:grid-cols-3 gap-5">{sorted.map(c=>{const remaining=c.capacity-c._count.registrations;const expired=c.registrationDeadline&&c.registrationDeadline<new Date();return <article key={c.id} className="bg-white border rounded-2xl p-6 flex flex-col gap-3"><span className="text-sm text-blue-600">{programs[c.courseType].name}</span><h3 className="font-bold text-xl">{c.name}</h3><p>{c.code} · {c.startDate.toLocaleDateString("vi-VN")}</p><p>{c.location}</p><p className="font-semibold">{c.fee.toLocaleString("vi-VN")} đ · {Math.max(0,remaining)} chỗ còn lại</p><Link href={`/lop/${c.id}`} className="text-blue-600 underline">Xem lớp học</Link>{remaining>0&&!expired&&<Link href={`/register/${c.id}`} className="mt-auto text-center bg-blue-600 text-white p-3 rounded-xl">Đăng ký</Link>}</article>;})}</div>:<p className="text-gray-500">Lịch khai giảng mới sẽ được cập nhật tại đây.</p>}
 <div className="flex flex-wrap gap-3">{Object.entries(programs).map(([key,p])=><Link key={key} href={key==="COMMUNITY_FIRST_AID"?"/hocsocapcuu":`/dao-tao/${p.slug}`} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full">{p.name}</Link>)}</div></section>;
}
