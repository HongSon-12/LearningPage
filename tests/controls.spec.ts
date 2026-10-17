import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID, randomInt } from "node:crypto";
import { mkdir } from "node:fs/promises";
import prisma from "../src/lib/prisma";
import { hashSecret } from "../src/lib/security";
import { chooseSelect } from "./controls-helper";
const runStartedAt = new Date();
const run = randomUUID(),
  userIds: string[] = [],
  classIds: string[] = [];
const createdCode = `CONTROLS-NEW-${run}`;
let token = "",
  studentId = "";
async function setup(page: Page) {
  await page.context().addCookies([
    {
      name: "ttcc_session",
      value: token,
      url: "http://localhost:3101",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function fits(page: Page, locator = page.locator("html")) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  );
}
async function calendarDate(
  page: Page,
  label: string,
  day: string,
  month: string,
  year: string,
) {
  await page
    .getByRole("button", { name: `Mở lịch ${label}`, exact: true })
    .click();
  const popup = page.getByRole("dialog", {
    name: `Bảng chọn ${label}`,
    exact: true,
  });
  await chooseSelect(
    page,
    popup.getByRole("combobox", { name: "Năm", exact: true }),
    year,
  );
  await chooseSelect(
    page,
    popup.getByRole("combobox", { name: "Tháng", exact: true }),
    String(Number(month) - 1),
  );
  await popup
    .getByRole("button", { name: `Ngày ${day}/${month}/${year}`, exact: true })
    .click();
  return popup;
}
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
  await setup(page);
});
test.beforeAll(async () => {
  await mkdir(".local/ui-controls", { recursive: true });
  const user = await prisma.user.create({
    data: {
      username: `controls-admin-${run}`,
      role: "ADMIN",
      passwordHash: "unused",
    },
  });
  userIds.push(user.id);
  token = randomUUID() + randomUUID();
  await prisma.session.create({
    data: {
      tokenHash: hashSecret(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const student = await prisma.student.create({
    data: {
      cccd: "99" + String(randomInt(1e10)).padStart(10, "0"),
      fullName: `Controls Student ${run}`,
      dob: new Date("1990-01-01"),
      phone: "0900000000",
      email: "controls@example.invalid",
      needsReview: false,
    },
  });
  studentId = student.id;
  for (const [i, type] of (
    ["COMMUNITY_FIRST_AID", "CPR_BASIC"] as const
  ).entries()) {
    const course = await prisma.class.create({
      data: {
        code: `CONTROLS-${i}-${run}`,
        name: `Lớp kiểm thử bộ chọn ${run} với tên dài để kiểm tra menu tự xuống dòng trên điện thoại`,
        courseType: type,
        courseBatch: `K${i}`,
        startTime: "08:00",
        endTime: "12:00",
      },
    });
    classIds.push(course.id);
    await prisma.registration.create({
      data: {
        classId: course.id,
        studentId,
        fullName: student.fullName,
        dob: student.dob,
        phone: student.phone,
        cccd: student.cccd,
      },
    });
  }
});
test.afterAll(async () => {
  const courses = await prisma.class.findMany({
    where: { OR: [{ id: { in: classIds } }, { code: createdCode }] },
    select: { id: true },
  });
  const ids = courses.map((row) => row.id);
  const linked = await prisma.registration.findMany({
    where: { classId: { in: ids } },
    select: { studentId: true },
  });
  await prisma.attendance.deleteMany({
    where: { session: { classId: { in: ids } } },
  });
  await prisma.classSession.deleteMany({ where: { classId: { in: ids } } });
  await prisma.registration.deleteMany({ where: { classId: { in: ids } } });
  await prisma.class.deleteMany({ where: { id: { in: ids } } });
  await prisma.student.deleteMany({
    where: {
      id: {
        in: [
          studentId,
          ...linked.flatMap((row) => (row.studentId ? [row.studentId] : [])),
        ],
      },
      registrations: { none: {} },
      createdAt: { gte: runStartedAt },
    },
  });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});
test("custom selects fit mobile, wrap options and restore keyboard focus", async ({
  page,
}) => {
  await page.goto("/courses");
  const trigger = page.getByRole("combobox", {
    name: "Chương trình",
    exact: true,
  });
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await trigger.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await fits(page, menu);
    await expect
      .poll(() => menu.evaluate((element) => getComputedStyle(element).opacity))
      .toBe("1");
    expect(
      await menu.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).toBe("rgb(255, 255, 255)");
    expect(
      await menu.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--color-accent").trim(),
      ),
    ).toBe("#eff6ff");
    await page.screenshot({
      path: `.local/ui-controls/select-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  await trigger.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.goto("/registrations");
  await page
    .getByRole("textbox", { name: "Tra cứu học viên", exact: true })
    .fill(`Controls Student ${run}`);
  await chooseSelect(
    page,
    page.getByRole("combobox", { name: "Chương trình", exact: true }),
    "CPR_BASIC",
  );
  await chooseSelect(
    page,
    page.getByRole("combobox", { name: "Lớp học", exact: true }),
    classIds[1],
  );
  await chooseSelect(
    page,
    page.getByRole("combobox", { name: "Chương trình", exact: true }),
    "COMMUNITY_FIRST_AID",
  );
  await expect(
    page.getByRole("combobox", { name: "Lớp học", exact: true }),
  ).toHaveText("Tất cả lớp");
  await expect(
    page.getByRole("combobox", { name: "Khóa", exact: true }),
  ).toHaveText("Tất cả khóa");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("combobox", { name: "Lớp học", exact: true }).click();
  await fits(page, page.getByRole("listbox"));
  await page.screenshot({
    path: ".local/ui-controls/long-options-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  expect(await page.locator("select:visible").count()).toBe(0);
});
test("Vietnamese calendar selects leap day and clears invalid typed filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/courses");
  await calendarDate(page, "Khai giảng từ", "29", "02", "2024");
  const input = page.getByRole("textbox", {
    name: "Khai giảng từ",
    exact: true,
  });
  await expect(input).toHaveValue("29/02/2024");
  await page
    .getByRole("button", { name: "Mở lịch Khai giảng từ", exact: true })
    .click();
  const popup = page.getByRole("dialog", {
    name: "Bảng chọn Khai giảng từ",
    exact: true,
  });
  await fits(page, popup);
  await expect(popup).toContainText("Tháng 2");
  await page.screenshot({
    path: ".local/ui-controls/calendar-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở lịch Khai giảng từ", exact: true }),
  ).toBeFocused();
  await input.fill("31/02/2024");
  await expect(
    page
      .locator('[data-slot="date-time-picker"]')
      .filter({ has: input })
      .getByRole("alert"),
  ).toContainText("ngày hợp lệ");
  await expect(input).toHaveValue("31/02/2024");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(input).toHaveValue("");
  await input.fill("29022024");
  await expect(input).toHaveValue("29/02/2024");
});
test("calendar and time selectors inside class dialog preserve RHF ISO values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/courses");
  await page
    .getByRole("button", { name: "Thêm Khóa học", exact: true })
    .click();
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Thêm Khóa Học Mới",
      exact: true,
    }),
  });
  await dialog.getByLabel("Mã lớp").fill(createdCode);
  await dialog.getByLabel("Tên lớp").fill("Lớp thử lịch Việt Nam");
  await dialog.getByLabel("Học phí (VNĐ)").fill("0");
  await calendarDate(page, "Ngày bắt đầu", "01", "03", "2099");
  await calendarDate(page, "Ngày kết thúc", "01", "03", "2099");
  await page
    .getByRole("button", { name: "Chọn giờ Giờ bắt đầu", exact: true })
    .click();
  const popup = page.getByRole("dialog", {
    name: "Bảng chọn Giờ bắt đầu",
    exact: true,
  });
  await chooseSelect(
    page,
    popup.getByRole("combobox", { name: "Giờ", exact: true }),
    "08",
  );
  await chooseSelect(
    page,
    popup.getByRole("combobox", { name: "Phút", exact: true }),
    "45",
  );
  await popup.getByRole("button", { name: "Xong", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Giờ kết thúc", exact: true })
    .fill("12:30");
  await chooseSelect(
    page,
    dialog.getByRole("combobox", { name: "Loại chứng chỉ", exact: true }),
    "CONFIRMATION",
  );
  await page.screenshot({
    path: ".local/ui-controls/class-form-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Lưu Khóa Học", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved = await prisma.class.findUniqueOrThrow({
    where: { code: createdCode },
  });
  expect(saved.startDate.toISOString().slice(0, 10)).toBe("2099-03-01");
  expect(saved.startTime).toBe("08:45");
  expect(saved.endTime).toBe("12:30");
  expect(saved.certificateType).toBe("CONFIRMATION");
});
test("date-time popup preserves session date and UTC+7 time", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/courses/${classIds[0]}/sessions`);
  await page.getByRole("button", { name: "Tạo buổi học", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "Tạo buổi học", exact: true }),
  });
  await dialog
    .getByLabel("Tên buổi học", { exact: true })
    .fill("Buổi kiểm thử lịch và giờ");
  const popup = await calendarDate(page, "Bắt đầu", "01", "03", "2099");
  await chooseSelect(
    page,
    popup.getByRole("combobox", { name: "Giờ", exact: true }),
    "08",
  );
  await chooseSelect(
    page,
    popup.getByRole("combobox", { name: "Phút", exact: true }),
    "30",
  );
  await fits(page, popup);
  await page.screenshot({
    path: ".local/ui-controls/datetime-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await popup.getByRole("button", { name: "Xong", exact: true }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Bắt đầu", exact: true }),
  ).toHaveValue("01/03/2099 08:30");
  await dialog
    .getByRole("textbox", { name: "Kết thúc", exact: true })
    .fill("01/03/2099 12:45");
  await dialog
    .getByRole("button", { name: "Lưu buổi học", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved = await prisma.classSession.findFirstOrThrow({
    where: { classId: classIds[0] },
  });
  expect(saved.startsAt.toISOString()).toBe("2099-03-01T01:30:00.000Z");
});
test("profile FormData uses canonical date and manual intake uses select defaults", async ({
  page,
}) => {
  await page.goto(`/students/${studentId}`);
  const input = page.getByRole("textbox", { name: "Ngày sinh", exact: true });
  await expect(input).toHaveValue("01/01/1990");
  await input.fill("29/02/1992");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Lưu hồ sơ đã đối chiếu", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã lưu hồ sơ học viên");
  expect(
    (await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).dob
      .toISOString()
      .slice(0, 10),
  ).toBe("1992-02-29");
  await page.goto(`/courses/${classIds[0]}`);
  await page
    .getByRole("button", { name: "Thêm học viên / Đăng ký vét", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "Hình thức đăng ký", exact: true }),
  ).toHaveText("Thủ công");
  await expect(
    dialog.getByRole("combobox", { name: "Giới tính", exact: true }),
  ).toHaveText("Nam");
  await dialog
    .getByRole("textbox", { name: /Họ và tên/ })
    .fill(`Controls Manual ${run}`);
  await dialog.getByRole("textbox", { name: /Ngày sinh/ }).fill("29/02/1992");
  await dialog
    .getByRole("textbox", { name: /Số điện thoại/ })
    .fill("0900000000");
  await dialog
    .getByRole("textbox", { name: /CCCD/ })
    .fill("99" + String(randomInt(1e10)).padStart(10, "0"));
  await chooseSelect(
    page,
    dialog.getByRole("combobox", { name: "Giới tính", exact: true }),
    "FEMALE",
  );
  await dialog
    .getByRole("button", { name: "Lưu học viên", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved = await prisma.registration.findFirstOrThrow({
    where: { classId: classIds[0], fullName: `Controls Manual ${run}` },
  });
  expect(saved.gender).toBe("FEMALE");
  expect(saved.dob.toISOString().slice(0, 10)).toBe("1992-02-29");
  expect(saved.registrationMethod).toBe("MANUAL");
});
