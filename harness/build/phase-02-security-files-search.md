# Phase 02 — Private files and email lookup

> Search/email identity portions were superseded by the user-requested Student + CCCD/email OTP change. Current source: `harness/context/phase-02b-student-profiles-otp-context.md` and ADR-019. Private-file security remains in effect.

## Goal / scope
Move identity, qualification and receipt documents outside public webroot; enforce role + current class scope on every download; replace identifier-only public lookup; add bounded requests, persistent rate limits and audit. Preserve domain/seat transactions and optional email.

## Decision (human, 17/10/2026)
Public lookup uses registration ID + matching email to request a one-use email link. Token expires in 15 minutes, only its hash is stored, redemption requires an explicit POST. GET/email scanners do not consume it. No email means contact staff, not an alternate single-identifier lookup.

## Design
Additive StoredFile and optional Registration file FK columns, retaining URL columns during transition. Staged files belong to either a random registration capability or authenticated uploader; attachment checks kind, class, owner and exclusive claim in the roster transaction. Download resolves current registration class (including transfers); accountants see receipts only. Storage uses random names, 0700/0600 permissions, no public static paths. Extension/MIME/signature/size and upload count checks, no claim of antivirus scanning.

Minimal SEARCH_LINK EmailOutbox/worker is brought forward from phase3 because the selected lookup requires reliable email delivery. No existing approval/rejection trigger decisions are made. Worker leases and retries, generates token in memory and stores only hash; no token in job payload/log. SMTP tests use a fake sender only. Actual SMTP delivery is an external validation gate.

## Sequence
1. Add schema + SQL migration; rehearse all migrations and domain tests in an isolated schema.
2. Implement storage/claim/download, wire wizard/manual/Excel and CSRF/rate/audit boundaries.
3. Implement request + explicit token redemption and minimal leased email worker.
4. Abuse/concurrency/permission/browser regression and production build.
5. Backup local development DB and all legacy files; inventory and verify hashes; migrate schema and legacy references, quarantine old public files only after verification. Preserve rollback manifest and backup. Never reset the existing DB.
6. Update context/build log and decision records.

## Verification / acceptance
Upload extension/MIME/signature/oversize/origin/traversal cases; unowned and cross-record attachment; manager cross-class/transfer; accountant receipt-only; private cache headers and old paths denied; export audit; email mismatch indistinguishable; token expiry/replay/concurrency; worker retries/lease; lint/types/build/domain/HTTP/UI. Test fixtures synthetic, isolated schemas removed by guarded prefix only.

## Rollback
Keep additive DB columns/tables. Restore legacy URLs from protected manifest and matching DB snapshot if needed, retain private files. A code rollback must continue to block /uploads; restoring public access to sensitive files is not an acceptable rollback. Backups remain outside public and git. Retention and encrypted production backup policy remain release decisions.

## Limits
Production TLS/HSTS, malware scanning integration, retention and real SMTP verification remain release gates. No deployment or real email sending is included. No new dependency required.

## Status
Implementation and local cutover complete; final technical regression recorded in build-log. Production deployment, actual SMTP verification and operational release gates remain.

## Findings resolved
- File references needed exclusive ownership + kind checks on create, receipt updates and Excel updates, not just authorization at download.
- React same-document fragment navigation required a hashchange listener; opening links in an existing search tab now works.
- Runtime filesystem tracing initially captured the project. Fixed annotations/exclusions, removed the generated standalone copy, rebuilt clean, and added a failing build-output gate. No artifact was deployed.
- Next standalone deliberately copies loaded .env files independently of trace rules; build post-check strips generated copies and requires runtime secret injection.
- Backup client17/server16 mismatch handled by restore verifier accepting only the known unsupported session SET;8 original records restored with no data/constraint error. Match major tool versions in operations.

Reference implementation/context: harness/context/phase-02-security-files-search-context.md. Primary guidance consulted: OWASP File Upload, Forgot Password and CSRF Cheat Sheets; installed Next16.3 proxy/route/output documentation; PostgreSQL17 pg_dump compatibility notes.
