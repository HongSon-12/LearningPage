# LearningPage

Project files are located directly in the `Learning` repository root. Run the commands below from that directory.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Application routes

On the current development server (`http://localhost:3001`):

- `/` opens Hệ thống Quản trị (authentication required); `/login` is the sign-in page.
- `/hocsocapcuu` is the public first-aid landing page.
- `/hocsocapcuu/courses`, `/register/[classId]`, and `/search` are the public schedule, registration, and lookup pages.
- `/login` is the admin login page.
- `/fb`, `/zalo`, and `/page` redirect to `/hocsocapcuu` with their respective `source` tracking parameter.

These paths also apply when running the application on another port or domain.

## Student management setup

Run `pnpm exec prisma migrate deploy` and `pnpm exec prisma generate` for the new schema. The initial migration is a baseline for existing installations; this workspace's existing schema was verified and marked as applied before the additive upgrade.

Run `pnpm setup:admin` to initialize a missing/placeholder administrator with a strong generated password. Existing real credentials are preserved. Local credentials are saved in `.local/admin-access.txt`, which is excluded from Git. After logging in, use `/users` to create class-manager/accountant accounts and assign classes.

Use `/registrations` for manual/late registration, transfers, rejection reasons, GCN/GXN tracking and Excel import/export. Transfers require matching program and tuition, available seats and no issued documents. Rejected/cancelled registrations do not occupy seats; restoring them checks capacity again. Unpaid reservations do not expire automatically.

Program landing pages use `/dao-tao/[slug]`, individual class pages use `/lop/[classId]`, and the existing first-aid landing remains `/hocsocapcuu`.

Validation: `pnpm test:management` uses an isolated database schema; `pnpm test:http` checks the running development server and requires the local admin-access file. Use `NEXT_BUILD_DIR=.next-build pnpm build` for a production build alongside a running dev server.


### Administrative navigation

- `/courses`: class list; **Quản lý học viên** opens `/courses/[classId]` with manual/late registration, transfers, Excel and certificate/payment management according to account permissions.
- `/students`: canonical student dossiers and scoped learning history; admins confirm contact/identity changes.
- `/registrations`: check registration information and attachments, approve or reject with a reason; initially lists pending applications.
- `/course-links`: copy direct, Facebook, Zalo and Fanpage links for the five main training programs.
- `/settings`, `/users`: settings and account management. Old `/admin/...` page URLs redirect to the corresponding new URLs.
- Public schedules now use `/hocsocapcuu/courses` to avoid conflicting with administrative `/courses`.

## UI regression

Với database development, chuẩn bị Chromium một lần bằng `pnpm exec playwright install chromium`. Chạy `NEXT_BUILD_DIR=.next-build pnpm build`, sau đó `pnpm test:ui`.

Bộ test khởi động server riêng ở localhost:3101, tạo tài khoản/lớp/học viên giả và tự dọn các ID của run sau kiểm thử. Không chạy bộ test fixture này với database production. Screenshot/trace được lưu trong `.local/`, ngoài Git. Kết quả và giới hạn nghiệm thu: `harness/build-log.md`.


## Private documents, student dossiers and email OTP

`pnpm test:security` tests private files/OTP. `pnpm test:students` rehearses profile backfill with populated legacy data in an isolated schema. Browser tests now run the standalone production artifact, with static assets copied as in Docker and private uploads kept outside that artifact.

For an **existing** installation, back up and cut over during a maintenance window:

1. `pnpm backup:security` saves the pre-cutover DB and legacy files under a protected `.local/backups/security-...` directory.
2. `pnpm exec tsx scripts/verify-security-backup.ts .local/backups/security-...` restores the archive into a random temporary database for verification (requires create-database permission). Production should use matching-major PostgreSQL tools.
3. `pnpm exec prisma migrate deploy` and `pnpm exec prisma generate` apply additive schema changes.
4. `pnpm migrate:files` validates/inventories only. `pnpm migrate:files --apply --backup /absolute/path/to/.local/backups/security-...` copies/compares hashes, updates file FKs/private URLs and quarantines the old public directory. Keep the backup and rollback manifest protected. Never reopen `/uploads` during rollback.

This workspace completed that local cutover on 17/10/2026. Existing Docker containers have not been rebuilt/reloaded; their old pre-flatten mounts must be corrected during deployment. Persist and transfer private file data alongside the database before using a new volume. Old files were tracked in Git; deleting the current files does not rewrite history or old images.

Runtime configuration:

- `PRIVATE_UPLOAD_DIR`: writable private volume outside `public`; defaults to `.local/uploads` for local use. Include this volume in ongoing operational backups; the cutover backup command above is for legacy migration.
- `APP_ORIGIN`: canonical origin for POST checks, e.g. `http://localhost:3001` locally or the actual HTTPS origin in production. Do not derive links from request Host.
- `TRUST_PROXY=true`: only behind a proxy overwriting `X-Real-IP`, with direct public app access blocked. Otherwise the safe default uses a shared anonymous rate bucket.
- `LOOKUP_OTP_SECRET`: 32 random bytes encoded as 64 hex characters, generated separately per environment and injected at runtime. Local development .env is ignored and protected. Rotating this key invalidates pending lookup codes.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: inject runtime secrets; do not put them in an image or client environment.

`pnpm email:search` processes one leased batch of pending SEARCH_OTP jobs. Configure LOOKUP_OTP_SECRET and SMTP first; schedule the internal command in phase 3/operations. It retries with backoff up to 5 attempts and stores safe error codes and HMACs of codes. No real email has been sent in tests.

Public lookup is now **CCCD → email code → learning history**. A six-digit code is valid 10 minutes, one-use and limited to 5 wrong guesses; resends have a 60-second cooldown. The recipient is the canonical Student profile email. Registration ID and email input/link lookup are superseded. Profiles without a usable confirmed contact require staff review.

Each Student dossier links many Registration snapshots. New signup/import never overwrites canonical email. Conflicting/unknown snapshots do not appear in public history or its totals until staff confirms the profile and its linked records. `/students` is paginated/scoped; managers cannot edit global identity or view other classes' history. Accountants see masked CCCD. Admin confirmation revokes pending codes. Changing an established CCCD goes through the dossier, not Excel; old registration snapshots otherwise stay intact. Invalid legacy IDs are not silently merged; broad manual merge/split is a later data-repair operation.

The local profile migration was backed up and completed on 17/10/2026. Old one-use links and queued link jobs are invalidated. Production rollout and actual SMTP verification remain pending.

Global GA/Meta/Clarity scripts are paused pending route/consent isolation. Build now fails if private files/backups/local secrets enter server traces; generated standalone `.env` copies are stripped, so deployers must inject runtime secrets. Retention, malware scanning, TLS/HSTS/CSP enforcement and actual SMTP verification remain release gates.


## Accounts, sessions and attendance (local implementation)

The application runs Next.js/React; the migrated admin UI uses shadcn/ui + Tailwind, with TanStack Table and RHF/Zod. `/users` now uses that stack for account creation/editing, password resets, active state, the existing three roles and class-manager assignments. Updating an account revokes its sessions. Reassign/unassign classes before disabling or changing the role of their manager. Customizing the two non-admin roles is a future requirement; no custom permission editor is currently exposed.

Open `/courses` → **Buổi học**, create/edit a session, then **Điểm danh**. Admin or the assigned manager can scan a CCCD QR using the phone's rear camera or search by name/phone/CCCD. A matching record shows its registered ID document; staff compare it and explicitly confirm presence. Scanning alone never checks someone in. Undo, close and reopen are audited. Transfers retain attendance in the original session. Unrecorded learners are not automatically marked absent.

Camera requires HTTPS on a phone and browser permission; manual search remains available. QR decoding runs locally and only the 12-digit identifier is sent to the scoped server search. The decoder supports a 12-digit value or the first field of supported pipe-separated card payloads; unknown layouts require manual entry. The authenticated identity preview endpoint serves raster images only, with no-store and no image optimizer; PDFs stay downloads. Physical phone/card acceptance and container rollout remain pending.

`pnpm test:attendance` runs isolated schema/domain checks. `pnpm test:ui` includes account/session/attendance, real QR decoding from synthetic camera frames, permission-denial/late-permission cleanup and direct action replay tests. See `docs/plan_v2/Ho_so_ke_hoach_nang_cap_quan_ly_dao_tao_2026_v2/17_BUOI_HOC_DIEM_DANH.md` and `harness/build/phase-02c-users-attendance.md`.


## Shared select/date/time controls

Visible selects now use `SelectField`/`SelectOption`, with styled scrollable menus, keyboard navigation and mobile wrapping. Use `onValueChange`; for React Hook Form use `ControlledSelectField` instead of register-only native select bindings. Empty values and standard FormData names are preserved.

`DateTimePicker` displays Vietnamese dd/mm/yyyy, HH:mm24-hour and combined date/time, with a localized calendar and month/year selection. Eight numeric digits autoformat as a date for phone keyboards. Date/time popups use the same visual tokens as selects; combined date/time has separate Ngày/Giờ steps within one popup. `ControlledDateTimeField` integrates RHF. Hidden fields keep existing ISO payloads; date-only values do not shift timezone. `ui-overlay` preserves the control accent for portal content without changing public brand colors.

Run `pnpm test:date-time` for parsing/round-trip checks and `pnpm test:ui` for actual dropdown/calendar/form interactions. Final phase02d verification:20/20 browser cases, type/lint/build and HTTP smoke pass. No database migration or container rollout in this phase.


## Admin layout and student directory

The current page title now appears once in the compact top bar; nested pages include a parent link. Admin pages use the available width with16/20px padding rather than nested fixed max-width containers. Page descriptions/actions stay compact below the bar. Use the shared server `PageHeader` wrapper; its client publisher supplies serializable title/parent metadata to `AdminShell`, keyed by pathname.

`/students` supports server-side search, class/review filters and20-row pagination with a compact desktop table and mobile cards. Search stays in server-action POST bodies rather than PII query strings. Accountants receive masked IDs and cannot search the CCCD field. Managers only receive assigned-class profiles/counts/history. Details place profile editing and registration history side by side on wide displays, stacked with quick anchors on phones. Profile confirmation/OTP and admin-only changes remain as before.

`pnpm test:student-directory` exercises scoped search/pagination/review/masking in a temporary schema. The full UI suite now has23 passing scenarios, including layout/title behavior and directory raw-action replay. No schema/dependency migration in this layout phase.


### Nhập lại thông tin khi đăng ký
Nhập CCCD trước, chọn **Dùng thông tin đã đăng ký** và xác thực mã6chữ số gửi đến email trong hồ sơ. Sau xác thực, thông tin cũ được điền để học viên kiểm tra/chỉnh sửa rồi tiếp tục thanh toán. Học viên mới hoặc không nhận được mã chọn **Tự điền thông tin**. Thông tin chỉnh sửa ghi nhận trong lần đăng ký mới, không tự đổi email tra cứu đã đối chiếu. Cần cấu hình SMTP và vận hành worker `pnpm email:search` để gửi mã thật.
