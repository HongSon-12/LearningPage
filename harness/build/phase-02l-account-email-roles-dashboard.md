# Phase02l — Account recovery and custom roles


## Phase02l — Email tài khoản, vai trò mới và Tổng quan (17/10/2026)
- Bỏ nút Làm mới ở Hồ sơ học viên; giữ nguyên tìm kiếm và bộ lọc.
- Tài khoản có email khôi phục riêng, chuẩn hóa chữ thường và chống trùng. Giữ bố cục3/7, chọn được các vai trò mới. Các chốt tự khóa/hạ quyền, quản trị cuối cùng, lớp đang phân công và thu hồi phiên vẫn giữ nguyên.
- Thêm vai trò có tên riêng theo nền nghiệp vụ Quản lý lớp/Kế toán; quyền dạng ô chọn, kiểm tra phụ thuộc và giới hạn nghiệp vụ ở máy chủ. Nền nghiệp vụ không đổi sau khi tạo; ADMIN bảo vệ. Kiểm tra phiên bản khi lưu, quyền có hiệu lực từ yêu cầu tiếp theo, không lấy quyền cũ từ phiên đăng nhập.
- Mọi tài khoản hoạt động được xem Tổng quan. Thống kê/hồ sơ theo quyền và phạm vi lớp; quản lý chỉ thấy lớp được giao. Tài khoản chưa có quyền nghiệp vụ thấy lời chào/hướng dẫn; thống kê truy cập toàn hệ thống dành cho ADMIN. Dashboard là quyền luôn có trong trình chọn.
- Thêm Quên mật khẩu ở đăng nhập: email → mã6số → mật khẩu mới và xác nhận. Phản hồi chung cho email có/không tồn tại; HMAC domain riêng, mã10phút/một lần, tối đa5lần sai, giới hạn theo email/IP/challenge. Không lưu mã rõ; đổi email/tài khoản hoặc yêu cầu mã mới vô hiệu mã cũ; đổi mật khẩu thu hồi phiên và xóa khóa đăng nhập cũ. Có thư thông báo sau khi đổi, không tự đăng nhập.
- Email dùng outbox có lease, tối đa5lần gửi và lùi thời gian khi lỗi; after thử gửi sau phản hồi, lệnh email:search chạy cả hàng đợi tra cứu và khôi phục. SMTP chưa cấu hình ở môi trường hiện tại: chưa xác minh gửi đến hộp thư thật.
- Migration20261017000400 chỉ bổ sung cột/bảng/index/FK, không xóa hồ sơ hiện có. Đã kiểm thử toàn bộ migrations trên schema cô lập, sao lưu và phục hồi thử trước migrate deploy; không resetDB. Bản sao lưu có8đăng ký/6migration trước thay đổi, schema hiện có7migration.

### Validation
- test:account-access PASS: email duy nhất, vai trò mới/phân công/phạm vi/thu hồi/concurrent version, Tổng quan luôn có, phản hồi khôi phục không lộ tồn tại, hashOTP/hết hạn/một lần/5lần sai/retrySMTP, resetpassword/session/login-lock, chống replay đồng thời, vô hiệu khi đổiemail/khóaTK. Dùng sender giả, không gửi email thật.
- test:rbac PASS trong schema cô lập: quyền cũ, phụ thuộc và chặn quyền ngoài phạm vi vẫn đúng.
- Build thành công, TypeScript và targeted ESLint đạt; private-artifact gate đạt.
- Browser cô lập2/2PASS10.8s: trang/menu/action cũ sau thu hồi; tạo vai trò, email, Tổng quan theo phạm vi, trang reset và đăng xuất phiên. Review ảnh1440/390px, không tràn trang.
- Targeted browser2/2PASS9.3s: tạo/sửaTK/đổi vai trò/password/khóa và tìm/lọc/phân trang Hồ sơ học viên. Không chạy toàn bộsuite.
- Kiểm tra bảo toàn8đăngký/8hồsơ/4hashfile riêng tư,7hồsơcầnđốichiếu,0unlinked/orphan/fixture.

### Rollback / vận hành
Giữ các bảng/cột mới nếu tạm quay UI về phiên bản cũ; không xóa dữ liệu email/vai trò/reset để rollback. Cần cấu hình SMTP thật và chạy worker bền vững để có retry khi tiến trình bị dừng. Không thay đổi file định danh, thông tin thanh toán hoặc các hồ sơ thật.
