import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/permissions";
import { classScope } from "@/lib/permissions";
import { studentScope } from "@/lib/students";
import { RequestError } from "@/lib/security";
const inputSchema = z.object({
  query: z.string().trim().max(120),
  review: z.enum(["all", "review", "confirmed"]),
  classId: z.string().max(64),
  page: z.number().int().min(1).max(1000000),
});
import type { StudentDirectoryFilter } from "@/lib/student-directory-input";
export type { StudentDirectoryFilter } from "@/lib/student-directory-input";
export async function queryStudentDirectory(
  actor: Actor,
  input: StudentDirectoryFilter,
) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new RequestError("Bộ lọc học viên không hợp lệ.");
  const filter = parsed.data,
    scope = studentScope(actor),
    courseScope = classScope(actor);
  const reviewWhere: Prisma.StudentWhereInput = {
    OR: [
      { needsReview: true },
      {
        registrations: {
          some: { class: courseScope, profileReviewRequired: true },
        },
      },
    ],
  };
  const search: Prisma.StudentWhereInput = filter.query
    ? {
        OR: [
          { fullName: { contains: filter.query, mode: "insensitive" } },
          { phone: { contains: filter.query } },
          { email: { contains: filter.query, mode: "insensitive" } },
          ...(actor.role !== "ACCOUNTANT"
            ? [{ cccd: { contains: filter.query } }]
            : []),
        ],
      }
    : {};
  const where: Prisma.StudentWhereInput = {
    AND: [
      scope,
      search,
      ...(filter.review === "review"
        ? [reviewWhere]
        : filter.review === "confirmed"
          ? [{ NOT: reviewWhere }]
          : []),
      ...(filter.classId
        ? [
            {
              registrations: {
                some: { classId: filter.classId, class: courseScope },
              },
            },
          ]
        : []),
    ],
  };
  return prisma.$transaction(
    async (tx) => {
      const [all, review, total] = await Promise.all([
        tx.student.count({ where: scope }),
        tx.student.count({ where: { AND: [scope, reviewWhere] } }),
        tx.student.count({ where }),
      ]);
      const pages = Math.max(1, Math.ceil(total / 20)),
        page = Math.min(filter.page, pages);
      const rows = await tx.student.findMany({
        where,
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
        take: 20,
        skip: (page - 1) * 20,
        select: {
          id: true,
          fullName: true,
          dob: true,
          cccd: true,
          phone: true,
          email: true,
          needsReview: true,
          registrations: {
            where: { class: courseScope, profileReviewRequired: true },
            select: { id: true },
            take: 1,
          },
          _count: {
            select: { registrations: { where: { class: courseScope } } },
          },
        },
      });
      return {
        items: rows.map((row) => ({
          id: row.id,
          fullName: row.fullName,
          dob: row.dob.toISOString().slice(0, 10),
          cccd: row.cccd
            ? actor.role === "ACCOUNTANT"
              ? `********${row.cccd.slice(-4)}`
              : row.cccd
            : null,
          phone: row.phone,
          email: row.email,
          needsReview: row.needsReview || row.registrations.length > 0,
          registrations: row._count.registrations,
        })),
        page,
        pages,
        total,
        summary: { all, review, confirmed: all - review },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export type StudentDirectoryData = Awaited<
  ReturnType<typeof queryStudentDirectory>
>;
