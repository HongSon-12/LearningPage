import { Link2 } from "lucide-react";
import { pageUser } from "@/lib/auth";
import { programs } from "@/lib/programs";
import { PageHeader } from "../components/AdminUI";
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
  const programLinks = Object.entries(programs).map(([type, p]) => ({
    id: type,
    title: courseNames[type as keyof typeof courseNames],
    description: p.description,
    audience: p.audience,
    path:
      type === "COMMUNITY_FIRST_AID" ? "/hocsocapcuu" : `/dao-tao/${p.slug}`,
  }));
  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title="Link khóa học"
        description="Chọn khóa học và sao chép đường dẫn phù hợp với kênh bạn muốn chia sẻ."
        icon={Link2}
        action={
          <span className="rounded-full border bg-white px-3 py-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5">
            5 chương trình
          </span>
        }
      />
      <CourseLinks programs={programLinks} />
    </div>
  );
}
