# 15. Bản đồ tài liệu cũ và quy tắc đồng bộ

## 1. Mục đích

Project hiện có nhiều tài liệu được viết ở các thời điểm khác nhau. File này xác định tài liệu nào vẫn là nguồn nghiệp vụ, tài liệu nào đã bị báo cáo tiến độ mới hơn ghi đè một phần, và tài liệu mới nào phải cập nhật khi code thay đổi.

## 2. Mapping

| Tài liệu cũ | Vai trò sau khi có bộ hồ sơ mới | Cách xử lý |
|---|---|---|
| `BAO_CAO_TIEN_DO_DU_AN.md` | Nguồn hiện trạng chính tại 17/10/2026 | Giữ, tạo báo cáo mới theo ngày thay vì sửa lịch sử |
| `Feature_Cap_Nhat_Quan_Ly_Hoc_Vien_Va_Landing_Page.md` | Nguồn nghiệp vụ và lịch sử thay đổi | Giữ; các mục “cần chốt” phải được chuyển thành quyết định khi thống nhất |
| `Feature_Form_Va_Upload.md` | Nguồn flow cũ | Phần `/public/uploads` bị thay thế bởi kế hoạch private storage |
| `Feature_Gui_Email_Tu_Dong.md` | Nguồn use case email | Phần trigger cũ phải đối chiếu với thời điểm ghi nhận Bước 2; triển khai theo outbox mới |
| `Feature_Tra_Cuu.md` | Nguồn mục tiêu tra cứu | Flow query chỉ bằng phone/CCCD phải được harden trước production |
| `admin_ui_spec.md` | Nguồn ý tưởng UI ban đầu | Được thay bằng `03_UI_UX_SHADCN.md` cho thiết kế mới |
| `user_ui_spec.md` | Nguồn UX/landing ban đầu | Giữ concept; implementation mới theo shadcn và performance plan |
| `TICH_HOP_NEXTJS_NEXTAUTH_V4.md` | Dùng cho các app đã có NextAuth v4 | Không áp dụng nguyên xi cho project đào tạo hiện tại |
| `THU_HOI_PHIEN_VA_DANG_XUAT.md` | Nguồn chuyên sâu logout/revoke | Giữ và dùng cho SSO hardening |
| `PHAN_MEM_DANG_XAY_DUNG_VA_UNG_DUNG_KHAC.md` | Quy tắc tích hợp SSO đa ứng dụng | Giữ làm guideline cấp hệ thống |

## 3. Tài liệu mới là nguồn triển khai

- Kiến trúc: `02_KIEN_TRUC_MUC_TIEU.md`.
- UI: `03_UI_UX_SHADCN.md`.
- SSO: `04_SSO_DANH_TINH_PHAN_QUYEN.md`.
- Security: `05_BAO_MAT_VA_BAO_VE_DU_LIEU.md`.
- Performance: `06_HIEU_NANG_CSDL_VA_CACHE.md`.
- Data/Email/Upload/Search: `07_DU_LIEU_EMAIL_UPLOAD_TRA_CUU.md`.
- Test: `08_KIEM_THU_NGHIEM_THU.md`.
- Ops: `09_TRIEN_KHAI_VAN_HANH.md`.
- Roadmap: `10_ROADMAP_BACKLOG.md`.
- Release gate: `11_CHECKLIST_RELEASE.md`.

## 4. Quy tắc cập nhật tài liệu khi code thay đổi

Mỗi PR ảnh hưởng nghiệp vụ phải trả lời:
1. Có thay đổi schema không?
2. Có thay đổi quyền không?
3. Có thay đổi trạng thái/flow không?
4. Có thay đổi dữ liệu trả về public không?
5. Có thay đổi email không?
6. Có thay đổi upload/search không?
7. Có thay đổi SSO/session không?
8. Có test mới không?

Nếu “Có”, cập nhật file tương ứng trong cùng PR.

## 5. Quy tắc báo cáo tiến độ

Không dùng checklist cũ làm bằng chứng hoàn thành. Mỗi lần rà soát tạo báo cáo mới:

```text
Ngày kiểm tra:
Commit/tag:
Môi trường:
DB/migration:
Build:
Test tự động:
Test UI:
Security checks:
Deployment checks:
Thay đổi từ lần trước:
Việc còn lại:
Blocker:
```

Trạng thái “đã viết” không đồng nghĩa “đã nghiệm thu”.
