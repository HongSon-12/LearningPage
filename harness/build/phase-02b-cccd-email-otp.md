# Phase 02b — CCCD → email OTP → learning history

## User correction (17/10/2026)
Replace registration-ID/email link lookup with CCCD input, send an email verification code, enter that code, then show learning history. This supersedes ADR016's link UX. Email remains optional at registration; no public history without email verification.

## Safety and scope
Use one random six-digit code,10-minute validity, max 5 failed attempts, one-use, persisted rate limits and resend cooldown. HMAC the code with a runtime secret and challenge ID; no raw codes/CCCD in URLs, logs or outbox payloads. Only worker memory/email contains the code. Challenge ID alone gives no history. Recheck identity/email consistency before sending and redemption. Do not change seat/payment/approval rules or private-file security.

The user resolved the repeated-email question by requesting a canonical student profile. The profile has one lookup email. Conflicting legacy contacts are flagged for staff review. New registration snapshots do not overwrite it; unconfirmed/conflicting registration snapshots are excluded from public results and totals until reviewed.

## Implementation
Add LookupChallenge + optional outbox relation, change worker type to SEARCH_OTP, retire old link jobs/tokens with an additive migration. Normalize valid 12-digit CCCDs (format separators only) on write and existing data; indexed CCCD lookup. Transactionally supersede prior challenges, lease/retry emails and atomically count attempts/consume codes. History returns only approved public fields across matching records, no attachments/CCCD/contact/admin details. UI is a two-stage form with resend/change CCCD and history cards.

## Validation / rollback
Isolated-schema domain/security tests: generic replies, wrong/expired/replayed codes, concurrent attempts, retry rotation, email conflicts/changes, scoped history and no code persistence. Production artifact/browser tests: CCCD request -> code entry -> multiple history records, no email/ID input, mobile, old link inactive. Back up local DB before additive migration; retain prior schema/table data and previous file backups. No real email, no container deployment.

## Status
Implemented and migrated locally; verification results in build-log. Actual SMTP delivery and container rollout remain external gates.

## Primary references
https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
https://pages.nist.gov/800-63-4/sp800-63b.html
Installed Next16.3 data-security/forms/server-actions guides. This is email ownership verification for lookup, not a claim of NIST authenticator assurance or formal identity proofing.

## User refinement — canonical student profile
User proposed a single student dossier instead of reconciling per-registration emails. Implement Student as the canonical identity/contact with many Registration snapshots. Valid CCCD is unique on Student. Public registration links an existing profile without overwriting its verified lookup destination; conflicting snapshot info is marked for staff review. Backfill groups valid CCCDs, leaves invalid IDs unmerged, and only chooses email automatically if all grouped records agree and none are missing. Admin-only confirmation edits canonical contact/CCCD, with audit and challenge revocation. Scoped staff pages show profile/history; class managers cannot edit the global profile or see other classes' registrations.

## Final implementation rules
Student has a unique valid CCCD (nullable for invalid legacy IDs), canonical name/DOB/phone/email and review state. Registration links Student and retains its intake snapshot, class, payment/certificate/status/events and private files. Same person can register in many classes; seat/duplicate rules remain, now also checking studentId to prevent legacy CCCD snapshot mismatches bypassing duplicate protection.

Admin confirms canonical profile/contact and linked registrations in `/students/[studentId]`, with audit, revoked old challenges and cancelled queued codes. Managers cannot change shared identity and see only assigned-class history; accountants see masked CCCD. Excel edits registration snapshots and cannot change a confirmed canonical CCCD. Manual merge/split of incorrectly assigned historical IDs is not automated.

Local backup before migration: `.local/backups/security-2026-10-17T07-28-11-339Z-f20d483b/`, restored successfully in a temporary DB (8 records/3 prior migrations). Additive `20261017000100_cccd_email_otp` applied. Old link tokens/jobs revoked; no real email sent. Runtime LOOKUP_OTP_SECRET generated only in ignored,0600 local .env; deployment must supply a separate32-byte hex secret. No new dependency.
