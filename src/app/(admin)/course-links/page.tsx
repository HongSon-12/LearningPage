import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import { pageUser } from "@/lib/auth";
import { programs } from "@/lib/programs";
import CourseLinks from "./CourseLinks";

export const dynamic = "force-dynamic";

const courseNames = {
 COMMUNITY_FIRST_AID: "Sơ cấp cứu cộng đồng",
 CME_ABCDE: "CME Tiếp cận ABCDE",
 AMBULANCE_DRIVER: "Nhân viên lái xe cấp cứu",
 CPR_ADVANCED: "Cấp cứu ngừng tuần hoàn hô hấp cơ bản và nâng cao",
 CPR_BASIC: "Cấp cứu ngừng tuần hoàn hô hấp cơ bản",
};

export default async function CourseLinksPage() {
 await pageUser();
 const programLinks=Object.entries(programs).map(([type,p])=>({
  id:type,
  title:courseNames[type as keyof typeof courseNames],
  description:p.description,
  audience:p.audience,
  path:type==="COMMUNITY_FIRST_AID"?"/hocsocapcuu":`/dao-tao/${p.slug}`,
 }));
 return <div className="mx-auto max-w-7xl space-y-7 pb-6">
  <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-sm text-slate-500">
   <Link href="/" className="transition-colors hover:text-blue-700">Quản trị</Link>
   <ChevronRight size={14} aria-hidden="true"/><span className="text-slate-700">Link khóa học</span>
  </nav>
  <header className="flex items-start gap-4">
   <div className="hidden rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600 sm:block"><Link2 size={28} aria-hidden="true"/></div>
   <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight text-slate-900">Link khóa học</h1><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">5 chương trình</span></div>
    <p className="max-w-2xl text-sm leading-6 text-slate-500">Chọn khóa học và sao chép đường dẫn phù hợp với kênh bạn muốn chia sẻ.</p>
   </div>
  </header>
  <CourseLinks programs={programLinks}/>
 </div>;
}
