import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID, randomInt } from "node:crypto";
import { mkdir } from "node:fs/promises";
import prisma from "../src/lib/prisma";
import { hashSecret } from "../src/lib/security";
const run = randomUUID();
const users: string[] = [],
  classes: string[] = [],
  students: string[] = [];
const tokens: Record<string, string> = {};
const prefix = `DirectoryUI-${run}`,
  outside = `OutsideUI-${run}`;
let cccd = "",
  first = "";
async function asRole(page: Page, role = "ADMIN") {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "ttcc_session",
      value: tokens[role],
      url: "http://localhost:3101",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "localhost"
      ? route.continue()
      : route.abort(),
  );
  await asRole(page);
});
test.beforeAll(async () => {
  await mkdir(".local/ui-layout", { recursive: true });
  for (const role of ["ADMIN", "CLASS_MANAGER", "ACCOUNTANT", "OTHER"]) {
    const u = await prisma.user.create({
      data: {
        username: `layout-${role}-${run}`,
        passwordHash: "unused",
        role:
          role === "OTHER"
            ? "CLASS_MANAGER"
            : (role as "ADMIN" | "CLASS_MANAGER" | "ACCOUNTANT"),
      },
    });
    users.push(u.id);
    tokens[role] = randomUUID() + randomUUID();
    await prisma.session.create({
      data: {
        tokenHash: hashSecret(tokens[role]),
        userId: u.id,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
  }
  for (let i = 0; i < 2; i++) {
    const c = await prisma.class.create({
      data: {
        code: `LAYOUT-${i}-${run}`,
        name: i === 0 ? "Assigned layout fixture" : "Outside layout fixture",
        managerId: users[i === 0 ? 1 : 3],
        startTime: "08:00",
        endTime: "12:00",
      },
    });
    classes.push(c.id);
  }
  for (let i = 0; i < 22; i++) {
    const id = "99" + String(randomInt(1e10)).padStart(10, "0");
    const s = await prisma.student.create({
      data: {
        fullName:
          i === 21 ? outside : `${prefix} ${String(i).padStart(2, "0")}`,
        cccd: id,
        dob: new Date("1990-01-01"),
        phone: "0900000000",
        email: "layout@example.invalid",
        needsReview: i === 0,
      },
    });
    students.push(s.id);
    if (i === 0) {
      first = s.id;
      cccd = id;
    }
    await prisma.registration.create({
      data: {
        studentId: s.id,
        classId: classes[i === 21 ? 1 : 0],
        fullName: s.fullName,
        cccd: id,
        dob: s.dob,
        phone: s.phone,
      },
    });
  }
  await prisma.registration.create({
    data: {
      studentId: first,
      classId: classes[1],
      fullName: `${prefix} 00`,
      cccd,
      dob: new Date("1990-01-01"),
      phone: "0900000000",
    },
  });
});
test.afterAll(async () => {
  await prisma.registration.deleteMany({ where: { classId: { in: classes } } });
  await prisma.student.deleteMany({
    where: { id: { in: students }, registrations: { none: {} } },
  });
  await prisma.class.deleteMany({ where: { id: { in: classes } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
test("each admin page has one top title and uses the available width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1866, height: 938 });
  for (const [path, title] of [
    ["/", "Tổng quan hệ thống"],
    ["/courses", "Quản lý Khóa học"],
    ["/registrations", "Kiểm tra thông tin đăng ký"],
    ["/students", "Hồ sơ học viên"],
    ["/course-links", "Link khóa học"],
    ["/users", "Tài khoản và phân quyền"],
    ["/settings", "Cấu hình hệ thống"],
  ]) {
    await page.goto(path);
    await expect(page.locator('[data-slot="admin-page-title"]')).toHaveText(
      title,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByText("Hệ thống Quản trị", { exact: true }),
    ).toHaveCount(0);
    const top = await page.locator('[data-slot="admin-topbar"]').boundingBox();
    expect(top!.height).toBe(64);
    const main = await page.locator("#admin-main").boundingBox(),
      body = await page.locator("#admin-main>div>div").boundingBox();
    expect(body!.x - main!.x).toBeLessThanOrEqual(21);
    expect(main!.x + main!.width - body!.x - body!.width).toBeLessThanOrEqual(
      21,
    );
    await noOverflow(page);
    const badge = page.locator('[data-slot="badge"]').first();
    if (await badge.count()) expect(await badge.evaluate(el => getComputedStyle(el).fontSize)).toBe("14px");
    const actionHead = page.getByRole("columnheader", { name: "Thao tác", exact: true });
    if (await actionHead.count()) {
      expect(await actionHead.evaluate(el => getComputedStyle(el).textAlign)).toBe("right");
      expect(await actionHead.evaluate(el => getComputedStyle(el).fontSize)).toBe("16px");
    }
    if (["/courses", "/registrations", "/users"].includes(path)) await page.screenshot({ path: `.local/ui-layout/consistency-${path.slice(1)}.png`, fullPage: true });
  }
  await page.goto("/students");
  const queryBox = await page
    .getByRole("textbox", { name: "Tìm học viên", exact: true })
    .boundingBox();
  const classBox = await page
    .getByRole("combobox", { name: "Lớp học", exact: true })
    .boundingBox();
  expect(Math.abs(queryBox!.y - classBox!.y)).toBeLessThanOrEqual(1);
  expect(queryBox!.height).toBe(classBox!.height);
  for (const width of [360, 390, 1440, 1866, 2560]) {
    await page.setViewportSize({ width, height: 938 });
    await page.goto("/students");
    await noOverflow(page);
    const main = await page.locator("#admin-main").boundingBox();
    const intro = await page.locator('[data-slot="page-intro"]').boundingBox();
    expect(intro!.y - main!.y).toBeLessThanOrEqual(21);
    await page.screenshot({
      path: `.local/ui-layout/students-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1866, height: 938 });
  await page.goto("/");
  await page.screenshot({
    path: ".local/ui-layout/dashboard-1866.png",
    fullPage: true,
  });
});
test("student directory searches, filters and paginates without PII URLs; action scope is enforced", async ({
  page,
  request,
}) => {
  await page.goto("/students");
  const input = page.getByRole("textbox", {
    name: "Tìm học viên",
    exact: true,
  });
  await input.fill(prefix);
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText("21 học viên phù hợp");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Hồ sơ cần đối chiếu", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText(`${prefix} 00`);
  expect(new URL(page.url()).search).toBe("");
  await page
    .getByRole("button", { name: "Tất cả học viên", exact: true })
    .click();
  await input.fill(outside);
  const submitted = page.waitForRequest(
    (req) => req.method() === "POST" && Boolean(req.headers()["next-action"]),
  );
  await input.press("Enter");
  const mutation = await submitted;
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText(outside);
  const denied = await request.post(mutation.url(), {
    headers: {
      Origin: "http://localhost:3101",
      Cookie: `ttcc_session=${tokens.CLASS_MANAGER}`,
      "Next-Action": mutation.headers()["next-action"],
      "Content-Type": mutation.headers()["content-type"],
      Accept: "text/x-component",
    },
    data: mutation.postDataBuffer()!,
  });
  expect(await denied.text()).not.toContain(outside);
  await asRole(page, "CLASS_MANAGER");
  await page.goto("/students");
  await page
    .getByRole("textbox", { name: "Tìm học viên", exact: true })
    .fill(outside);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Không có hồ sơ phù hợp", exact: true }),
  ).toBeVisible();
  await asRole(page, "ACCOUNTANT");
  await page.goto("/students");
  await page
    .getByRole("textbox", { name: "Tìm học viên", exact: true })
    .fill(`${prefix} 00`);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText(
    `********${cccd.slice(-4)}`,
  );
  expect(await page.locator("#admin-main").textContent()).not.toContain(cccd);
});
test("profile title follows navigation and detail layout is side by side or stacked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1866, height: 938 });
  await page.goto(`/students/${first}`);
  await expect(page.locator('[data-slot="admin-page-title"]')).toHaveText(
    `${prefix} 00`,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const form = page.locator("#student-profile-editor"),
    history = page.getByRole("region", {
      name: "Lịch sử đăng ký học",
      exact: true,
    });
  let a = await form.boundingBox(),
    b = await history.boundingBox();
  expect(b!.x).toBeGreaterThan(a!.x + a!.width);
  await page.screenshot({
    path: ".local/ui-layout/profile-1866.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  a = await form.boundingBox();
  b = await history.boundingBox();
  expect(b!.y).toBeGreaterThan(a!.y + a!.height);
  await noOverflow(page);
  await page.screenshot({
    path: ".local/ui-layout/profile-390.png",
    fullPage: true,
  });
  await page
    .locator('[data-slot="admin-topbar"]')
    .getByRole("link", { name: "Hồ sơ học viên", exact: true })
    .click();
  await expect(page.locator('[data-slot="admin-page-title"]')).toHaveText(
    "Hồ sơ học viên",
  );
  await asRole(page, "CLASS_MANAGER");
  await page.goto(`/students/${first}`);
  await expect(page.locator("#student-profile-editor")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Lịch sử đăng ký học", exact: true }),
  ).not.toContainText("Outside layout fixture");
});

test("table hover stays continuous with visible action buttons and larger admin type", async ({ page }) => {
  await page.setViewportSize({ width: 1866, height: 938 });
  for (const path of ["/courses", "/registrations", "/users"]) {
    await page.goto(path);
    const row = page.locator('tbody tr').first();
    const cells = row.locator('td');
    const before = await cells.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    const normal = await cells.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    expect(new Set(normal).size).toBe(1);
    await cells.first().hover();
    const hovered = await cells.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    expect(new Set(hovered).size).toBe(1);
    expect(hovered[0]).not.toBe(normal[0]);
    const after = await cells.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    expect(after).toEqual(before);
    const actionBounds = await cells.last().evaluate(node => {
      const cell = node.getBoundingClientRect();
      return Array.from(node.querySelectorAll('[data-slot="button"]'), button => {
        const box = button.getBoundingClientRect();
        return { left: box.left - cell.left, right: cell.right - box.right };
      });
    });
    for (const bounds of actionBounds) {
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeGreaterThanOrEqual(0);
    }
    const action = cells.last().locator('[data-slot="button"]').first();
    await expect(action).toHaveAttribute('data-variant', 'action');
    const style = await action.evaluate(node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, border: style.borderTopWidth, size: style.fontSize };
    });
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(style.border).toBe('1px');
    expect(style.size).toBe('16px');
    const heads = await page.locator('thead th').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    expect(new Set(heads).size).toBe(1);
    await page.screenshot({ path: `.local/ui-layout/hover-${path.slice(1)}.png`, fullPage: true });
  }
  await page.goto('/courses');
  await expect(page.locator('[id^="class-edit-"]').first()).toHaveAttribute('title', /^Sửa lớp /);
  await expect(page.locator('[id^="class-delete-"]').first()).toHaveAttribute('data-variant', 'danger-outline');
  await page.setViewportSize({ width: 390, height: 844 });
  const region = page.getByRole('region', { name: /Bảng lớp học/ });
  await region.evaluate(node => { node.scrollLeft = node.scrollWidth; });
  const mobileRow = region.locator('tbody tr').first();
  await mobileRow.locator('td').last().hover();
  const colors = await mobileRow.locator('td').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  expect(new Set(colors).size).toBe(1);
  expect(colors[0]).not.toBe('rgba(0, 0, 0, 0)');
  await noOverflow(page);
  await page.screenshot({ path: '.local/ui-layout/hover-courses-390.png', fullPage: true });
  await page.setViewportSize({ width: 1866, height: 938 });
  await page.goto('/');
  await expect(page.locator('tbody').first().getByRole('link').first()).toContainText('Xem lớp');
  const number = page.getByText('Lớp đang mở đăng ký', { exact: true }).locator('..').locator('p').nth(1);
  expect(await number.evaluate(node => getComputedStyle(node).fontSize)).toBe('32px');
});
