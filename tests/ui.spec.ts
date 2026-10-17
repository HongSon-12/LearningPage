import { chooseSelect } from "./controls-helper";
import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { hash } from "bcryptjs";
import prisma from "../src/lib/prisma";

// Only synthetic fixtures are written. Cleanup is limited to IDs created by this run.
const runStartedAt = new Date();
const runId = randomUUID().replaceAll("-", "").slice(0, 10);
const prefix = `UI${runId}`;
const password = randomUUID() + "!";
const usernames = {
  ADMIN: `ui-admin-${runId}`,
  CLASS_MANAGER: `ui-manager-${runId}`,
  ACCOUNTANT: `ui-accountant-${runId}`,
};
const users: string[] = [];
const classIds: string[] = [];
const extraCodes = [`NEW-${runId}`];
let rosterClass = "";
let outsideClass = "";
let firstStudent = "";

async function login(page: Page, role: keyof typeof usernames = "ADMIN") {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập").fill(usernames[role]);
  await page.getByLabel("Mật khẩu").fill(password);
  await page
    .getByRole("button", { name: "Đăng nhập hệ thống", exact: true })
    .click();
  await expect(page).toHaveURL(role === "ADMIN" ? "/" : "/registrations");
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
});

test.beforeAll(async () => {
  await mkdir(".local/ui-phase1", { recursive: true });
  const passwordHash = await hash(password, 12);
  let manager = "";
  for (const role of ["ADMIN", "CLASS_MANAGER", "ACCOUNTANT"] as const) {
    const user = await prisma.user.create({
      data: { username: usernames[role], passwordHash, role },
    });
    users.push(user.id);
    if (role === "CLASS_MANAGER") manager = user.id;
  }
  for (let i = 1; i <= 12; i++) {
    const course = await prisma.class.create({
      data: {
        code: `${prefix}-${String(i).padStart(2, "0")}`,
        name: `Fixture ${prefix} lớp ${i}`,
        startTime: "08:00",
        endTime: "12:00",
        startDate: new Date("2099-01-01"),
        endDate: new Date("2099-01-01"),
        fee: 400000,
        capacity: 40,
        location: "Phòng kiểm thử",
        managerId: manager,
      },
    });
    classIds.push(course.id);
  }
  rosterClass = classIds[0];
  const outside = await prisma.class.create({
    data: {
      code: `OUT-${runId}`,
      name: `Outside ${runId}`,
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  outsideClass = outside.id;
  classIds.push(outside.id);
  for (let i = 1; i <= 12; i++) {
    const student = await prisma.registration.create({
      data: {
        classId: rosterClass,
        fullName: `UI Student ${String(i).padStart(2, "0")}`,
        phone: "0900000000",
        cccd: `fixture-${runId}-${i}`,
        dob: new Date("1990-01-01"),
      },
    });
    if (i === 1) firstStudent = student.id;
  }
});

test.afterAll(async () => {
  const linkedStudents = await prisma.registration.findMany({
    where: { classId: { in: classIds } },
    select: { studentId: true },
  });
  await prisma.registration.deleteMany({
    where: { classId: { in: classIds } },
  });
  await prisma.class.deleteMany({
    where: { OR: [{ id: { in: classIds } }, { code: { in: extraCodes } }] },
  });
  await prisma.loginAttempt.deleteMany({
    where: {
      key: {
        in: Object.values(usernames).map((name) =>
          createHash("sha256").update(name).digest("hex"),
        ),
      },
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.student.deleteMany({
    where: {
      id: {
        in: linkedStudents.flatMap((row) =>
          row.studentId ? [row.studentId] : [],
        ),
      },
      createdAt: { gte: runStartedAt },
      registrations: { none: {} },
    },
  });
  await prisma.$disconnect();
});

test("login labels, invalid credentials, keyboard and responsive layout", async ({
  page,
}) => {
  await page.goto("/login");
  for (const width of [360, 390, 768, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  await page.getByLabel("Tên đăng nhập").fill(usernames.ADMIN);
  await page.getByLabel("Mật khẩu").fill("wrong-test-password");
  await page.getByRole("button", { name: "Đăng nhập hệ thống" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Tên đăng nhập hoặc mật khẩu không đúng",
  );
  await page.screenshot({
    path: ".local/ui-phase1/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".local/ui-phase1/login-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByLabel("Mật khẩu").press("Enter");
  await expect(page).toHaveURL("/");
});

test("course filters, sort, pagination, columns and CRUD form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/courses");
  await page.getByLabel("Tìm lớp học", { exact: true }).fill(prefix);
  await expect(page.getByText("12 lớp học", { exact: true })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await chooseSelect(
    page,
    page.getByLabel("Trạng thái", { exact: true }),
    "DONE",
  );
  await expect(
    page.getByText("Không có lớp phù hợp", { exact: true }),
  ).toBeVisible();
  await chooseSelect(
    page,
    page.getByLabel("Trạng thái", { exact: true }),
    "OPEN",
  );
  await chooseSelect(
    page,
    page.getByLabel("Chương trình", { exact: true }),
    "CPR_BASIC",
  );
  await expect(
    page.getByText("Không có lớp phù hợp", { exact: true }),
  ).toBeVisible();
  await chooseSelect(
    page,
    page.getByLabel("Chương trình", { exact: true }),
    "COMMUNITY_FIRST_AID",
  );
  await page
    .getByRole("textbox", { name: "Khai giảng từ", exact: true })
    .fill("01/02/2099");
  await expect(
    page.getByText("Không có lớp phù hợp", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Khai giảng từ", exact: true })
    .fill("");
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Trang trước", exact: true }).click();
  await page.getByRole("button", { name: "Mã lớp", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText(`${prefix}-01`);
  await page.getByRole("button", { name: "Mã lớp", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText(`${prefix}-12`);
  await page.getByRole("button", { name: "Cột hiển thị", exact: true }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Sĩ số", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("columnheader", { name: "Học viên", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thêm Khóa học", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Mã lớp").fill(extraCodes[0]);
  await dialog.getByLabel("Tên lớp").fill(`Created ${runId}`);
  await dialog.getByLabel("Học phí (VNĐ)").fill("350000");
  await dialog
    .getByRole("textbox", { name: "Ngày bắt đầu", exact: true })
    .fill("01/02/2099");
  await dialog
    .getByRole("textbox", { name: "Ngày kết thúc", exact: true })
    .fill("01/02/2099");
  await dialog
    .getByRole("textbox", { name: "Giờ bắt đầu", exact: true })
    .fill("08:00");
  await dialog
    .getByRole("textbox", { name: "Giờ kết thúc", exact: true })
    .fill("12:00");
  await dialog.getByLabel("Sĩ số tối đa").fill("41");
  await dialog.getByRole("checkbox", { name: "Bác sĩ", exact: true }).check();
  await dialog
    .getByRole("button", { name: "Lưu Khóa Học", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await prisma.class.findUnique({ where: { code: extraCodes[0] } }))
          ?.capacity,
    )
    .toBe(41);
  const created = await prisma.class.findUniqueOrThrow({
    where: { code: extraCodes[0] },
  });
  expect(created.fee).toBe(350000);
  expect(created.targetAudiences).toContain("DOCTOR");
  await page.getByLabel("Tìm lớp học", { exact: true }).fill(extraCodes[0]);
  await page
    .getByRole("button", { name: `Sửa lớp ${extraCodes[0]}`, exact: true })
    .click();
  await dialog.getByLabel("Tên lớp").fill(`Edited ${runId}`);
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText(`Edited ${runId}`);
  await page
    .getByRole("button", { name: `Xóa lớp ${extraCodes[0]}`, exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Xóa lớp ${extraCodes[0]}`, exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: `Xóa lớp ${extraCodes[0]}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect
    .poll(
      async () =>
        await prisma.class.findUnique({ where: { code: extraCodes[0] } }),
    )
    .toBeNull();
});

test("roster table, profile tabs, reject guard and payment action", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/courses/${rosterClass}`);
  await expect(page.getByText("12 hồ sơ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Trang trước", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Tra cứu học viên", exact: true })
    .fill("UI Student 01");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await chooseSelect(
    page,
    page.getByRole("combobox", {
      name: "Thanh toán UI Student 01",
      exact: true,
    }),
    "PAID",
  );
  await expect
    .poll(
      async () =>
        (
          await prisma.registration.findUniqueOrThrow({
            where: { id: firstStudent },
          })
        ).paymentStatus,
    )
    .toBe("PAID");
  await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Từ chối", exact: true }),
  ).toBeDisabled();
  for (const tab of ["Chuyển lớp", "Chứng từ", "Lịch sử", "Thông tin & hồ sơ"])
    await dialog.getByRole("button", { name: tab, exact: true }).click();
  await dialog
    .getByRole("button", { name: "Duyệt hồ sơ", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await prisma.registration.findUniqueOrThrow({
            where: { id: firstStudent },
          })
        ).status,
    )
    .toBe("APPROVED");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Chi tiết", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: ".local/ui-phase1/roster-desktop.png",
    fullPage: true,
  });
});

test("manager and accountant keep their allowed UI and assigned scope", async ({
  page,
}) => {
  await login(page, "CLASS_MANAGER");
  await page.goto("/courses");
  await expect(
    page.getByRole("button", { name: "Thêm Khóa học", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Tài khoản & Phân quyền", exact: true }),
  ).toHaveCount(0);
  const response = await page.goto(`/courses/${outsideClass}`);
  expect(response?.status()).toBe(404);
  await page.goto(`/courses/${rosterClass}`);
  await expect(
    page.getByRole("combobox", { name: /^Thanh toán UI Student/ }),
  ).toHaveCount(0);
  await page.context().clearCookies();
  await login(page, "ACCOUNTANT");
  await page.goto(`/courses/${rosterClass}`);
  await expect(
    page.getByRole("button", {
      name: "Thêm học viên / Đăng ký vét",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Chi tiết", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Duyệt hồ sơ", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Chuyển lớp", exact: true }),
  ).toHaveCount(0);
});

test("mobile menu, no page overflow and dialog keyboard focus", async ({
  page,
}) => {
  await login(page);
  await page.goto("/courses");
  await page.getByLabel("Tìm lớp học", { exact: true }).fill(prefix);
  for (const width of [360, 390, 768, 1366, 1440]) {
    await page.setViewportSize({
      width,
      height: width === 360 ? 800 : width < 768 ? 844 : 900,
    });
    await noOverflow(page);
    await page.screenshot({
      path: `.local/ui-phase1/courses-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const region = page.getByRole("region", { name: /^Bảng lớp học/ });
  await region.focus();
  await region.press("ArrowRight");
  await expect
    .poll(async () => await region.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const trigger = page.getByRole("button", {
    name: "Mở menu quản trị",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Lớp học", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thêm Khóa học", exact: true })
    .click();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: ".local/ui-phase1/class-form-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Thêm Khóa học", exact: true }),
  ).toBeFocused();
});
