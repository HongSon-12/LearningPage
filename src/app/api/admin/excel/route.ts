import {
  assertOrigin,
  boundedFormData,
  rateLimit,
  requestIdentity,
  audit,
  errorResponse,
} from "@/lib/security";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { excelExport, readExcel, importExcel } from "@/lib/excel";
import { errorMessage } from "@/lib/admissions";
import { revalidatePath } from "next/cache";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    await rateLimit("export", user.id, 30, 60 * 60 * 1000);
    const buffer = await excelExport(
      user,
      params.get("classId"),
      params.get("template") === "1",
    );
    await audit(
      "EXCEL_EXPORT",
      "ALLOWED",
      user.id,
      params.get("classId") || undefined,
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${params.get("template") === "1" ? "mau-hoc-vien" : "hoc-vien"}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 403 });
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const actor = await requireUser();
    await rateLimit(
      "import",
      actor.id + requestIdentity(request.headers),
      30,
      60 * 60 * 1000,
    );
    const form = await boundedFormData(request);
    const file = form.get("file");
    const mode = form.get("mode");
    if (
      !(file instanceof File) ||
      !file.name.endsWith(".xlsx") ||
      file.size > 5 * 1024 * 1024 ||
      !["preview", "commit"].includes(String(mode))
    )
      throw new Error("Chọn file .xlsx tối đa 5 MB.");
    const rows = await readExcel(Buffer.from(await file.arrayBuffer()));
    const report = await importExcel(
      actor,
      rows,
      mode === "commit",
      String(form.get("classId") || "") || undefined,
    );
    if (mode === "commit") {
      revalidatePath("/", "layout");
      revalidatePath("/courses", "layout");
      revalidatePath("/hocsocapcuu/courses");
    }
    await audit(
      mode === "commit" ? "EXCEL_IMPORT" : "EXCEL_PREVIEW",
      "ALLOWED",
      actor.id,
      String(form.get("classId") || "") || undefined,
    );
    return NextResponse.json({
      success: true,
      report,
      committed: mode === "commit",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
