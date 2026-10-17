# 02. Kiến trúc mục tiêu

## 1. Mục tiêu kiến trúc

Kiến trúc đích ưu tiên:
- đơn giản để một nhóm nhỏ vận hành;
- giữ Next.js full-stack;
- tách rõ public/admin/auth;
- bảo vệ dữ liệu hồ sơ;
- có SSO nhưng quyền nghiệp vụ vẫn thuộc ứng dụng;
- build/deploy/rollback được bằng Docker;
- không cần thêm Redis/Kafka chỉ để giải quyết bài toán hiện tại.

## 2. Sơ đồ logic

```text
Internet
   |
Nginx / HTTPS / rate limit / security headers
   |
Next.js 16.x
   |-- Public routes
   |    |-- Landing pages
   |    |-- Class pages
   |    |-- Registration wizard
   |    `-- Search (hardened)
   |
   |-- Admin routes
   |    |-- Dashboard
   |    |-- Courses / students
   |    |-- Registrations
   |    |-- Users / settings
   |    `-- Excel / documents
   |
   |-- Auth layer
   |    |-- Local session facade
   |    `-- OIDC client -> Authentik SSO
   |
   |-- Domain services
   |    |-- admission / capacity
   |    |-- transfer
   |    |-- registration
   |    |-- authorization
   |    |-- payment/certificate
   |    |-- email outbox
   |    `-- upload access
   |
   |-- Prisma 7 + pg adapter
   `-- Private file storage

PostgreSQL
Authentik SSO
SMTP
```

## 3. Route groups đề xuất

```text
src/app/
  (public)/
    hocsocapcuu/
    dao-tao/[slug]/
    lop/[classId]/
    register/[classId]/
    search/
  (auth)/
    login/
  (admin)/
    page.tsx
    courses/
    registrations/
    course-links/
    users/
    settings/
  api/
    auth/
    sso/
    upload/
    files/
    search/
```

Route group chỉ để tổ chức layout/code, không dùng như lớp bảo mật.

## 4. Cấu trúc module đề xuất

```text
src/
  components/
    ui/                 # shadcn generated/customized
    admin/
    public/
    forms/
    data-table/
  lib/
    auth/
      index.ts          # facade duy nhất cho mã nghiệp vụ
      local-session.ts
      oidc.ts
      authorization.ts
      audit.ts
      logout.ts
    security/
      rate-limit.ts
      csrf.ts
      headers.ts
      file-validation.ts
      redact.ts
    domain/
      admissions.ts
      transfers.ts
      registrations.ts
      payments.ts
      certificates.ts
    data/
      courses.ts
      registrations.ts
      dashboard.ts
    email/
      outbox.ts
      templates/
      worker.ts
    upload/
      storage.ts
      access.ts
    prisma.ts
  app/actions/
  types/
```

## 5. Server/Client boundary

Mặc định dùng Server Components. Chỉ dùng Client Component khi có:
- tương tác bảng lọc/sort/selection;
- form cần state phức tạp;
- dialog/drawer;
- chart;
- animation;
- camera/QR trong tương lai.

Không đặt cả page thành `"use client"` chỉ vì một button cần click.

## 6. Data Access Layer

Tạo hàm truy cập dữ liệu theo use case thay vì gọi Prisma rải khắp component.

Ví dụ:
```text
getPublicProgram(slug)
getOpenClassesForProgram(courseType)
getAdminCourseList(principal, filters)
getClassRoster(principal, classId, filters)
getRegistrationForReview(principal, registrationId)
```

Mỗi hàm:
1. nhận `principal` khi dữ liệu riêng tư;
2. kiểm tra scope;
3. `select` đúng trường cần dùng;
4. không trả CCCD/file URL nếu UI không cần;
5. có pagination khi danh sách tăng.

## 7. Domain service

Các quy tắc quan trọng phải nằm ngoài component và route:
- giữ chỗ;
- đếm sĩ số;
- chuyển lớp;
- duyệt/từ chối;
- cập nhật thanh toán;
- quyền import/export.

Điều này giúp UI shadcn có thể thay đổi mà không thay nghiệp vụ.

## 8. Upload/storage

Không lưu đường dẫn public trực tiếp của hồ sơ riêng tư.

Đề xuất:
```text
/srv/ttcc-training/uploads/
  yyyy/mm/
    <uuid>.<safe-ext>
```

DB lưu:
```text
StoredFile
- id
- ownerType / ownerId
- kind
- originalName
- storageKey
- mimeType
- size
- sha256
- scanStatus
- createdAt
```

Tải file qua:
```text
GET /api/files/[fileId]
```
Server kiểm tra quyền rồi stream file với `Content-Disposition` phù hợp.

## 9. Email

```text
Transaction nghiệp vụ
   -> EmailOutbox(PENDING)
Worker định kỳ
   -> SMTP
   -> SENT / RETRY / FAILED
```

Request người dùng không phải chờ SMTP.

## 10. SSO

SSO chỉ cung cấp danh tính và trạng thái truy cập. Ứng dụng vẫn giữ:
- User nghiệp vụ;
- vai trò;
- phạm vi lớp được giao;
- audit;
- AppSession.

Liên kết danh tính bằng `(issuer, subject)`, không bằng email thuần.

## 11. Public cache vs private data

Có thể cache:
- nội dung giới thiệu chương trình;
- ảnh marketing;
- FAQ;
- metadata không nhạy cảm.

Không cache công khai:
- dashboard;
- danh sách học viên;
- hồ sơ;
- thanh toán;
- file;
- quyền;
- session;
- kết quả search cá nhân.

Sĩ số public có thể hiển thị cache ngắn/refresh định kỳ, nhưng server luôn quyết định khi ghi nhận chỗ.


## Điều chỉnh dữ liệu học viên —17/10/2026 (ADR-019)
Student là hồ sơ định danh/liên hệ dùng chung. Registration là từng lần đăng ký với snapshot, lớp, thanh toán, chứng từ, event và file hiện có. Quan hệ Student 1–n Registration, CCCD hợp lệ unique tại Student; invalid legacy IDs giữ riêng để đối chiếu. LookupChallenge và SEARCH_OTP outbox gắn Student. Profile contact không bị public signup/Excel tự ghi đè; admin xác nhận thay đổi và thu hồi OTP. Không dùng một Registration làm đại diện tùy tiện cho email toàn bộ lịch sử.
