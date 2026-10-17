import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import {
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
async function main() {
  const schema = "ttcc_security_" + randomUUID().replaceAll("-", "");
  const folder = resolve(".local", schema);
  assert.match(schema, /^ttcc_security_[a-f0-9]{32}$/);
  assert(folder.startsWith(resolve(".local") + "/"));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`CREATE SCHEMA "${schema}"`);
  process.env.DATABASE_SCHEMA = schema;
  process.env.LOOKUP_OTP_SECRET = randomBytes(32).toString("hex");
  process.env.PRIVATE_UPLOAD_DIR = folder;
  process.env.APP_ORIGIN = "http://localhost:3101";
  let prisma: typeof import("../src/lib/prisma").default | undefined;
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      for (const dir of (
        await readdir("prisma/migrations", { withFileTypes: true })
      )
        .filter((dir) => dir.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name)))
        await client.query(
          await readFile(`prisma/migrations/${dir.name}/migration.sql`, "utf8"),
        );
    } finally {
      client.release();
    }
    prisma = (await import("../src/lib/prisma")).default;
    const { storeUpload, bindRegistrationFiles, accessibleFile } = await import(
      "../src/lib/stored-files"
    );
    const { inspectFile, readPrivate, storageRoot, MAX_FILE_BYTES } =
      await import("../src/lib/private-storage");
    const { assertOrigin, boundedFormData, hashSecret, rateLimit } =
      await import("../src/lib/security");
    const { reserveOnline, rosterTransaction } = await import(
      "../src/lib/admissions"
    );
    const { transferInTransaction } = await import("../src/lib/transfers");
    const { requestLookup, redeemLookup, redeemRegistrationProfile, lookupMessage } = await import(
      "../src/lib/public-lookup"
    );
    const { runSearchEmailBatch } = await import(
      "../src/lib/search-email-worker"
    );
    const admin = await prisma.user.create({
      data: {
        username: "security-admin",
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const manager = await prisma.user.create({
      data: {
        username: "security-manager",
        passwordHash: "unused",
        role: "CLASS_MANAGER",
      },
    });
    const other = await prisma.user.create({
      data: {
        username: "security-other",
        passwordHash: "unused",
        role: "CLASS_MANAGER",
      },
    });
    const accountant = await prisma.user.create({
      data: {
        username: "security-accounts",
        passwordHash: "unused",
        role: "ACCOUNTANT",
      },
    });
    const course = await prisma.class.create({
      data: {
        code: "SECURITY",
        name: "Synthetic security course",
        startTime: "08:00",
        endTime: "12:00",
        capacity: 40,
        managerId: manager.id,
      },
    });
    const unassigned = await prisma.class.create({
      data: {
        code: "OTHER",
        name: "Other",
        startTime: "08:00",
        endTime: "12:00",
        managerId: other.id,
      },
    });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
      "base64",
    );
    const image = () => new File([png], "synthetic.png", { type: "image/png" });
    const cap = randomUUID() + randomUUID();
    assertOrigin(
      new Request("http://localhost:3101/api/upload", {
        headers: { origin: "http://localhost:3101" },
      }),
    );
    for (const origin of ["https://evil.example", "null", ""])
      assert.throws(() =>
        assertOrigin(
          new Request("http://localhost:3101/api/upload", {
            headers: { origin },
          }),
        ),
      );
    const form = new FormData();
    form.set("file", image());
    assert(
      (
        await boundedFormData(
          new Request("http://localhost/upload", {
            method: "POST",
            body: form,
          }),
        )
      ).get("file") instanceof File,
    );
    await assert.rejects(() =>
      boundedFormData(
        new Request("http://localhost/upload", { method: "POST", body: form }),
        32,
      ),
    );
    const chunks = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(40));
        controller.enqueue(new Uint8Array(40));
        controller.close();
      },
    });
    await assert.rejects(() =>
      boundedFormData(
        new Request("http://localhost/upload", {
          method: "POST",
          headers: { "content-type": "multipart/form-data; boundary=x" },
          body: chunks,
          duplex: "half",
        } as RequestInit),
        50,
      ),
    );
    for (const [name, mime, data] of [
      ["x.php.png", "image/png", png],
      ["../x.png", "image/png", png],
      ["x.html", "text/html", png],
      ["x.pdf", "application/pdf", png],
      ["x.jpg", "image/png", png],
      ["x.png", "image/png", Buffer.from("bad")],
      ["x.png", "image/png", Buffer.alloc(MAX_FILE_BYTES + 1)],
    ] as const)
      assert.throws(() => inspectFile(name, mime, data));
    console.log(
      "PASS origin, bounded multipart/chunked requests, extension/MIME/signature/size checks",
    );
    const upload = await storeUpload(image(), {
      classId: course.id,
      kind: "ID_PHOTO",
      receiptToken: cap,
    });
    const receipt = await storeUpload(image(), {
      classId: course.id,
      kind: "RECEIPT",
      receiptToken: cap,
    });
    assert.equal(await accessibleFile(upload.fileId, null), null);
    assert.equal(await accessibleFile(upload.fileId, admin), null); // Anonymous staged documents are never browsable.
    const input = {
      classId: course.id,
      fullName: "Synthetic Person",
      dob: new Date("1990-01-01"),
      phone: "0900000000",
      cccd: "990000000001",
      email: "synthetic@example.invalid",
      requestKey: randomUUID(),
      receiptToken: cap,
      idPhotoUrl: upload.url,
      paymentReceiptUrl: receipt.url,
    };
    await assert.rejects(() =>
      reserveOnline({ ...input, receiptToken: randomUUID() + randomUUID() }),
    );
    const reg = (await reserveOnline(input)).registration;
    assert.equal(reg.idPhotoFileId, upload.fileId);
    await assert.rejects(() =>
      reserveOnline({
        ...input,
        requestKey: randomUUID(),
        cccd: "synthetic-2",
      }),
    );
    await assert.rejects(() =>
      rosterTransaction((tx) =>
        bindRegistrationFiles(
          tx,
          reg.id,
          reg.classId,
          { degreeUrl: upload.url },
          { receiptTokenHash: hashSecret(cap) },
        ),
      ),
    );
    assert(await accessibleFile(upload.fileId, admin));
    assert(await accessibleFile(upload.fileId, manager));
    assert.equal(await accessibleFile(upload.fileId, other), null);
    assert.equal(await accessibleFile(upload.fileId, accountant), null);
    assert(await accessibleFile(receipt.fileId, accountant));
    const file = await prisma.storedFile.findUniqueOrThrow({
      where: { id: upload.fileId },
    });
    assert.deepEqual(await readPrivate(file.storageKey), png);
    assert.equal((await stat(folder)).mode & 0o777, 0o700);
    assert.equal(
      (await stat(folder + "/" + file.storageKey)).mode & 0o777,
      0o600,
    );
    await assert.rejects(() => readPrivate("../public/uploads/x.png"));
    const alias = randomUUID() + ".png";
    await symlink("/etc/passwd", folder + "/" + alias);
    await assert.rejects(() => readPrivate(alias));
    await rosterTransaction((tx) =>
      transferInTransaction(
        tx,
        admin,
        reg.id,
        unassigned.id,
        "Synthetic scope change",
      ),
    );
    assert.equal(await accessibleFile(upload.fileId, manager), null);
    assert(await accessibleFile(upload.fileId, other));
    await assert.rejects(() =>
      storeUpload(image(), {
        classId: course.id,
        kind: "ID_PHOTO",
        actor: accountant,
      }),
    );
    await assert.rejects(() =>
      storeUpload(image(), {
        classId: course.id,
        kind: "RECEIPT",
        actor: other,
      }),
    );
    const stages = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        storeUpload(image(), {
          classId: course.id,
          kind: "DEGREE",
          receiptToken: cap,
        }),
      ),
    );
    assert.equal(
      stages.filter((result) => result.status === "fulfilled").length,
      6,
    );
    console.log(
      "PASS private storage, exclusive ownership/kind binding, concurrent count limit, role/class/transfer access",
    );
    const rates = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        rateLimit("synthetic", "one-key", 5, 60000),
      ),
    );
    assert.equal(
      rates.filter((result) => result.status === "fulfilled").length,
      5,
    );
    console.log(
      "PASS database rate limit remains atomic across concurrent requests",
    );
    const { codeDigest, otpDigest } = await import("../src/lib/lookup-otp");
    assert(reg.studentId);
    const student = await prisma.student.findUniqueOrThrow({
      where: { id: reg.studentId },
    });
    assert.equal(student.email, input.email);
    assert.equal(student.needsReview, false);
    const second = await reserveOnline({
      ...input,
      requestKey: randomUUID(),
      receiptToken: randomUUID() + randomUUID(),
      idPhotoUrl: undefined,
      paymentReceiptUrl: undefined,
    });
    assert.equal(second.registration.studentId, student.id);
    await prisma.registration.update({
      where: { id: second.registration.id },
      data: { cccd: "legacy-snapshot-mismatch" },
    });
    await assert.rejects(() =>
      reserveOnline({
        ...input,
        idPhotoUrl: undefined,
        paymentReceiptUrl: undefined,
        requestKey: randomUUID(),
        receiptToken: randomUUID() + randomUUID(),
      }),
    );
    const { studentForRegistration } = await import("../src/lib/students");
    await assert.rejects(() =>
      rosterTransaction((tx) =>
        studentForRegistration(
          tx,
          { ...reg, cccd: "990000000097" },
          student.id,
        ),
      ),
    );
    const thirdCourse = await prisma.class.create({
      data: {
        code: "SNAPSHOT",
        name: "Snapshot class",
        startTime: "08:00",
        endTime: "12:00",
      },
    });
    const snapshot = await reserveOnline({
      ...input,
      classId: thirdCourse.id,
      email: "alternate@example.invalid",
      requestKey: randomUUID(),
      receiptToken: randomUUID() + randomUUID(),
      idPhotoUrl: undefined,
      paymentReceiptUrl: undefined,
    });
    assert.equal(snapshot.registration.studentId, student.id);
    assert.equal(snapshot.registration.profileReviewRequired, true);
    assert.equal(
      (await prisma.student.findUniqueOrThrow({ where: { id: student.id } }))
        .email,
      input.email,
    );
    const missingEmailCourse = await prisma.class.create({
      data: {
        code: "NOEMAIL",
        name: "Unconfirmed snapshot",
        startTime: "08:00",
        endTime: "12:00",
      },
    });
    const unconfirmed = await reserveOnline({
      ...input,
      classId: missingEmailCourse.id,
      email: undefined,
      idPhotoUrl: undefined,
      paymentReceiptUrl: undefined,
      requestKey: randomUUID(),
      receiptToken: randomUUID() + randomUUID(),
    });
    assert.equal(unconfirmed.registration.profileReviewRequired, true);
    const unknown = await requestLookup("990000000099", "unknown");
    assert.equal(unknown.message, lookupMessage);
    assert.equal(await prisma.emailOutbox.count(), 0);
    const requested = await requestLookup(input.cccd, "matching");
    assert.equal(requested.message, lookupMessage);
    assert.match(requested.challengeId, /^[a-f0-9-]{36}$/);
    await assert.rejects(() => requestLookup(input.cccd, "resend-too-quick"));
    const sent: string[] = [];
    await Promise.all([
      runSearchEmailBatch(async (_to, _subject, html) => {
        sent.push(html);
      }),
      runSearchEmailBatch(async (_to, _subject, html) => {
        sent.push(html);
      }),
    ]);
    assert.equal(sent.length, 1);
    const code = /<strong>([0-9]{6})<\/strong>/.exec(sent[0])![1];
    const challenge = await prisma.lookupChallenge.findUniqueOrThrow({
      where: { id: requested.challengeId },
    });
    assert.equal(challenge.codeHash, codeDigest(challenge.id, code));
    assert.notEqual(challenge.codeHash, hashSecret(code));
    assert(
      !(await prisma.emailOutbox.findMany()).some((job) =>
        Object.values(job).some((value) => value === code),
      ),
    );
    const wrong = code === "000000" ? "000001" : "000000";
    await assert.rejects(() => redeemLookup(challenge.id, wrong, "wrong-code"));
    assert.equal(
      (
        await prisma.lookupChallenge.findUniqueOrThrow({
          where: { id: challenge.id },
        })
      ).failedAttempts,
      1,
    );
    const attempts = await Promise.allSettled([
      redeemLookup(challenge.id, code, "first"),
      redeemLookup(challenge.id, code, "second"),
    ]);
    assert.equal(
      attempts.filter((value) => value.status === "fulfilled").length,
      1,
    );
    const success = attempts.find((value) => value.status === "fulfilled")!;
    if (success.status === "fulfilled") {
      assert.equal(success.value.fullName, "S. P.");
      assert.equal(success.value.history.length, 2);
      assert.equal(success.value.total, 2);
      assert(
        !success.value.history.some(
          (row) => row.id === snapshot.registration.id,
        ),
      );
      assert(!("cccd" in success.value));
      assert(!("email" in success.value));
      assert(!("phone" in success.value));
      assert(
        success.value.history.every(
          (row) =>
            !("idPhotoUrl" in row) && !("cccd" in row) && !("email" in row),
        ),
      );
    }
    assert.equal(
      (
        await prisma.lookupChallenge.findUniqueOrThrow({
          where: { id: challenge.id },
        })
      ).codeHash,
      null,
    );
    async function manualChallenge(
      code: string,
      expiresAt = new Date(Date.now() + 600000),
    ) {
      const id = randomUUID();
      return prisma!.lookupChallenge.create({
        data: {
          id,
          studentId: student.id,
          identityHash: otpDigest(`identity:${student.cccd}`),
          emailHash: otpDigest(`email:${student.email}`),
          codeHash: codeDigest(id, code),
          expiresAt,
        },
      });
    }
    const prefill = await manualChallenge("123456");
    await assert.rejects(() => redeemRegistrationProfile(prefill.id, "123456", "990000000096", "prefill-other-id"));
    await assert.rejects(() => redeemRegistrationProfile(prefill.id, "999999", student.cccd!, "prefill-wrong-code"));
    await prisma.registration.update({ where: { id: reg.id }, data: { gender: "FEMALE", organization: "Verified organization" } });
    await prisma.registration.update({ where: { id: snapshot.registration.id }, data: { gender: "MALE", organization: "Untrusted organization" } });
    const prefills = await Promise.allSettled([
      redeemRegistrationProfile(prefill.id, "123456", student.cccd!, "prefill-first"),
      redeemRegistrationProfile(prefill.id, "123456", student.cccd!, "prefill-replay"),
    ]);
    assert.equal(prefills.filter(r => r.status === "fulfilled").length, 1);
    const profile = prefills.find(r => r.status === "fulfilled")!;
    assert.equal(profile.status, "fulfilled");
    if (profile.status === "fulfilled") {
      assert.equal(profile.value.fullName, student.fullName);
      assert.equal(profile.value.email, student.email);
      assert.equal(profile.value.cccd, student.cccd);
      assert.equal(profile.value.gender, "FEMALE");
      assert.equal(profile.value.organization, "Verified organization");
      assert.deepEqual(Object.keys(profile.value).sort(), ["fullName", "dob", "cccd", "phone", "email", "gender", "organization", "workplace", "returning"].sort());
    }
    await assert.rejects(() => redeemLookup(prefill.id, "123456", "prefill-used-on-search"));
    const expiredPrefill = await manualChallenge("123456", new Date(Date.now() - 1));
    await assert.rejects(() => redeemRegistrationProfile(expiredPrefill.id, "123456", student.cccd!, "prefill-expired"));
    console.log("PASS registration prefill: OTP required, CCCD bound, minimal DTO, canonical fields, verified snapshots only, concurrent one-use/replay/expiry");
    const expired = await manualChallenge("123456", new Date(Date.now() - 1));
    await assert.rejects(() => redeemLookup(expired.id, "123456", "expired"));
    const locked = await manualChallenge("123456");
    await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        redeemLookup(locked.id, "999999", `guess-${index}`),
      ),
    );
    assert.equal(
      (
        await prisma.lookupChallenge.findUniqueOrThrow({
          where: { id: locked.id },
        })
      ).failedAttempts,
      5,
    );
    await assert.rejects(() => redeemLookup(locked.id, "123456", "locked-out"));
    const changed = await manualChallenge("123456");
    await prisma.student.update({
      where: { id: student.id },
      data: { email: "changed@example.invalid" },
    });
    await assert.rejects(() =>
      redeemLookup(changed.id, "123456", "changed-email"),
    );
    await prisma.student.update({
      where: { id: student.id },
      data: { email: input.email },
    });
    const pending = await prisma.student.create({
      data: {
        cccd: "990000000098",
        fullName: "Needs review",
        dob: new Date("1990-01-01"),
        phone: "0900000000",
        email: "review@example.invalid",
        needsReview: true,
      },
    });
    const before = await prisma.emailOutbox.count();
    const conflict = await requestLookup(pending.cccd!, "needs-review");
    assert.equal(conflict.message, lookupMessage);
    assert.equal(await prisma.emailOutbox.count(), before);
    console.log(
      "PASS canonical student/history, unchanged profile email, generic requests, HMAC OTP, expiry/replay/concurrent attempt cap and email-change invalidation",
    );
    const retryChallenge = await manualChallenge("123456");
    const retry = await prisma.emailOutbox.create({
      data: {
        type: "SEARCH_OTP",
        studentId: student.id,
        challengeId: retryChallenge.id,
        recipient: input.email,
        idempotencyKey: "retry",
      },
    });
    assert.equal(
      (
        await runSearchEmailBatch(async () => {
          throw new Error("synthetic SMTP fault");
        })
      ).failed,
      1,
    );
    const failed = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: retry.id },
    });
    assert.equal(failed.status, "PENDING");
    assert.equal(failed.lastErrorCode, "SEND_FAILED");
    assert.equal(
      (
        await prisma.lookupChallenge.findUniqueOrThrow({
          where: { id: retryChallenge.id },
        })
      ).codeHash,
      null,
    );
    await prisma.emailOutbox.update({
      where: { id: retry.id },
      data: { nextAttemptAt: new Date(0), attemptCount: 4 },
    });
    await runSearchEmailBatch(async () => {
      throw new Error("synthetic SMTP fault");
    });
    assert.equal(
      (await prisma.emailOutbox.findUniqueOrThrow({ where: { id: retry.id } }))
        .status,
      "FAILED",
    );
    const root = process.env.PRIVATE_UPLOAD_DIR;
    process.env.PRIVATE_UPLOAD_DIR = resolve("public", "synthetic-storage");
    await assert.rejects(storageRoot);
    process.env.PRIVATE_UPLOAD_DIR = root;
    console.log(
      "PASS SMTP retry/backoff/failure state without secret payloads; public storage configuration denied",
    );
    const sandbox = resolve(folder, "legacy-sandbox");
    const backup = resolve(sandbox, ".local/backups/rehearsal");
    await mkdir(backup, { recursive: true });
    await mkdir(resolve(sandbox, "public/uploads"), { recursive: true });
    const legacyName = randomUUID() + ".png";
    await writeFile(resolve(sandbox, "public/uploads", legacyName), png);
    await writeFile(
      resolve(backup, "database.dump"),
      "synthetic backup fixture",
    );
    await writeFile(
      resolve(backup, "manifest.json"),
      JSON.stringify({
        files: [
          { name: legacyName, sha256: hashSecret(png.toString("binary")) },
        ],
      }),
    );
    const { createHash } = await import("node:crypto");
    await writeFile(
      resolve(backup, "manifest.json"),
      JSON.stringify({
        files: [
          {
            name: legacyName,
            sha256: createHash("sha256").update(png).digest("hex"),
          },
        ],
      }),
    );
    await prisma.registration.update({
      where: { id: reg.id },
      data: { degreeUrl: `/uploads/${legacyName}` },
    });
    const previousCwd = process.cwd();
    process.chdir(sandbox);
    try {
      const { migrateLegacyFiles } = await import("../src/lib/legacy-files");
      assert.equal((await migrateLegacyFiles()).references, 1);
      assert.equal(
        (await migrateLegacyFiles({ apply: true, backupFolder: backup }))
          .applied,
        true,
      );
      const migrated = await prisma.registration.findUniqueOrThrow({
        where: { id: reg.id },
      });
      assert(migrated.degreeFileId);
      assert.equal(migrated.degreeUrl, `/api/files/${migrated.degreeFileId}`);
      assert(await accessibleFile(migrated.degreeFileId, other));
      assert.equal(
        (
          await readFile(resolve(backup, "legacy-rollback.json"), "utf8")
        ).includes(legacyName),
        true,
      );
      await assert.rejects(() => stat(resolve(sandbox, "public/uploads")));
      assert.deepEqual(
        await readFile(
          resolve(backup, "public-uploads-quarantine", legacyName),
        ),
        png,
      );
      assert.equal((await migrateLegacyFiles()).references, 0);
    } finally {
      process.chdir(previousCwd);
    }
    console.log(
      "PASS legacy cutover rehearsal: hash-verified copy, FK/URL update, protected rollback manifest and quarantine",
    );
  } finally {
    await prisma?.$disconnect();
    if (/^ttcc_security_[a-f0-9]{32}$/.test(schema))
      await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
    await rm(folder, { recursive: true, force: true });
    // storageRoot rejected before accepting this test directory; remove only if empty.
    const { rmdir } = await import("node:fs/promises");
    await rmdir("public/synthetic-storage").catch(() => {});
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
