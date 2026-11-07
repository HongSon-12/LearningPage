# Landing scroll motion


## Phase02m — Khôi phục hiệu ứng cuộn /hocsocapcuu (18/10/2026)
- Hiệu ứng bắt đầu khi nội dung vào vùng nhìn thấy, thay điểm kích hoạt sớm120px ngoài màn hình bằng vùng bên trong (trừ80pxnavbar/48pxđáy, threshold12%).
- Tái sử dụng cấu hình reveal cho13vịtrí; nền animate=hidden và whileInView=visible giúp lặp lại khi rời vùng nhìn rồi cuộn về từ cả hai hướng, cũng cập nhật đúng khi đổi chế độ chuyển động.
- Chế độ thường hiện dần/trượt28px trong0.55s. Reduced Motion hiện dần0.7→1 trong0.18s, không dịch chuyển; giữ dừng tự chạy ảnh theo tùy chọn thiết bị. Không thêm can thiệp wheel hoặc nhảy tự động giữa mục.
- Kiểm thử trước đây đọc opacity của h2 tĩnh, chưa chứng minh khối cha thực sự chuyển động. Thêm đo từng khung hình của wrapper khi wheel xuống/lên ở390/1440px, cho cả hai chế độ; kiểm tra cả opacity và transform.
- Validation: build+TypeScript/private-artifact gate PASS; targeted lint PASS;5/5landing browser tests PASS25.6s, gồm neo trang, khoảng cách/navbar, nativewheel, cảnh báo hydration/reducedmotion, đổi tùy chọn trực tiếp và chuyển động hai chiều. Không chạy các bộ kiểm thử khác, không đổi dữ liệu.
