# Phase02g handoff — 17/10/2026

Completed user follow-up: hover rows had mismatched action fill; icon/ghost buttons looked inert; management fonts too small. No branch/commit/deploy/schema/dependency/domain changes. Preserve all previous uncommitted phases.

Shared TableRow bg-card,has-[td] hover/focus-within bg-accent; TableCell bg-inherit gives continuous opaque color in sticky action column. Removed DataTable action-specific bg-card; all headings bg-muted. DataTable wraps action rendering in ml-auto w-max min-w-max to reserve full flex group intrinsic width; otherwise enlarged buttons overflow into capacity column. StudentDirectory action heading w44; ClassList status filter w48. Tests assert button geometry within cells, not just row hover bounds.

Button variants action blue50/borderblue200/stronger hover and danger-outline rose; desktoprow40/mobile44. Explicit admin ghost operations now action, deletes danger-outline. Icon title defaults aria-label; cursor-pointer. Dashboard bare ArrowUpRight class links replaced by blue bordered Xem lớp buttons; header Thao tác visible. Outline buttons have stronger slate border/surface in admin scope.

Typography CSS only .admin-shell and body:has(.admin-shell) .ui-overlay: text-sm16px/base17/lg20/xl24/2xl32;support14 via --ui-caption-size. Replace prior explicit13 admin/shared badge/table captions with text-[length:var(--ui-caption-size,0.8125rem)] so cn recognizes font size and public fallback13 preserved. Stats32/line36, chart tooltip14. Public registration remains16mobile/14desktop per existing tests. Header64px unchanged.

Build/type/private artifact gate and lint PASS. Full25/25browser PASS1.2m, then final4/4layout PASS12.2s after width fix, final build PASS. Added one regression covering hover continuity/no movement across courses/registrations/users,header fills,button bounds/background/border16px,deletevariant/title,mobile horizontal sticky/opaque/no overflow,dashboardlabeledbuttons/stat32. Prior7root font assertions14badge/16header updated. Reviewed screenshots .local/ui-layout/hover-courses.png and hover-courses-390.png; final desktop capacities unobstructed.

Data checks use .local/verify-students.ts and verify-layout.ts. No actual user session/attendance/history cleanup. Prior SMTP/SSO/device/container gates remain unchanged; no real email sent.
