# Báo cáo tiến độ dự án quản lý đào tạo TTCC 115

**Ngày rà soát:** 17/10/2026 (Asia/Bangkok).  
**Phạm vi:** mã nguồn `ttcc-app`, tài liệu trong `docs` và các yêu cầu đã trao đổi.  
**Trạng thái tổng thể:** Đã triển khai phần lớn chức năng quản trị và đăng ký; cần hoàn tất nghiệm thu giao diện, xác nhận nghiệp vụ và kiểm tra vận hành. Chưa kết luận sẵn sàng triển khai chính thức.

## 1. Hiện tại đã làm tới đâu?

- **Đã có trong mã:** quản lý lớp/học viên, đăng ký trực tuyến và thủ công/vét, chuyển lớp, duyệt/từ chối, thanh toán, GCN/GXN, hóa đơn, Excel, tài khoản và phân quyền.
- **Đã điều chỉnh giao diện:** tổng quan, chi tiết học viên theo lớp, kiểm tra đăng ký, cài đặt, tài khoản và trang Link khóa học.
- **Đã có đường dẫn công khai:** Landing Page chính, trang chương trình/lớp, lịch khai giảng, đăng ký và tra cứu. Các trang chương trình đang dùng một mẫu chung có nội dung/màu sắc riêng; concept thiết kế hoàn chỉnh cho từng khóa vẫn cần nghiệm thu.
- **Vướng ở lần kiểm tra hiện tại:** PostgreSQL tại `127.0.0.1:5432` không kết nối được, khiến build đầy đủ và kiểm thử nghiệp vụ chưa hoàn tất. Đây là kết quả kiểm tra môi trường, không phải bằng chứng mất dữ liệu hay tính năng đã hỏng.

**Cách đọc trạng thái:** “Đã triển khai” nghĩa là đã có xử lý trong mã nguồn. “Đã kiểm tra trước đây” không đồng nghĩa với đã kiểm tra lại ngày 17/10/2026. Chỉ đánh dấu nghiệm thu khi đã thực hiện tình huống kiểm tra thực tế và xác nhận kết quả.

## 2. Các màn hình và đường dẫn hiện tại

Địa chỉ phát triển mặc định: `http://localhost:3001` khi đã chạy ứng dụng và cơ sở dữ liệu.

| Đường dẫn | Mục đích / phần đã làm |
| --- | --- |
| `/` | Hệ thống Quản trị. Tổng quan lớp mở, hồ sơ chờ duyệt, thanh toán, truy cập nhanh, đăng ký gần đây, lịch lớp và thống kê truy cập. Quản trị xem dashboard; vai trò khác được chuyển sang trang đăng ký. |
| `/login` | Đăng nhập tài khoản quản trị, quản lý lớp và kế toán. |
| `/courses` | Danh sách lớp; thêm/sửa/xóa theo quyền; nút **Quản lý học viên** mở trang riêng của lớp. |
| `/courses/[classId]` | Sĩ số, hồ sơ chờ duyệt, thanh toán; danh sách học viên, thủ công/vét, Excel. Chi tiết chia thành **Thông tin & hồ sơ / Chuyển lớp / Chứng từ / Lịch sử** theo quyền. |
| `/registrations` | Kiểm tra thông tin và tài liệu đăng ký, duyệt/từ chối kèm lý do. **Quản trị và Kế toán có thể chỉnh Thanh toán ngay trong bảng**; Quản lý lớp chỉ xem thanh toán. Mặc định lọc hồ sơ chờ duyệt. |
| `/course-links` | Chỉ hiển thị **5 khóa học chính**, không liệt kê link từng lớp. Chọn khóa và sao chép link trực tiếp, Facebook, Zalo, Fanpage; có nút mở trang và phản hồi đã sao chép. |
| `/settings` | Thông tin ngân hàng, chủ tài khoản, số tài khoản và cú pháp chuyển khoản; có phần xem trước. Chỉ Quản trị được sửa. |
| `/users` | Tài khoản, vai trò, trạng thái hoạt động; bộ lọc, cửa sổ chỉnh sửa và phần phân công quản lý lớp. Chỉ Quản trị được sử dụng. |
| `/hocsocapcuu` | Landing Page Sơ cấp cứu cộng đồng. |
| `/hocsocapcuu/courses` | Lịch khai giảng công khai; thay đường dẫn `/courses` công khai trước đây. |
| `/dao-tao/[slug]` | Trang giới thiệu theo chương trình đào tạo. |
| `/lop/[classId]` | Trang giới thiệu của một lớp cụ thể. Không đưa link từng lớp vào trang quản trị `/course-links`. |
| `/register/[classId]` | Đăng ký nhiều bước và thông tin thanh toán theo lớp. |
| `/search` | Tra cứu thông tin/chứng từ theo xử lý hiện có. |
| `/admin`, `/admin/...` | Đường dẫn cũ tự chuyển sang đường dẫn mới bỏ tiền tố `/admin`. |
| `/fb`, `/zalo`, `/page` | Chuyển đến `/hocsocapcuu` kèm tham số nguồn tương ứng. |

## 3. Đối chiếu các tính năng đã yêu cầu

| Yêu cầu | Tiến độ triển khai | Ràng buộc / phần còn lại |
| --- | --- | --- |
| Chuyển học viên giữa các lớp | Đã triển khai | Cùng chương trình, cùng học phí, lớp đích đang nhận đăng ký, còn chỗ và trong phạm vi được giao. Không chuyển hồ sơ bị từ chối/đã hủy, đã có hóa đơn/GCN/GXN hoặc lớp cũ đã kết thúc. Giữ trạng thái và lưu lịch sử. |
| Đăng ký thủ công/vét | Đã triển khai trong trang học viên của lớp | Dùng thông tin và hồ sơ theo chương trình. Vét được qua hạn đăng ký khi lớp vẫn OPEN và còn chỗ; không cho vượt sĩ số. |
| Quản lý học viên theo khóa/lớp | Đã triển khai | Tìm theo họ tên, điện thoại, CCCD, mã hồ sơ; bộ lọc chương trình/khóa/lớp và trạng thái hồ sơ. Chưa có bộ lọc riêng đầy đủ cho mọi tiêu chí được đề xuất như hình thức đăng ký hoặc trạng thái gửi GCN. |
| Lớp/khóa liên quan trên Landing Page | Đã có xử lý và giao diện | Lấy lớp OPEN có lịch phù hợp, tránh lặp lớp đang xem. Chưa có trạng thái “sắp mở” riêng hoặc giao diện chọn thủ công lớp liên quan. |
| Quản lý lớp và Kế toán | Đã triển khai | Phân quyền cả giao diện và máy chủ; Quản lý lớp bị giới hạn theo lớp được giao. |
| Concept riêng từng Landing Page | Triển khai một phần | Đã có route, nội dung và màu sắc theo chương trình; các trang mới dùng chung `ProgramLanding`. Chưa xác nhận thiết kế/nội dung cuối cùng của từng khóa. |
| Ghi nhận chỗ khi sang Bước 3 | Đã triển khai | Kiểm tra và lưu hồ sơ trước khi mở bước thanh toán; các luồng ảnh hưởng sĩ số dùng chung giao dịch/khóa. Gửi lại yêu cầu không tạo trùng. |
| Lý do từ chối | Đã triển khai | Bắt buộc khi từ chối, lưu trong hồ sơ/lịch sử. Chưa tự động gửi lý do này qua email. |
| Import/Export Excel và trường mới | Đã triển khai | `.xlsx`, tối đa 500 dòng/5 MB; có mẫu, kiểm tra trước khi lưu; file lỗi không được lưu một phần. Nhập tại trang lớp phải khớp lớp đó. |

### Các trường hậu kỳ đã có

- [x] Đã gửi GCN trực tiếp.
- [x] Đã gửi GCN qua bưu điện.
- [x] Số GXN.
- [x] Mã hóa đơn điện tử.
- [x] Số GCN/chứng chỉ, trạng thái thanh toán và trạng thái hồ sơ.
- [x] Hình thức đăng ký, lý do từ chối và lịch sử thay đổi.

Hai trạng thái gửi GCN là ghi nhận đã thực hiện phương thức gửi; không xác nhận bưu điện đã giao thành công. Chưa có quy trình theo dõi mã bưu gửi/ngày gửi/người nhận riêng.

## 4. Những phần nền tảng đã có

| Hạng mục | Hiện trạng |
| --- | --- |
| Next.js, TypeScript, Prisma, PostgreSQL | Đã có cấu trúc ứng dụng và kết nối dữ liệu. |
| Migration dữ liệu | Có baseline và migration bổ sung ngày 06/10/2026. Đã ghi nhận áp dụng ở đợt thiết lập trước; chưa kiểm tra lại trạng thái DB hiện tại do không kết nối được. |
| Đăng nhập | bcrypt, phiên đăng nhập lưu phía máy chủ, cookie HttpOnly; giới hạn đăng nhập sai. Mã hiện tại dùng session tự quản, không mặc định coi tài liệu NextAuth trong `docs/auth` là đã tích hợp. |
| Khóa/đổi quyền tài khoản | Có kiểm tra phiên và thu hồi phiên theo thao tác tài khoản. |
| Kiểm soát sĩ số | Hồ sơ khác REJECTED và thanh toán khác CANCELLED chiếm một chỗ. Từ chối/hủy giải phóng chỗ; kích hoạt lại phải kiểm tra chỗ và trùng hồ sơ. |
| Cập nhật sĩ số công khai | Trang học viên đang mở làm mới định kỳ 15 giây khi tab đang hiển thị; máy chủ quyết định tiếp nhận hồ sơ. |
| Upload hồ sơ | Có giới hạn dung lượng, loại file và kiểm tra nội dung đầu file; hỗ trợ ảnh/PDF. |
| Tra cứu | Có giao diện và xử lý máy chủ, trả dữ liệu phục vụ tra cứu thay vì toàn bộ hồ sơ đính kèm. |
| Email | Có mẫu và điểm gọi xác nhận đăng ký trực tuyến, mã hóa đơn và chứng chỉ. Cần SMTP thực để xác nhận gửi/nhận. |
| Email nhắc lịch | Có hàm tạo/gửi thư nhắc; chưa thấy điểm gọi/lịch chạy tự động trong `src` khi rà soát. Chưa đánh dấu hoàn thiện nhắc lịch tự động. |
| Docker / Nginx | Có `Dockerfile`, `docker-compose.yml`, `nginx.conf` trong `ttcc-app`; chưa nghiệm thu đầy đủ quy trình build/chạy qua Docker và Nginx ở lần rà soát này. |
| Máy chủ phát triển | `pnpm dev` mặc định dùng cổng 3001. |

## 5. Phân quyền đang áp dụng

| Thao tác | Quản trị | Quản lý lớp | Kế toán |
| --- | --- | --- | --- |
| Xem lớp và học viên | Toàn bộ | Lớp được giao | Xem để đối soát |
| Tạo/xóa lớp | Có | Không | Không |
| Sửa lớp | Có | Lớp được giao | Không |
| Thêm thủ công/vét, chuyển lớp, duyệt/từ chối | Có | Lớp được giao | Không |
| Cập nhật thanh toán tại `/registrations` và trang lớp | Có | Chỉ xem | Có |
| Cập nhật mã hóa đơn | Có | Chỉ xem | Có |
| Cập nhật GCN/GXN và trạng thái gửi GCN | Có | Lớp được giao | Chỉ xem |
| Import/Export Excel | Theo quyền quản trị | Theo lớp/trường được cấp quyền | Theo trường kế toán được cấp quyền |
| Cấu hình, tài khoản, phân công lớp | Có | Không | Không |

Đây là quyền trong mã hiện tại. Nếu muốn thay đổi quyền hoặc cho một người kiêm nhiều vai trò, cần chốt và triển khai thêm.

## 6. Kết quả kiểm tra

### Kiểm tra lại ngày 17/10/2026

| Kiểm tra | Kết quả | Diễn giải |
| --- | --- | --- |
| `pnpm exec tsc --noEmit` | Đạt | Không báo lỗi kiểu dữ liệu. |
| ESLint các trang quản trị vừa cải thiện và component dùng chung | Đạt | Không báo lỗi ở phạm vi đã chạy; không coi đây là kết quả lint toàn bộ kho mã. |
| `NEXT_BUILD_DIR=.next-build pnpm build` | Chưa đạt đầy đủ | Biên dịch và TypeScript thành công; lỗi khi dựng trang `/_not-found` do `RootLayout` đọc cấu hình từ DB nhưng không kết nối được `127.0.0.1:5432` (Prisma P1001). |
| `pnpm test:management` | Chưa chạy được tình huống kiểm thử | Dừng khi kết nối PostgreSQL, báo ECONNREFUSED tại `127.0.0.1:5432`; chưa tạo được schema thử. |
| `pnpm test:http` | Chưa chạy lại | Cần cơ sở dữ liệu và ứng dụng đang hoạt động. |
| Kiểm tra trực quan trên trình duyệt, điện thoại | Chưa nghiệm thu | Các lượt trước công cụ trình duyệt gặp lỗi môi trường; chưa có xác nhận trực quan đầy đủ. |
| Docker/Nginx, tên miền, HTTPS, SMTP thực | Chưa nghiệm thu | Chưa có bằng chứng kiểm tra vận hành đầy đủ trong đợt này. |

### Các kết quả đã đạt ở đợt làm việc trước

Theo các lần kiểm tra được ghi nhận trong quá trình triển khai:

- Build production, TypeScript, lint phần thay đổi và kiểm tra HTTP đã từng đạt khi môi trường DB hoạt động.
- Kiểm tra 39/40 chỗ với 12 yêu cầu đồng thời: chỉ nhận thêm 1 học viên.
- Gửi lại cùng yêu cầu không tạo hồ sơ trùng; token khác không được cập nhật biên lai của hồ sơ.
- Chuyển lớp cập nhật hai danh sách/sĩ số và lịch sử, chặn thao tác ngoài quyền.
- Excel kiểm tra trước không lưu; xác nhận mới lưu; file lỗi được hoàn tác; giữ số 0 đầu điện thoại/CCCD; kiểm tra trường kế toán và file sai lớp.
- Đăng ký vét qua hạn nhưng không vượt sĩ số.
- HTTP kiểm tra đăng nhập thật, tải trang, tải Excel, phạm vi Quản lý lớp/Kế toán và phiên tài khoản bị khóa.

Các kết quả này là lịch sử kiểm tra, cần chạy lại sau khi khôi phục kết nối DB để xác nhận hiện trạng.

## 7. Việc cần làm tiếp, theo thứ tự ưu tiên

### Ưu tiên 1 — Khôi phục môi trường và xác nhận bản hiện tại

- [ ] Kiểm tra PostgreSQL/dịch vụ DB và địa chỉ kết nối trong môi trường phát triển; không mặc định tạo lại hoặc xóa DB.
- [ ] Kiểm tra migration đã áp dụng trên đúng DB sau khi kết nối được.
- [ ] Chạy lại build production, `pnpm test:management` và `pnpm test:http`.
- [ ] Xác nhận trang `/`, `/courses/[classId]`, `/registrations`, `/settings`, `/users`, `/course-links` mở và thao tác được.

### Ưu tiên 2 — Nghiệm thu giao diện và nghiệp vụ

- [ ] Kiểm tra thực tế trên máy tính và điện thoại: thanh bên, bảng dài, bộ lọc, hộp thoại, cuộn trang và thao tác bàn phím.
- [ ] Duyệt lại 5 Landing Page: nội dung, hình ảnh, concept và điều kiện tuyển sinh. Chốt phạm vi chỉ tạo route hay hoàn thiện thiết kế riêng; tài liệu yêu cầu hiện có nội dung chưa thống nhất ở điểm này.
- [ ] Chốt định nghĩa “cùng khóa học”: hiện chuyển theo `courseType`, chưa bắt buộc cùng `courseBatch`.
- [ ] Chốt xử lý chuyển lớp khác học phí hoặc đã phát hành chứng từ; hiện hệ thống chặn các trường hợp này.
- [ ] Chốt thời hạn giữ chỗ cho hồ sơ chưa thanh toán; **hiện chưa có tự động hết hạn giữ chỗ**.
- [ ] Chốt các bộ lọc bổ sung có cần đưa vào phạm vi nghiệm thu: thanh toán, hình thức đăng ký, trạng thái gửi GCN.
- [ ] Chốt quy trình gửi GCN: có cần ngày gửi, người gửi, mã bưu gửi hay không.

### Ưu tiên 3 — Email và triển khai thực tế

- [ ] Cấu hình SMTP và thử gửi/nhận thư thật cho các tình huống hiện có.
- [ ] Chốt có gửi xác nhận cho đăng ký thủ công/vét và gửi lý do từ chối hay không; chưa coi hai luồng này là đã hoàn thiện email.
- [ ] Nếu cần nhắc lịch tự động: bổ sung điểm gọi/lịch chạy và kiểm tra tránh gửi trùng.
- [ ] Kiểm tra Docker/Nginx, cấu hình môi trường production, tên miền/HTTPS, lưu trữ upload và sao lưu/khôi phục dữ liệu.
- [ ] Rà soát và chốt các thay đổi Git. Hiện còn nhiều file chỉnh sửa/chưa được theo dõi; chưa có xác nhận commit/phát hành cho toàn bộ phần đã làm.

### Ưu tiên 4 — Đồng bộ tài liệu

- [ ] Cập nhật checklist cũ trong `tasks/task.md`; nhiều ô cũ chưa đánh dấu dù tính năng đã có.
- [ ] Sửa hướng dẫn cũ còn mô tả `/courses` là trang công khai hoặc đặt thủ công/chuyển lớp tại `/registrations`.
- [ ] Đồng bộ mô tả quyền chỉnh Thanh toán tại `/registrations` và hiện trạng concept Landing Page trong tài liệu yêu cầu.

## 8. Checklist nghiệm thu thao tác chính

Các ô dưới đây dành cho lượt nghiệm thu tiếp theo, không phải đánh dấu tính năng chưa được viết.

- [ ] Mở `/` khi chưa đăng nhập → được yêu cầu đăng nhập.
- [ ] Quản trị mở `/courses`, chọn **Quản lý học viên** → vào đúng lớp và đúng sĩ số.
- [ ] Tạo học viên thủ công/vét → xuất hiện trong lớp và trang kiểm tra đăng ký, không vượt sĩ số.
- [ ] Chuyển một học viên hợp lệ → lớp cũ giảm/lớp mới tăng; giữ trạng thái; có lịch sử.
- [ ] Duyệt/từ chối tại `/registrations`; từ chối bắt buộc nhập lý do.
- [ ] Quản trị/Kế toán chỉnh Thanh toán tại `/registrations`; Quản lý lớp không chỉnh được.
- [ ] Xuất Excel, sửa dữ liệu hợp quyền, kiểm tra file và nhập lại đúng lớp; thử một file lỗi để xác nhận không lưu một phần.
- [ ] Cập nhật GXN/GCN, mã hóa đơn và phương thức gửi theo đúng vai trò.
- [ ] Chọn đủ 5 khóa tại `/course-links`; sao chép/mở link đúng khóa và đúng kênh; không có danh sách link từng lớp.
- [ ] Sửa cấu hình ngân hàng → lưu đúng và hiển thị đúng ở bước thanh toán.
- [ ] Giao lớp cho Quản lý lớp → chỉ xem/thao tác trong phạm vi đó; khóa tài khoản → phiên không còn dùng được.
- [ ] Đăng ký trực tuyến tới Bước 3 khi lớp gần đầy → giữ đúng chỗ; gửi lại không tạo trùng; từ chối/hủy giải phóng chỗ theo quy tắc hiện tại.

## 9. Mã nguồn và tài liệu dùng để đối chiếu

| Nội dung | Nơi kiểm tra |
| --- | --- |
| Yêu cầu cập nhật | [Feature_Cap_Nhat_Quan_Ly_Hoc_Vien_Va_Landing_Page.md](features/Feature_Cap_Nhat_Quan_Ly_Hoc_Vien_Va_Landing_Page.md) |
| Checklist cũ | [tasks/task.md](tasks/task.md) |
| Dữ liệu và migration | `ttcc-app/prisma/schema.prisma`, `ttcc-app/prisma/migrations/` |
| Giữ sĩ số và chống trùng | `ttcc-app/src/lib/admissions.ts` |
| Chuyển lớp | `ttcc-app/src/lib/transfers.ts` |
| Excel | `ttcc-app/src/lib/excel.ts`, `ttcc-app/src/app/api/admin/excel/route.ts` |
| Phiên và quyền | `ttcc-app/src/lib/auth.ts`, `permissions.ts`, `ttcc-app/src/app/actions/users.ts` |
| Thao tác hồ sơ/thanh toán/chứng từ | `ttcc-app/src/app/actions/adminRegistration.ts` |
| Các màn hình quản trị | `ttcc-app/src/app/(admin)/` |
| Landing Page và lớp liên quan | `ttcc-app/src/app/(user)/components/ProgramLanding.tsx`, `RelatedCourses.tsx` |
| Email | `ttcc-app/src/lib/mailer.ts` và các điểm gọi trong Server Actions |
| Kiểm thử tự động | `ttcc-app/tests/management.integration.ts`, `http.smoke.ts` |

Báo cáo phản ánh mã đang có trong workspace, bao gồm thay đổi chưa commit; commit nền lúc rà soát: `12ff177`. Các lần cập nhật sau nên ghi ngày kiểm tra, hạng mục thay đổi, kết quả thực tế và việc còn lại để tránh đánh đồng “đã viết” với “đã nghiệm thu”.
