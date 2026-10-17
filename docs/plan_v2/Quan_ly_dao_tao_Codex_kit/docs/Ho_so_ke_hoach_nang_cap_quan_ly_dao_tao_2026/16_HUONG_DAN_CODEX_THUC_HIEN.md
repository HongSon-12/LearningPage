# 16. Hướng dẫn Codex thực hiện

## 1. Mục tiêu

Codex dùng bộ hồ sơ như một kế hoạch sống, không phải lệnh viết lại toàn bộ.

Thứ tự:
1. baseline discovery;
2. từng phase;
3. test sau mỗi nhóm;
4. ghi build log;
5. cập nhật tài liệu theo code thật.

## 2. Thứ tự đọc

1. `AGENTS.md`.
2. `PLANS.md`.
3. `START_HERE_CODEX.md`.
4. `00_README.md`.
5. `01_HIEN_TRANG_GAP_ANALYSIS.md`.
6. `10_ROADMAP_BACKLOG.md`.
7. phase tương ứng trong `harness/build/`.
8. tài liệu chuyên môn.
9. code/test thực tế.

## 3. Phase 0 bắt buộc

Read-only discovery:
- structure;
- package/lockfile;
- scripts;
- Node/pnpm;
- Next/React/Prisma;
- Tailwind/shadcn;
- auth/session;
- schema/migrations;
- routes;
- upload/search/email;
- test;
- Docker/Nginx.

Không cài package/migration/refactor trước khi hiểu baseline.

## 4. Dependency

Codex được phép đề xuất thêm package nếu giúp thuận tiện, an toàn hoặc tối ưu hơn.

Phải theo `12_KE_HOACH_DEPENDENCIES.md`, nêu:
- use case;
- lý do;
- compatibility;
- bundle/runtime;
- license;
- rollback;
- tests.

## 5. Guardrails

- Không reset/drop DB thật.
- Không xóa migration cũ.
- Không commit secret.
- Không log PII/token.
- Không public CCCD/bằng cấp/biên lai.
- Không tin role/scope/price từ browser.
- UI hide không thay server authz.
- Không major-upgrade framework cùng phase.
- Không đổi business rule vì refactor.

## 6. shadcn

- discovery trước init;
- giữ custom component có chủ đích;
- shared components trước duplicate;
- TanStack = table state, không business rule;
- RHF/Zod cho form;
- Sonner cho toast;
- server validate lại;
- ưu tiên Server Components khi không cần interaction.

## 7. Verification

Dùng scripts thật. Tối thiểu:
```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Chạy integration/smoke/e2e liên quan.

Nếu environment chặn thì ghi `BLOCKED`, không ghi `PASS`.

## 8. Build log

Mỗi phase ghi:
```text
Date:
Phase:
Base commit:
Discovery:
Changes:
Dependencies:
Migrations:
Tests:
Results:
Security:
Performance:
Open decisions:
Rollback:
Next:
```

## 9. DECIDE

- không tự phát minh;
- giữ hành vi hiện tại nếu an toàn;
- cô lập logic;
- ghi log;
- chờ người dùng/nghiệp vụ chốt.

## 10. Phương án tốt hơn

Codex được phép đề xuất thay đổi kế hoạch nếu có:
- bằng chứng từ code/docs/benchmark;
- trade-off rõ;
- không mất yêu cầu;
- ADR nếu kiến trúc thay đổi.

Kế hoạch là tài liệu sống.
