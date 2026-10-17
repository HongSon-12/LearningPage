import { chooseSelect } from "./controls-helper";
import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID, randomInt } from "node:crypto";
import { mkdir } from "node:fs/promises";
import prisma from "../src/lib/prisma";
import { hashSecret } from "../src/lib/security";
import { sendClaimedSearchJob } from "../src/lib/search-email-worker";
import { reserveOnline } from "../src/lib/admissions";
import { removePrivate } from "../src/lib/private-storage";
const runId = randomUUID();
const userIds: string[] = [],
  classIds: string[] = [],
  fileIds: string[] = [];
const sessions: Record<string, string> = {};
let courseId = "",
  code = "";
let lookupStudentId = "",
  outsideCourseId = "";
const lookupCccd =
  "99" + String(randomInt(0, 10_000_000_000)).padStart(10, "0");
const runStartedAt = new Date();
const cap = randomUUID() + randomUUID();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
  "base64",
);
const origin = "http://localhost:3101";
test.beforeAll(async () => {
  await mkdir(".local/ui-phase2", { recursive: true });
  let managerId = "";
  for (const role of ["ADMIN", "CLASS_MANAGER", "ACCOUNTANT"] as const) {
    const user = await prisma.user.create({
      data: {
        username: `sec-ui-${role}-${runId}`,
        passwordHash: "unused",
        role,
      },
    });
    userIds.push(user.id);
    if (role === "CLASS_MANAGER") managerId = user.id;
    const raw = randomUUID() + randomUUID();
    sessions[role] = raw;
    await prisma.session.create({
      data: {
        tokenHash: hashSecret(raw),
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
  }
  const course = await prisma.class.create({
    data: {
      code: `SECUI-${runId}`,
      name: "Khóa học giả lập bảo mật",
      startTime: "08:00",
      endTime: "12:00",
      managerId,
    },
  });
  courseId = course.id;
  classIds.push(course.id);
  const student = await prisma.student.create({
    data: {
      cccd: lookupCccd,
      fullName: "Học Viên Giả Lập",
      dob: new Date("1990-01-01"),
      phone: "0900000000",
      email: "security-ui@example.invalid",
      needsReview: false,
    },
  });
  lookupStudentId = student.id;
  const outside = await prisma.class.create({
    data: {
      code: `SECUI-OUT-${runId}`,
      name: "Lịch sử lớp khác",
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  classIds.push(outside.id);
  outsideCourseId = outside.id;
  await prisma.registration.create({
    data: {
      studentId: student.id,
      classId: outside.id,
      fullName: student.fullName,
      dob: student.dob,
      phone: student.phone,
      cccd: lookupCccd,
      email: student.email,
      certificateCode: "SYNTHETIC-CERT",
      status: "APPROVED",
    },
  });
  const lookupReg = await prisma.registration.create({
    data: {
      classId: courseId,
      fullName: "Học Viên Giả Lập",
      dob: new Date("1990-01-01"),
      phone: "0900000000",
      cccd: lookupCccd,
      studentId: student.id,
      email: "security-ui@example.invalid",
    },
  });
  expect(lookupReg.studentId).toBe(student.id);
});
test.afterAll(async () => {
  const linkedStudents = await prisma.registration.findMany({
    where: { classId: { in: classIds } },
    select: { studentId: true },
  });
  const files = await prisma.storedFile.findMany({
    where: { id: { in: fileIds } },
  });
  await prisma.registration.deleteMany({
    where: { classId: { in: classIds } },
  });
  await prisma.storedFile.deleteMany({ where: { id: { in: fileIds } } });
  for (const file of files) await removePrivate(file.storageKey);
  await prisma.class.deleteMany({ where: { id: { in: classIds } } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: { in: userIds } },
        { resourceId: { in: [...fileIds, ...classIds] } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.student.deleteMany({
    where: {
      id: {
        in: [
          lookupStudentId,
          ...linkedStudents.flatMap((row) =>
            row.studentId ? [row.studentId] : [],
          ),
        ],
      },
      createdAt: { gte: runStartedAt },
      registrations: { none: {} },
    },
  });
  await prisma.$disconnect();
});
test("private upload/download HTTP boundary, revoked session and export audit", async ({
  request,
}) => {
  const multipart = {
    file: { name: "synthetic.png", mimeType: "image/png", buffer: png },
    classId: courseId,
    kind: "ID_PHOTO",
    receiptToken: cap,
  };
  expect(
    (
      await request.post("/api/upload", {
        multipart,
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/upload", {
        multipart: {
          ...multipart,
          file: { ...multipart.file, name: "x.php.png" },
        },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(400);
  const response = await request.post("/api/upload", {
    multipart,
    headers: { Origin: origin },
  });
  expect(response.status()).toBe(200);
  const upload = await response.json();
  fileIds.push(upload.fileId);
  expect(upload.url).toBe(`/api/files/${upload.fileId}`);
  expect((await request.get(upload.url)).status()).toBe(404);
  const receiptResponse = await request.post("/api/upload", {
    multipart: { ...multipart, kind: "RECEIPT" },
    headers: { Origin: origin },
  });
  const receipt = await receiptResponse.json();
  fileIds.push(receipt.fileId);
  await reserveOnline({
    classId: courseId,
    fullName: "Học Viên Giả Lập",
    dob: new Date("1990-01-01"),
    phone: "0900000000",
    cccd: "synthetic-ui-private",
    email: "security-ui@example.invalid",
    requestKey: randomUUID(),
    receiptToken: cap,
    idPhotoUrl: upload.url,
    paymentReceiptUrl: receipt.url,
  });
  for (const role of ["ADMIN", "CLASS_MANAGER"]) {
    const result = await request.get(upload.url, {
      headers: { Cookie: `ttcc_session=${sessions[role]}` },
    });
    expect(result.status()).toBe(200);
    expect(result.headers()["cache-control"]).toContain("no-store");
    expect(result.headers()["content-disposition"]).toContain("attachment;");
    expect(result.headers()["x-content-type-options"]).toBe("nosniff");
    expect(result.headers()["content-security-policy"]).toContain("sandbox");
    expect(await result.body()).toEqual(png);
  }
  expect(
    (
      await request.get(upload.url, {
        headers: { Cookie: `ttcc_session=${sessions.ACCOUNTANT}` },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(receipt.url, {
        headers: { Cookie: `ttcc_session=${sessions.ACCOUNTANT}` },
      })
    ).status(),
  ).toBe(200);
  const exported = await request.get(`/api/admin/excel?classId=${courseId}`, {
    headers: { Cookie: `ttcc_session=${sessions.ADMIN}` },
  });
  expect(exported.status()).toBe(200);
  expect(
    await prisma.auditLog.count({
      where: {
        actorId: userIds[0],
        action: "EXCEL_EXPORT",
        resourceId: courseId,
      },
    }),
  ).toBe(1);
  await prisma.user.update({
    where: { id: userIds[1] },
    data: { active: false },
  });
  expect(
    (
      await request.get(upload.url, {
        headers: { Cookie: `ttcc_session=${sessions.CLASS_MANAGER}` },
      })
    ).status(),
  ).toBe(404);
  expect((await request.get("/uploads/old-file.png")).status()).toBe(404);
  expect((await request.get("/.local/uploads/anything.png")).status()).toBe(
    404,
  );
});
test("CCCD email code verifies once and shows canonical student history on mobile", async ({
  page,
}) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search");
  await expect(page.getByLabel("Email đã đăng ký")).toHaveCount(0);
  await page.getByLabel("Số căn cước công dân").fill(lookupCccd);
  await page
    .getByRole("button", { name: "Gửi mã xác thực", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Xác thực email" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lịch sử học", exact: true }),
  ).toHaveCount(0);
  const job = await prisma.emailOutbox.findFirstOrThrow({
    where: {
      studentId: lookupStudentId,
      status: "PENDING",
      type: "SEARCH_OTP",
    },
  });
  await sendClaimedSearchJob(job.id, async (_to, _subject, html) => {
    code = /<strong>([0-9]{6})<\/strong>/.exec(html)![1];
  });
  expect(code).toMatch(/^[0-9]{6}$/);
  await page
    .getByLabel("Mã xác thực", { exact: true })
    .fill(code === "000000" ? "000001" : "000000");
  await page
    .getByRole("button", { name: "Xác thực và xem lịch sử học" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Mã xác thực không đúng",
  );
  await page.getByLabel("Mã xác thực", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Xác thực và xem lịch sử học" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lịch sử học", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC-CERT", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lịch sử lớp khác", exact: true }),
  ).toBeVisible();
  expect(await page.content()).not.toContain(lookupCccd);
  expect(await page.content()).not.toContain("0900000000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/ui-phase2/otp-history-390.png",
    fullPage: true,
  });
  expect(
    (
      await prisma.lookupChallenge.findUniqueOrThrow({
        where: { id: job.challengeId! },
      })
    ).usedAt,
  ).not.toBeNull();
  await page.reload();
  await expect(page.getByLabel("Số căn cước công dân")).toBeVisible();
  await expect(page.getByText("SYNTHETIC-CERT", { exact: true })).toHaveCount(
    0,
  );
});
test("student dossier enforces class history scope and admin-only canonical contact editing", async ({
  page,
  request,
}) => {
  await prisma.user.update({
    where: { id: userIds[1] },
    data: { active: true },
  });
  const scoped = await request.get(`/students/${lookupStudentId}`, {
    headers: { Cookie: `ttcc_session=${sessions.CLASS_MANAGER}` },
  });
  expect(scoped.status()).toBe(200);
  const html = await scoped.text();
  expect(html).not.toContain("SYNTHETIC-CERT");
  expect(html).not.toContain("Lưu hồ sơ đã đối chiếu");
  const outsideStudent = await prisma.student.create({
    data: {
      fullName: "Outside Student",
      dob: new Date("1990-01-01"),
      phone: "0900000000",
    },
  });
  await prisma.registration.create({
    data: {
      classId: outsideCourseId,
      studentId: outsideStudent.id,
      fullName: "Outside Student",
      dob: new Date("1990-01-01"),
      phone: "0900000000",
    },
  });
  expect(
    (
      await request.get(`/students/${outsideStudent.id}`, {
        headers: { Cookie: `ttcc_session=${sessions.CLASS_MANAGER}` },
      })
    ).status(),
  ).toBe(404);
  await page
    .context()
    .addCookies([{ name: "ttcc_session", value: sessions.ADMIN, url: origin }]);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`/students/${lookupStudentId}`);
  await page
    .getByLabel("Email nhận mã tra cứu", { exact: true })
    .fill("profile-confirmed@example.invalid");
  await page
    .getByLabel(
      "Tôi đã đối chiếu thông tin định danh, email và các lần đăng ký trong hồ sơ với học viên.",
    )
    .check();
  const submitted = page.waitForRequest(
    (req) => req.method() === "POST" && Boolean(req.headers()["next-action"]),
  );
  await page.getByRole("button", { name: "Lưu hồ sơ đã đối chiếu" }).click();
  const mutation = await submitted;
  await expect(page.getByRole("status")).toContainText("Đã lưu hồ sơ học viên");
  expect(
    (await prisma.student.findUniqueOrThrow({ where: { id: lookupStudentId } }))
      .email,
  ).toBe("profile-confirmed@example.invalid");
  expect(
    await prisma.auditLog.count({
      where: {
        action: "STUDENT_PROFILE_CONFIRMED",
        resourceId: lookupStudentId,
      },
    }),
  ).toBe(1);
  await page.screenshot({
    path: ".local/ui-phase2/student-profile-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/ui-phase2/student-profile-390.png",
    fullPage: true,
  });
  for (const role of ["CLASS_MANAGER", "ACCOUNTANT"]) {
    const denied = await request.post(mutation.url(), {
      headers: {
        Origin: origin,
        Cookie: `ttcc_session=${sessions[role]}`,
        "Next-Action": mutation.headers()["next-action"],
        "Content-Type": mutation.headers()["content-type"],
        Accept: "text/x-component",
      },
      data: mutation.postDataBuffer()!,
    });
    expect(await denied.text()).toContain(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  }
  expect(
    await prisma.auditLog.count({
      where: {
        action: "STUDENT_PROFILE_CONFIRMED",
        resourceId: lookupStudentId,
      },
    }),
  ).toBe(1);
});

test("public wizard binds staged identity and receipt files without requiring email", async ({
  page,
}) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
  await page.goto(`/register/${courseId}`);
  await page.getByRole("button", { name: "Tiếp tục điền thông tin" }).click();
  const cccd = "99" + String(randomInt(0, 10_000_000_000)).padStart(10, "0");
  await expect(page.getByPlaceholder("VD: Nguyễn Văn A")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Số CCCD", exact: true }).fill(cccd);
  await page.getByRole("button", { name: "Tự điền thông tin", exact: true }).click();
  await page.getByPlaceholder("VD: Nguyễn Văn A").fill("Học Viên Kiểm Thử");
  await chooseSelect(page, page.getByRole("combobox", { name: "Giới tính", exact: true }), "MALE");
  await page
    .getByRole("textbox", { name: "Ngày sinh", exact: true })
    .fill("01/01/1990");

  await page.getByPlaceholder("VD: 0987654321").fill("0900000000");
  const uploaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/upload") &&
      response.request().method() === "POST",
  );
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "identity.png",
    mimeType: "image/png",
    buffer: png,
  });
  const identity = await (await uploaded).json();
  expect(identity.success).toBe(true);
  fileIds.push(identity.fileId);
  await expect(
    page.getByText("Đã tải lên CCCD", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xác nhận và tiếp tục thanh toán" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hướng dẫn Thanh toán" }),
  ).toBeVisible();
  const reg = await prisma.registration.findFirstOrThrow({
    where: { classId: courseId, cccd },
  });
  expect(reg.email).toBeNull();
  expect(reg.idPhotoFileId).toBe(identity.fileId);
  await expect(page.getByText(reg.id, { exact: true })).toBeVisible();
  const receiptResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/upload") &&
      response.request().method() === "POST",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
  const receipt = await (await receiptResponse).json();
  expect(receipt.success).toBe(true);
  fileIds.push(receipt.fileId);
  await expect(
    page.getByText("Đã tải lên Biên lai", { exact: true }),
  ).toBeVisible();
  expect(
    (await prisma.registration.findUniqueOrThrow({ where: { id: reg.id } }))
      .paymentReceiptFileId,
  ).toBe(receipt.fileId);
  await page.getByRole("button", { name: "Lưu / Hoàn tất đăng ký" }).click();
  await expect(
    page.getByRole("heading", { name: "Đã tiếp nhận thông tin đăng ký!" }),
  ).toBeVisible();
  expect(
    (await prisma.registration.findUniqueOrThrow({ where: { id: reg.id } }))
      .status,
  ).toBe("PENDING");
});

test("returning student verifies email before prefill and can edit the new registration", async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort());
  const cccd = "99" + String(randomInt(1e10)).padStart(10, "0");
  const student = await prisma.student.create({ data: {
    cccd, fullName: "Học Viên Quay Lại", dob: new Date("1991-02-03"), phone: "0900000123",
    email: "returning@example.invalid", needsReview: false,
  } });
  await prisma.registration.create({ data: {
    studentId: student.id, classId: outsideCourseId, cccd, fullName: student.fullName, dob: student.dob,
    phone: student.phone, email: student.email, gender: "FEMALE", organization: "Đơn vị đã đăng ký", workplace: "Cơ sở đã đăng ký",
  } });
  // Newer unresolved snapshot must never override verified canonical identity or optional fields.
  await prisma.registration.create({ data: {
    studentId: student.id, classId: outsideCourseId, cccd, fullName: "Untrusted snapshot", dob: student.dob,
    phone: "0999999999", email: "untrusted@example.invalid", gender: "MALE", organization: "Untrusted organization", profileReviewRequired: true,
  } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/register/${courseId}`);
  await expect(page.locator('a[href="tel:0387644522"].fixed')).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục điền thông tin" }).click();
  await expect(page.getByRole("textbox", { name: "Họ và tên", exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Số CCCD", exact: true }).fill(cccd);
  const requestResponse = page.waitForResponse(res => res.request().method() === "POST" && Boolean(res.request().headers()["next-action"]));
  await page.getByRole("button", { name: "Dùng thông tin đã đăng ký", exact: true }).click();
  const requested = await (await requestResponse).text();
  expect(requested).not.toContain(student.fullName);
  expect(requested).not.toContain(student.email!);
  await expect(page.getByLabel("Mã xác thực email")).toBeVisible();
  await page.getByRole("button", { name: "Quay lại chọn lớp", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục điền thông tin" }).click();
  await expect(page.getByLabel("Mã xác thực email")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Họ và tên", exact: true })).toHaveCount(0);
  const job = await prisma.emailOutbox.findFirstOrThrow({ where: { studentId: student.id, status: "PENDING" } });
  let otp = "";
  await sendClaimedSearchJob(job.id, async (_to, _subject, html) => { otp = /<strong>([0-9]{6})<\/strong>/.exec(html)![1]; });
  await page.getByLabel("Mã xác thực email").fill(otp === "000000" ? "000001" : "000000");
  await page.getByRole("button", { name: "Xác thực và điền thông tin", exact: true }).click();
  await expect(page.getByRole("region", { name: "Định danh học viên" }).getByRole("alert")).toContainText("Mã xác thực không đúng");
  await page.getByLabel("Mã xác thực email").fill(otp);
  await page.getByRole("button", { name: "Xác thực và điền thông tin", exact: true }).click();
  await expect(page.getByRole("region", { name: "Định danh học viên" }).getByRole("status")).toContainText("Chào mừng bạn quay lại");
  await expect(page.getByRole("textbox", { name: "Họ và tên", exact: true })).toHaveValue(student.fullName);
  await expect(page.getByRole("textbox", { name: "Ngày sinh", exact: true })).toHaveValue("03/02/1991");
  await expect(page.getByRole("combobox", { name: "Giới tính", exact: true })).toHaveText("Nữ");
  await expect(page.getByLabel("Đơn vị / tổ chức (nếu có)")).toHaveValue("Đơn vị đã đăng ký");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(student.email!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 938 });
    const controls = await page.locator('#signup-name, #signup-dob, #signup-gender, #signup-phone, #signup-email').evaluateAll(nodes => nodes.map(node => ({ height: node.getBoundingClientRect().height, font: getComputedStyle(node).fontSize })));
    expect(new Set(controls.map(item => item.height))).toEqual(new Set([44]));
    expect(new Set(controls.map(item => item.font))).toEqual(new Set([width < 768 ? "16px" : "14px"]));
    await page.screenshot({ path: `.local/ui-phase2/returning-${width}.png`, fullPage: true });
  }
  await page.getByRole("textbox", { name: "Số điện thoại", exact: true }).fill("0900000456");
  await page.getByLabel("Email", { exact: true }).fill("changed@example.invalid");
  await page.getByRole("button", { name: "Xác nhận và tiếp tục thanh toán", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hướng dẫn Thanh toán" })).toBeVisible();
  const reg = await prisma.registration.findFirstOrThrow({ where: { studentId: student.id, classId: courseId } });
  expect(reg.phone).toBe("0900000456"); expect(reg.profileReviewRequired).toBe(true);
  const canonical = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  expect(canonical.phone).toBe(student.phone); expect(canonical.email).toBe(student.email);
  expect(new URL(page.url()).search).toBe("");
  await page.goto(`/register/${courseId}`);
  await page.getByRole("button", { name: "Tiếp tục điền thông tin" }).click();
  await page.getByRole("textbox", { name: "Số CCCD", exact: true }).fill(cccd);
  await page.getByRole("button", { name: "Tự điền thông tin", exact: true }).click();
  await page.getByRole("textbox", { name: "Họ và tên", exact: true }).fill("Tên đã nhập");
  await page.getByRole("button", { name: "Đổi CCCD", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Họ và tên", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Số CCCD", exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "Số CCCD", exact: true }).fill(cccd);
  await page.getByRole("button", { name: "Tự điền thông tin", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Họ và tên", exact: true })).toHaveValue("");
});
