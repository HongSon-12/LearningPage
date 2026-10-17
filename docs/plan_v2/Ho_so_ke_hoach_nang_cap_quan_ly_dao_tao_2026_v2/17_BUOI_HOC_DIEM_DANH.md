# 17. Buổi học và điểm danh

## Luồng sử dụng

1. Vào `/courses`, chọn **Buổi học** của lớp; hoặc mở lớp rồi chọn **Buổi học và điểm danh**.
2. **Tạo buổi học**: tên, ngày giờ bắt đầu/kết thúc và địa điểm. Giờ hiển thị theo Việt Nam, UTC+7. Có thể sửa lịch; không xóa buổi học hoặc lịch sử điểm danh.
3. Mở **Điểm danh**. Dùng **Mở camera quét CCCD** hoặc tìm thủ công bằng họ tên/số điện thoại/CCCD.
4. QR mở hồ sơ phù hợp trong lớp, hiển thị CCCD, ngày sinh, trạng thái hồ sơ/học phí và ảnh căn cước đã đăng ký. Quét không tự ghi nhận.
5. Quản lý so sánh người học, căn cước gốc và ảnh mặt trước đã đăng ký; tích xác nhận đã đối chiếu rồi **Xác nhận có mặt**. Nếu không khớp, chọn **Không khớp / Đóng**.
6. **Hủy ghi nhận** nếu đã điểm danh nhầm; thao tác vẫn được audit. **Chốt điểm danh** để ngừng ghi nhận/sửa; **Mở lại điểm danh** nếu cần điều chỉnh.

## Phạm vi

- Quản trị: tất cả lớp. Quản lý lớp: chỉ lớp đang được phân công. Kế toán: không có quyền điểm danh/xem ảnh CCCD.
- Chỉ hồ sơ trong danh sách học hiện tại (không bị từ chối, không hủy đăng ký) được xác nhận. Hồ sơ/học phí đang chờ vẫn được tìm, có nhãn rõ ràng. Không thay quy tắc duyệt/học phí để phục vụ điểm danh.
- **Chưa ghi nhận** chưa đồng nghĩa **vắng**. Chưa bổ sung nghỉ phép, đi muộn, số tiết hoặc quy tắc cấp chứng chỉ dựa trên chuyên cần.
- Lịch sử của học viên đã chuyển lớp vẫn ở buổi gốc và có nhãn. Không xác nhận mới tại lớp cũ; quản lý buổi cũ có thể hủy bản ghi sai.
- Hồ sơ cần rà soát có cảnh báo. Nếu QR khớp nhiều hồ sơ hoặc CCCD chung khác CCCD lần đăng ký, cần tìm thủ công và đối chiếu; không tự chọn một người.

## Ảnh và camera

- Biểu mẫu ghi rõ **Ảnh mặt trước CCCD**. Hồ sơ cũ thiếu ảnh có thông báo; quản lý cần kiểm tra căn cước/hồ sơ trực tiếp. PDF mở dưới dạng tải xuống, không giả là ảnh xem trước.
- Ảnh có xác thực/phạm vi theo lớp, không public hoặc lưu qua Next image optimizer. Tài khoản bị khóa/đổi phân công mất quyền đọc theo request kế tiếp.
- Đọc QR trong trình duyệt, không lưu video/khung hình và không gửi payload tên/địa chỉ/ngày sinh trong mã. Chỉ gửi số CCCD để đối chiếu.
- Camera được xin phép khi bấm mở và ưu tiên camera sau. Trên điện thoại phải mở bằng HTTPS và cấp quyền camera; nếu không mở được thì tìm thủ công. Tắt track khi có kết quả/đóng/ẩn tab/rời trang, kể cả kết quả cấp quyền đến trễ.
- Mã hỗ trợ: 12 chữ số, hoặc CCCD là trường đầu trong mã dạng `|` có 7–12 trường. Đây là parser tương thích phạm vi đã thử, không cam kết mọi thế hệ thẻ/VNeID. Định dạng khác tìm thủ công. QR không xác thực được tính thật/giả của giấy tờ.

## Dữ liệu và nghiệm thu

Migration bổ sung `20261017000200_class_attendance`; giữ dữ liệu cũ. Trước khi áp dụng local đã sao lưu và phục hồi kiểm tra vào DB tạm (8 đăng ký, 4 migration cũ). Không reset DB.

Chạy `pnpm test:attendance` cho migration/luật nghiệp vụ trên schema riêng; `pnpm test:ui` có luồng tài khoản, buổi học, xác nhận/hủy/chốt, camera giả lập, decoder thật, ảnh/private HTTP, raw server-action replay và phạm vi quyền. Typecheck/lint/build và hồi quy cũ cũng phải đạt. Test fixture là dữ liệu tổng hợp, không có ảnh CCCD thật.

Nghiệm thu điện thoại thật Android Chrome/iOS Safari, độ chói/ánh sáng/camera sau và nhiều loại thẻ còn cần thực hiện trên môi trường HTTPS. Không khẳng định đã nghiệm thu phần cứng chỉ từ mock MediaStream. Bản container hiện có chưa được triển khai lại; theo quy trình release riêng.
