import { chooseSelect } from "./controls-helper";
import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { compare } from "bcryptjs";
import prisma from "../src/lib/prisma";
import { hashSecret } from "../src/lib/security";
import { storeUpload, bindRegistrationFiles } from "../src/lib/stored-files";
import { removePrivate } from "../src/lib/private-storage";
const run = randomUUID(),
  usernames = [`attendance-new-${run}`];
const userIds: string[] = [],
  classIds: string[] = [],
  fileIds: string[] = [];
const tokens: Record<string, string> = {};
let classId = "",
  outsideId = "",
  sessionId = "",
  outsideSessionId = "",
  registrationId = "",
  pdfRegistrationId = "",
  managerId = "",
  otherId = "";
let png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
  "base64",
);
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
test.beforeAll(async ({ browser }) => {
  const previewPage = await browser.newPage();
  try {
    const synthetic = await previewPage.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 480;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#e6f0ff";
      ctx.fillRect(0, 0, 800, 480);
      ctx.fillStyle = "#143d72";
      ctx.font = "bold 30px sans-serif";
      ctx.fillText("SYNTHETIC TEST DOCUMENT", 40, 60);
      ctx.fillStyle = "#abc3e6";
      ctx.fillRect(40, 100, 210, 280);
      ctx.fillStyle = "#607fa8";
      ctx.beginPath();
      ctx.arc(145, 190, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(74, 258, 142, 100);
      ctx.fillStyle = "#143d72";
      ctx.font = "24px sans-serif";
      ctx.fillText("Synthetic Student", 290, 150);
      ctx.fillText("001234567890", 290, 205);
      ctx.fillText("01 / 01 / 1990", 290, 260);
      ctx.font = "20px sans-serif";
      ctx.fillText("NOT A REAL IDENTITY CARD", 40, 435);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    png = Buffer.from(synthetic, "base64");
  } finally {
    await previewPage.close();
  }

  await mkdir(".local/ui-attendance", { recursive: true });
  for (const role of ["ADMIN", "CLASS_MANAGER", "ACCOUNTANT", "OTHER"]) {
    const user = await prisma.user.create({
      data: {
        username: `attendance-${role}-${run}`,
        passwordHash: "unused",
        role:
          role === "OTHER"
            ? "CLASS_MANAGER"
            : (role as "ADMIN" | "CLASS_MANAGER" | "ACCOUNTANT"),
      },
    });
    userIds.push(user.id);
    if (role === "CLASS_MANAGER") managerId = user.id;
    if (role === "OTHER") otherId = user.id;
    const token = randomUUID() + randomUUID();
    tokens[role] = token;
    await prisma.session.create({
      data: {
        tokenHash: hashSecret(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
  }
  for (const [index, manager] of [managerId, otherId].entries()) {
    const course = await prisma.class.create({
      data: {
        code: `ATT-${index}-${run}`,
        name: "Lớp điểm danh giả lập",
        startTime: "08:00",
        endTime: "12:00",
        managerId: manager,
      },
    });
    classIds.push(course.id);
    if (index === 0) classId = course.id;
    else outsideId = course.id;
    const session = await prisma.classSession.create({
      data: {
        classId: course.id,
        title: "Buổi kiểm thử điểm danh",
        startsAt: new Date("2099-01-01T01:00:00Z"),
        endsAt: new Date("2099-01-01T05:00:00Z"),
        createdById: userIds[0],
      },
    });
    if (index === 0) sessionId = session.id;
    else outsideSessionId = session.id;
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userIds[0] },
  });
  for (const [index, mime] of ["image/png", "application/pdf"].entries()) {
    const file = await storeUpload(
      new File(
        [
          mime === "image/png"
            ? png
            : Buffer.from("%PDF-1.4\nSynthetic PDF\n%%EOF"),
        ],
        mime === "image/png" ? "synthetic.png" : "synthetic.pdf",
        { type: mime },
      ),
      { classId, kind: "ID_PHOTO", actor: user },
    );
    fileIds.push(file.fileId);
    const reg = await prisma.registration.create({
      data: {
        classId,
        fullName:
          index === 0 ? "Học viên camera giả lập" : "Học viên PDF giả lập",
        cccd: index === 0 ? "001234567890" : "001234567891",
        dob: new Date("1990-01-01"),
        phone: "0900000000",
      },
    });
    const patch = await prisma.$transaction((tx) =>
      bindRegistrationFiles(
        tx,
        reg.id,
        classId,
        { idPhotoUrl: file.url },
        { actorId: user.id },
      ),
    );
    await prisma.registration.update({
      where: { id: reg.id },
      data: { ...patch, idPhotoUrl: file.url },
    });
    if (index === 0) registrationId = reg.id;
    else pdfRegistrationId = reg.id;
  }
});
test.afterAll(async () => {
  const created = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });
  userIds.push(...created.map((row) => row.id));
  const sessions = await prisma.classSession.findMany({
    where: { classId: { in: classIds } },
    select: { id: true },
  });
  await prisma.attendance.deleteMany({
    where: { sessionId: { in: sessions.map((row) => row.id) } },
  });
  await prisma.classSession.deleteMany({
    where: { classId: { in: classIds } },
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
      OR: [{ actorId: { in: userIds } }, { resourceId: { in: fileIds } }],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});
test("shadcn accounts: create, assign, prevent orphaned manager, change role/password and lock", async ({
  page,
  request,
}) => {
  await asRole(page);
  await page.goto("/users");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên đăng nhập", { exact: true }).fill(usernames[0]);
  await dialog
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Synthetic-password-123");
  await chooseSelect(
    page,
    dialog.getByLabel("Vai trò", { exact: true }),
    "CLASS_MANAGER",
  );
  const submitted = page.waitForRequest(
    (req) => req.method() === "POST" && Boolean(req.headers()["next-action"]),
  );
  await dialog
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const mutation = await submitted;
  for (const role of ["CLASS_MANAGER", "ACCOUNTANT"]) {
    const denied = await request.post(mutation.url(), {
      headers: {
        Origin: "http://localhost:3101",
        Cookie: `ttcc_session=${tokens[role]}`,
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

  const created = await prisma.user.findUniqueOrThrow({
    where: { username: usernames[0] },
  });
  await page
    .getByRole("button", { name: "Phân công lớp", exact: true })
    .click();
  await page.getByLabel("Tìm kiếm", { exact: true }).fill(`ATT-1-${run}`);
  await chooseSelect(
    page,
    page.getByLabel(`Quản lý ATT-1-${run}`, { exact: true }),
    created.id,
  );
  await expect
    .poll(
      async () =>
        (await prisma.class.findUniqueOrThrow({ where: { id: outsideId } }))
          .managerId,
    )
    .toBe(created.id);
  await page.getByRole("button", { name: "Tài khoản", exact: true }).click();
  await page.getByLabel("Tìm kiếm", { exact: true }).fill(usernames[0]);
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await chooseSelect(
    page,
    dialog.getByLabel("Vai trò", { exact: true }),
    "ACCOUNTANT",
  );
  await dialog
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("phân công");
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("button", { name: "Phân công lớp", exact: true })
    .click();
  await page.getByLabel("Tìm kiếm", { exact: true }).fill(`ATT-1-${run}`);
  await chooseSelect(
    page,
    page.getByLabel(`Quản lý ATT-1-${run}`, { exact: true }),
    otherId,
  );
  await expect
    .poll(
      async () =>
        (await prisma.class.findUniqueOrThrow({ where: { id: outsideId } }))
          .managerId,
    )
    .toBe(otherId);
  await prisma.session.create({
    data: {
      tokenHash: hashSecret(randomUUID()),
      userId: created.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  await page.getByRole("button", { name: "Tài khoản", exact: true }).click();
  await page.getByLabel("Tìm kiếm", { exact: true }).fill(usernames[0]);
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await chooseSelect(
    page,
    dialog.getByLabel("Vai trò", { exact: true }),
    "ACCOUNTANT",
  );
  await dialog
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("New-synthetic-password-123");
  await dialog.getByLabel("Cho phép đăng nhập", { exact: true }).uncheck();
  await dialog
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved = await prisma.user.findUniqueOrThrow({
    where: { id: created.id },
  });
  expect(saved.role).toBe("ACCOUNTANT");
  expect(saved.active).toBe(false);
  expect(await compare("New-synthetic-password-123", saved.passwordHash)).toBe(
    true,
  );
  expect(await prisma.session.count({ where: { userId: created.id } })).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({
    path: ".local/ui-attendance/users-390.png",
    fullPage: true,
  });
});
test("session creation/edit and manual identity review, undo, close/reopen on mobile", async ({
  page,
}) => {
  await asRole(page, "CLASS_MANAGER");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/courses/${classId}/sessions`);
  await page.getByRole("button", { name: "Tạo buổi học", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Tên buổi học", { exact: true })
    .fill("Buổi thực hành giả lập");
  await dialog
    .getByRole("textbox", { name: "Bắt đầu", exact: true })
    .fill("01/02/2099 08:00");
  await dialog
    .getByRole("textbox", { name: "Kết thúc", exact: true })
    .fill("01/02/2099 12:00");
  await dialog.getByLabel("Địa điểm", { exact: true }).fill("Phòng giả lập");
  await dialog
    .getByRole("button", { name: "Lưu buổi học", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const card = page
    .locator("article")
    .filter({ hasText: "Buổi thực hành giả lập" });
  await card.getByRole("button", { name: "Sửa buổi học", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên buổi học", { exact: true })
    .fill("Buổi thực hành đã sửa");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu buổi học", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Buổi thực hành đã sửa", exact: true }),
  ).toBeVisible();
  await page.goto(`/courses/${classId}/sessions/${sessionId}`);
  await page
    .getByLabel("Tìm thủ công theo họ tên, số điện thoại hoặc CCCD", {
      exact: true,
    })
    .fill("camera giả lập");
  await page.getByRole("button", { name: "Tìm học viên", exact: true }).click();
  await page
    .getByRole("button", { name: "Đối chiếu hồ sơ", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("001234567890");
  expect(await prisma.attendance.count({ where: { sessionId } })).toBe(0);
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Xác nhận có mặt", exact: true }),
  ).toBeDisabled();
  const image = page
    .getByRole("dialog")
    .getByAltText("Ảnh căn cước đã đăng ký của học viên");
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận có mặt", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đã ghi nhận có mặt (1)", exact: true }),
  ).toBeVisible();
  expect(
    await prisma.attendance.count({ where: { sessionId, present: true } }),
  ).toBe(1);
  await page.screenshot({
    path: ".local/ui-attendance/attendance-390.png",
    fullPage: true,
  });
  await noOverflow(page);
  await page
    .getByRole("button", { name: "Chốt điểm danh", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mở camera quét CCCD", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mở lại điểm danh", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.getByRole("button", { name: "Hủy ghi nhận", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đã ghi nhận có mặt (0)", exact: true }),
  ).toBeVisible();
});
test("actual QR decoder with synthetic camera frames stops tracks and waits for human confirmation", async ({
  page,
}) => {
  const data =
    "data:image/png;base64," +
    (await readFile("tests/fixtures/synthetic-cccd-qr.png")).toString("base64");
  await page.addInitScript(
    ({ data }) => {
      const state = { stops: 0, requests: 0 };
      Object.assign(window, { __cameraTest: state });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            state.requests++;
            const image = new window.Image();
            image.src = data;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 600;
            canvas.height = 600;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(image, 0, 0, 600, 600);
            const stream = canvas.captureStream(5);
            const draw = setInterval(
              () => ctx.drawImage(image, 0, 0, 600, 600),
              100,
            );
            for (const track of stream.getTracks()) {
              const stop = track.stop.bind(track);
              track.stop = () => {
                clearInterval(draw);
                state.stops++;
                stop();
              };
            }
            return stream;
          },
        },
      });
    },
    { data },
  );
  await asRole(page, "CLASS_MANAGER");
  await page.setViewportSize({ width: 390, height: 844 });
  let actionBody = "";
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"])
      actionBody += request.postData() || "";
  });
  await page.goto(`/courses/${classId}/sessions/${sessionId}`);
  await page
    .getByRole("button", { name: "Mở camera quét CCCD", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Đã đọc số căn cước từ QR",
  );
  await expect(page.getByRole("dialog")).toContainText("001234567890");
  expect(actionBody).not.toContain("Synthetic address");
  expect(actionBody).not.toContain("01011990");
  expect(actionBody).toContain("001234567890");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __cameraTest: { stops: number } }).__cameraTest
          .stops,
    ),
  ).toBeGreaterThan(0);
  expect(
    await prisma.attendance.count({ where: { sessionId, present: true } }),
  ).toBe(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Không khớp / Đóng", exact: true })
    .click();
  expect(
    await prisma.attendance.count({ where: { sessionId, present: true } }),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Mở camera quét CCCD", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.screenshot({
    path: ".local/ui-attendance/identity-review-390.png",
    fullPage: true,
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận có mặt", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đã ghi nhận có mặt (1)", exact: true }),
  ).toBeVisible();
  expect(
    (
      await prisma.attendance.findUniqueOrThrow({
        where: { sessionId_registrationId: { sessionId, registrationId } },
      })
    ).method,
  ).toBe("QR");
});
test("camera permission failure and pending permission cleanup keep manual search usable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    }),
  );
  await asRole(page, "CLASS_MANAGER");
  await page.goto(`/courses/${classId}/sessions/${sessionId}`);
  await page
    .getByRole("button", { name: "Mở camera quét CCCD", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Quét QR căn cước" }).getByRole("alert"),
  ).toContainText("Chưa được cấp quyền camera");
  await page.getByRole("button", { name: "Tắt camera", exact: true }).click();
  await page
    .getByLabel("Tìm thủ công theo họ tên, số điện thoại hoặc CCCD", {
      exact: true,
    })
    .fill("PDF giả lập");
  await page.getByRole("button", { name: "Tìm học viên", exact: true }).click();
  await page
    .getByRole("button", { name: "Đối chiếu hồ sơ", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("PDF");
  await expect(
    page.getByRole("dialog").getByRole("link", {
      name: "Mở tài liệu căn cước đã đăng ký",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const state = {
      stops: 0,
      resolve: null as null | ((value: MediaStream) => void),
    };
    Object.assign(window, { __pendingCamera: state });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () =>
          new Promise<MediaStream>((resolve) => {
            state.resolve = resolve;
          }),
      },
    });
  });
  await page
    .getByRole("button", { name: "Mở camera quét CCCD", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as unknown as { __pendingCamera: { resolve: unknown } })
            .__pendingCamera.resolve,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Tắt camera", exact: true }).click();
  await page.evaluate(() => {
    const state = (
      window as unknown as {
        __pendingCamera: {
          stops: number;
          resolve: (value: MediaStream) => void;
        };
      }
    ).__pendingCamera;
    const canvas = document.createElement("canvas");
    const stream = canvas.captureStream();
    for (const track of stream.getTracks()) {
      const stop = track.stop.bind(track);
      track.stop = () => {
        state.stops++;
        stop();
      };
    }
    state.resolve(stream);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __pendingCamera: { stops: number } })
            .__pendingCamera.stops,
      ),
    )
    .toBeGreaterThan(0);
});
test("preview and attendance routes enforce roles, class scope, no-store and camera policy", async ({
  page,
  request,
}) => {
  const url = `/api/attendance/${sessionId}/identity/${registrationId}`;
  for (const role of ["ADMIN", "CLASS_MANAGER"]) {
    const response = await request.get(url, {
      headers: { Cookie: `ttcc_session=${tokens[role]}` },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["content-disposition"]).toContain("inline");
    expect(await response.body()).toEqual(png);
  }
  for (const role of ["ACCOUNTANT", "OTHER"]) {
    expect(
      (
        await request.get(url, {
          headers: { Cookie: `ttcc_session=${tokens[role]}` },
        })
      ).status(),
    ).toBe(404);
  }
  expect((await request.get(url)).status()).toBe(404);
  expect(
    (
      await request.get(
        `/api/attendance/${sessionId}/identity/${pdfRegistrationId}`,
        { headers: { Cookie: `ttcc_session=${tokens.ADMIN}` } },
      )
    ).status(),
  ).toBe(404);
  await asRole(page, "CLASS_MANAGER");
  let response = await page.goto(`/courses/${classId}/sessions/${sessionId}`);
  expect(response!.headers()["permissions-policy"]).toContain("camera=(self)");
  response = await page.goto(
    `/courses/${classId}/sessions/${outsideSessionId}`,
  );
  expect(response!.status()).toBe(404);
  response = await page.goto(
    `/courses/${outsideId}/sessions/${outsideSessionId}`,
  );
  expect(response!.status()).toBe(404);
  await asRole(page, "ACCOUNTANT");
  await page.goto(`/courses/${classId}/sessions/${sessionId}`);
  await expect(page).toHaveURL("/registrations");
  await page.goto(`/courses/${classId}`);
  await expect(
    page.getByRole("link", { name: "Buổi học và điểm danh", exact: true }),
  ).toHaveCount(0);
  response = await page.goto("/users");
  await expect(page).toHaveURL("/registrations");
  expect(response!.headers()["permissions-policy"]).toContain("camera=()");
});

test("server action replay cannot bypass attendance role or assigned class", async ({
  page,
  request,
}) => {
  await asRole(page, "CLASS_MANAGER");
  await page.goto(`/courses/${classId}/sessions/${sessionId}`);
  await page
    .getByLabel("Tìm thủ công theo họ tên, số điện thoại hoặc CCCD", {
      exact: true,
    })
    .fill("camera giả lập");
  await page.getByRole("button", { name: "Tìm học viên", exact: true }).click();
  await page
    .getByRole("button", { name: "Đối chiếu hồ sơ", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  const submitted = page.waitForRequest(
    (req) => req.method() === "POST" && Boolean(req.headers()["next-action"]),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận có mặt", exact: true })
    .click();
  const mutation = await submitted;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const count = await prisma.auditLog.count({
    where: { actorId: { in: userIds }, action: "ATTENDANCE_CONFIRM" },
  });
  for (const role of ["ACCOUNTANT", "OTHER"]) {
    const denied = await request.post(mutation.url(), {
      headers: {
        Origin: "http://localhost:3101",
        Cookie: `ttcc_session=${tokens[role]}`,
        "Next-Action": mutation.headers()["next-action"],
        "Content-Type": mutation.headers()["content-type"],
        Accept: "text/x-component",
      },
      data: mutation.postDataBuffer()!,
    });
    expect(await denied.text()).toContain(
      role === "ACCOUNTANT"
        ? "Bạn không có quyền thực hiện thao tác này."
        : "Không tìm thấy lớp trong phạm vi quản lý.",
    );
  }
  expect(
    await prisma.auditLog.count({
      where: { actorId: { in: userIds }, action: "ATTENDANCE_CONFIRM" },
    }),
  ).toBe(count);
});
