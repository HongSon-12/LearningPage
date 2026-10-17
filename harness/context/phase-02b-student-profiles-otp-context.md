# Student profiles and CCCD/email OTP context —17/10/2026

## User changes
1. Lookup should start with CCCD, email a code, require code entry, then show learning history.
2. User proposed a single student dossier when asked how to handle several emails for one CCCD. This supersedes registration-ID + email-link UX and resolves the identity/contact model.

## Data model / migration
Student is canonical identity/contact: id, unique normalized valid 12-digit CCCD (nullable for invalid legacy), name, DOB, phone, email, needsReview. Registration.studentId + profileReviewRequired retain separate intake snapshots, class/payment/certificate/events/files. Migration links every existing registration; matching valid CCCDs group once, invalid IDs stay separate. Consistent nonempty emails select one canonical email; conflicting/missing emails or name/DOB conflicts flag review and disable public lookup. No registration/file deleted. SQL migration transactional and rehearsed with populated synthetic legacy data, including formatted/leading-zero IDs and old-token revocation.

New registration creates/links a profile and never overwrites an existing profile/email. Differences including missing/alternate email mark that registration for review. Such rows are excluded from public history AND public totals until staff confirms them. This prevents someone who self-reported a CCCD/alternate email from seeing unverified associated histories. Duplicate checks include studentId as well as CCCD. Transfers keep studentId. Excel keeps per-registration snapshots and cannot change an established canonical CCCD; administrative dossier is the explicit identity-edit path.

## Public flow
CCCD -> generic request response + opaque challenge ID -> email six-digit code -> explicit submit -> initials and allowed course/status/certificate/invoice history. No email/registration-ID input, no URL token, no raw identity/code in URL/log/outbox, no history before verification. HMAC-SHA256 with a 32-byte runtime secret and challenge context protects short codes at rest. 10-minute expiry, 5 failed attempts, one-use and transactional per-student locks; request rate/cooldown applies equally to unknown IDs. Resend revokes prior challenges/jobs. Profile changes revoke codes; worker checks recipient/identity binding. Query capped 100 most recent authorized rows, total filtered identically; UI states cap and asks staff if history is missing. Refresh clears verified browser view. Email remains optional on signup; unresolved/no-email dossiers require staff.

## Staff UI
`/students`: paginated 20 records, role/class scope. `/students/[studentId]`: canonical identity and scoped learning registrations. Admin-only form confirms identity,email and linked records, audits profile ID/actor without PII values, cancels outstanding codes. Managers see only their assigned history, cannot mutate canonical contact; accountants see masked CCCD. Direct replay of admin Server Action as manager/accountant is denied. Broad merge/split of misassigned historic identities is deliberately not automated.

## Email/ops
SEARCH_OTP replaces SEARCH_LINK in the existing leased worker. Only worker memory/email contains plaintext code; retry rotates code and clears failed sends, keeps attempt cap. Existing business email triggers remain for phase 3. `LOOKUP_OTP_SECRET` is64 hex characters, injected at runtime; local generated secret resides only in ignored .env with0600 permissions. Rotation invalidates pending codes and does not alter student records. No actual SMTP email, automatic scheduler installation or Docker rollout performed.

## Local recovery evidence
Backup `.local/backups/security-2026-10-17T07-28-11-339Z-f20d483b/` preserves 8 pre-change registrations and 3 prior migrations; restored in temporary DB and dropped afterward. System pg17/server16 compatibility handling unchanged from prior context. Migration deployed locally; prior private-file copies/quarantine and original backups remain. Keep additive schema/profile links on rollback and disable lookup rather than restoring single-identifier access or old link credentials.

## Verification
Lint/types/build/private-artifact gate; management integration; security integration for OTP expiry, 5 concurrent failures, one-use race, recipient changes, snapshot suppression, unchanged canonical contacts, duplicate-ID guard; populated student migration rehearsal. Browser suite9 groups (prior5 +4 security/profile flows); focused rerun includes direct mutation-denial replay and public signup without email. HTTP smoke checks existing/admin/student routes. Screenshots synthetic and ignored. No claim of NIST assurance, formal identity proofing, full UAT or production readiness.

## Final local inventory
8 original registrations remain,8 Student profiles,0 unlinked registrations,0 orphan profiles or synthetic class/schema leftovers.7 legacy profiles need CCCD/email review.4 private files still match recorded SHA256. These flags intentionally prevent unverified history access; no identity/contact values were invented.

Visual QA: `.local/ui-phase2/otp-history-390.png`, `student-profile-1440.png`, `student-profile-390.png`; synthetic fixtures only. OTP/mobile history and desktop dossier visually inspected; mobile width check passed. Actual SMTP/provider delivery, scheduler and container rollout still pending.
