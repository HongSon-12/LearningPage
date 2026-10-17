# Phase 02 context — private documents and one-use email lookup

> Search/email identity portions were superseded by the user-requested Student + CCCD/email OTP change. Current source: `harness/context/phase-02b-student-profiles-otp-context.md` and ADR-019. Private-file security remains in effect.

## Human decision
17/10/2026: user chose “Nhận liên kết tra cứu dùng một lần qua email”. Request requires registration UUID and matching registered email. Email remains optional for registration; users without it contact staff. Other DECIDE items are unchanged.

## Implementation
- Additive migration `20261017000000_private_files_search`: StoredFile, Registration optional unique file FKs, SearchToken, SEARCH_LINK EmailOutbox, RateLimit, AuditLog. URL columns retained as private endpoint references during transition.
- Files outside public: default `.local/uploads`, production PRIVATE_UPLOAD_DIR volume. UUID keys, no original filenames/PII, 0700 directories/0600 files, symlink/path checks, bounded multipart including chunked bodies, PNG/JPEG/WebP/PDF extension/MIME/signature checks, max5MB/file, max6 public staged files (30 staff).
- Anonymous staged files bound by random registration capability; staff by authenticated uploader and class. Claim/kind/class checks and FK updates share the existing roster transaction. Unowned/cross-record/superseded documents cannot download. Current registration class controls access after transfers. Accountants get receipts only, including removal of identity/qualification URLs from their roster/export.
- Download GET requires active session, returns generic404 for denied/missing, no-store/nosniff/sandbox and attachment disposition with generic filename. File and Excel audit. Inline previews replaced by protected downloads.
- `/uploads/*` blocked in Next proxy and Nginx. Origin checks for custom POST; persistent rate counters for login/upload/register/receipt/search/import/export. TRUST_PROXY defaults false (shared unattributed limiter); enable only with a proxy overwriting X-Real-IP and no direct public app port. Compose closes public app port and uses private volume.
- Lookup replaces phone/CCCD/invoice-only search. Uniform request response, bounded attempt rates, pending-job dedupe, hash-only 256-bit tokens,15min expiry, atomic one-use redemption. Fragment link captured/cleared without GET consumption, explicit click, supports fresh load and same-tab hash navigation. Result is an allowlist with initials, class and document/status codes; no identifiers, attachments or internal metadata.
- Minimal phase 3 dependency: leased SEARCH_LINK worker, max5 attempts/backoff, safe error codes, SMTP timeouts, no token in outbox or logs. Retries rotate token; actual SMTP receipt verification and automatic worker scheduling are not done. Existing business email triggers remain for phase 3.
- Global GA/Meta/Clarity loading paused to prevent sensitive link/form data reaching third parties. Setting values preserved. Route/consent isolation and re-enabling await phase 5.
- Runtime file access excluded from build tracing using documented Turbopack annotations. Defense-in-depth trace exclusions plus build check remove standalone .env copies and reject private directories/secrets in traces. Docker context ignores .env/.local/public uploads. Production artifact tested, no generated private data included.

## Actual local cutover
Protected backup `.local/backups/security-2026-10-17T06-52-20-879Z-1366beb7/` contains database.dump, six original file copies + hashes, legacy-rollback.json, quarantined original upload directory. Migration deployed on local ttcc_db/public. Four document references mapped to four private StoredFile records/FKs, byte hashes checked. Two unreferenced files preserved in backup/quarantine. No business records removed.

Backup restored into a random temporary database:8 registrations and2 prior migrations restored. System client pg17 against server16 emits unsupported `SET transaction_timeout=0`; verifier accepts exactly that one session-setting compatibility error and fails all other errors. Temporary restore DB dropped after verification. For operations use matching-major PostgreSQL tools; see https://www.postgresql.org/docs/17/app-pgdump.html.

## Running services
Existing Docker containers were NOT rebuilt/reloaded/deployed. Nginx still mounts the old pre-flatten `ttcc-app/nginx.conf` path. Local source/DB and new tested artifact are updated; do not infer an existing container now serves the security changes. Deployment/cutover remains phase 7 and must restore private volume data and correct mounts first. Keep legacy paths blocked during any rollback.

## Verification
Domain concurrency/Excel tests and security integration use random isolated schemas. Security coverage: CSRF, size/chunk limits, extensions/signatures, path/symlink, exclusive ownership/kind binding, count/rate concurrency, scope/transfer/role, token replay/expiry/minimal result, fake SMTP retries/claim and legacy copy/FK/quarantine rehearsal. HTTP smoke checks public/admin/manager/accountant/disabled users. Browser security covers real upload/download headers/audit, explicit email lookup and optional-email public wizard with identity+receipt files; prior5 UI groups retained. No real email sent.

## Release limits
Actual SMTP, scheduled worker, outbox operational visibility, antivirus integration, retention, TLS/HSTS and CSP violation review/enforcement, business UAT and production rollout remain. Old sensitive files existed in Git: current tree removes them; history/images/other clones were not rewritten. Review access/retention before release rather than assuming current-tree removal erases history.
