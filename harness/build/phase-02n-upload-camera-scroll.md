# Upload camera and scroll-linked motion


## Phase02n — Chụp/tải tài liệu và chuyển động theo cuộn (18/10/2026)
- Ba vị trí CCCD/văn bằng (hoặc bằng lái)/biên lai trong đăng ký dùng DocumentUpload chung. Bấm ô mở hai lựa chọn Chụp ảnh/Tải lên; ghi JPG,JPEG,PNG,WebP,PDF và5MB/file ngay tại ô và hộp chọn. Lỗi hiển thị cạnh trường, không bật alert upload. Giữ kiểm tra bắt buộc của chương trình chuyên môn ở cả form và máy chủ.
- Điện thoại dùng inputcapture rear camera; máy tính có xem trước getUserMedia và chụp JPEG tối đa1920px. Đóng/chụp/unmount ngắt stream; generation guard ngắt stream trả về muộn sau khi đóng. Lỗi/từ chối quyền vẫn cho tải file. Camera thật/nativecapture cần QA thiết bị thực; ca trình duyệt dùng canvasstream giả lập.
- Giữ boundedmultipart/origin/rate/ownership/kind/class-scope/private-download. Dùng sharp0.35.3 sẵn có, khai báo dependency trực tiếp; ảnh mới được giải mã đầy đủ, giới hạn25MP, tự xoay, tạo lại bỏ EXIF/GPS/ICC, kiểm tra5MB sau xử lý và hash nội dung đã chuẩn hóa. Chặn giả MIME/đuôi, ảnhhỏng, doubleextension/path, quábyte/pixel. Không chuyển đổi ảnh cũ. PDF giữ kiểm tra hiện có và tải xuống dạng attachment; chưa có antivirus/CDR chuyên dụng, không tuyên bố quét virus.
- ScrollReveal dùng useScroll/useSpring cho y28→−28 theo vị trí cuộn, cùng fade vào/ra. Do đó khối vẫn chuyển động khi đang còn trong viewport, thay vì chỉ chạy lúc re-enter. ReducedMotion vẫn chỉ fade. Nút Hiệu ứng cuộn dưới hero cho phép bật chuyển động theo lựa chọn rõ ràng của người dùng, ghi nhớ ở localStorage; vẫn chạy trong phiên nếu storage bị chặn.
- Đã xác nhận dev3001 chạy đúng thư mục root và HTTP có nút hiệu ứng mới. Công cụ CUA trên desktop lỗi khởi tạo sandbox nên không đọc được tab hiện tại của người dùng; không đổi thiết lập hệ điều hành/trình duyệt của họ.

### Validation
- Build+TypeScript/private-artifact gate và targeted ESLint PASS.
- tests/upload-images.test.ts PASS: decode/rotation/EXIF+ICC removal,3codec, ảnhhỏng/giả/mismatch/double-extension/path/bytes/pixel limits.
-6landing tests PASS trong lượt9cases: nativewheel/neo/navbar,2hướng390/1440px, giảmchuyểnđộng/cậpnhậttrựctiếp, và continuousscroll trong viewport desktop1440x1100 cùng opt-in lưuqua reload.
-3upload HTTP/browser cases PASS11.5s sau khi thay PNGfixture bị libpng xác nhận hỏng bằng PNG hợp lệ: ownership/private download/sessionrevocation; wizard binds identity+receipt; chooser/types/invalidfile/camera preview/capture/streamstop/permissiondenial/fallbackupload/390+1440px. Không hạ mức kiểm tra file để nhận ảnh mẫu hỏng; chỉ sửa fixture ảnh ở3testfiles.
- Review ảnh hộp chọn và đường fallback camera trên390px. Chỉ chạy các ca liên quan, không chạy toàn bộsuite.
-8đăngký/8studentprofiles và4privatefilehash được bảo toàn;7hồsơ cần đối chiếu giữ nguyên,0unlinked/orphan/fixture.

### Rollback
Chỉ hoàn tác UI/hook/normalization hunks của phase này; không có migration và không thay nội dung file cũ. Giữ các giới hạn/quyền tải file cũ nếu tạm bỏ phần chuẩn hóa ảnh.

References: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html ; https://sharp.pixelplumbing.com/api-output/
