# Kết quả sửa bảo mật và hiệu năng LearningPage

Ngày hoàn tất: 18/10/2026. Phạm vi triển khai và thử tải là môi trường local, theo yêu cầu của người dùng.

Ứng dụng local đã được cập nhật và kiểm tra hoạt động qua Nginx. Lỗi thiếu chunk gây HTTP 500 đã được sửa. Đăng ký công khai dùng khóa theo lớp, lượt gửi và định danh; những lớp không liên quan có thể xử lý đồng thời, trong khi tranh chỗ cuối và gửi lặp vẫn được bảo vệ trong transaction PostgreSQL.

## Kết quả trước và sau

Cùng bộ dữ liệu giả gồm 20 lớp và 1.000 đăng ký, cùng cách đo 1 mẫu đầu và 10 mẫu tuần tự tiếp theo trên standalone production ở loopback. Các đăng ký giả đều ở trạng thái APPROVED, giống baseline; màn kiểm tra mặc định lọc PENDING. Bản cũ vẫn truyền toàn bộ 1.000 bản ghi về trình duyệt trước khi lọc; bản mới chỉ truy vấn và truyền trang kết quả được yêu cầu.

| Chỉ số | Trước sửa | Sau sửa |
| --- | ---: | ---: |
| HTML giải nén của /registrations | 1.607.514 byte | 58.411 byte |
| /registrations phản hồi P50 | 99,4 ms | 22,6 ms |
| /registrations phản hồi P95 của 10 mẫu | 110,5 ms | 29,1 ms |
| /api/classes phản hồi P50 | 14,3 ms | 3,7 ms |
| /api/classes phản hồi P95 của 10 mẫu | 16,2 ms | 6,9 ms |
| Landing mobile tải xong | 5.387,3 ms | 2.251,9 ms |
| Tài nguyên phụ truyền cho landing mobile | khoảng 980 KB | khoảng 353 KB |
| Tổng layout shift quan sát cao nhất ở landing desktop | 0,182 | 0 |
| Advisory nhánh dependency production | 31, gồm 3 critical | 0 |
| UI chính và RBAC chuyên biệt | 35/37 qua | 38/38 qua, gồm ca HTTP race mới |

Dữ liệu truyền cho màn đăng ký giảm khoảng 96,4%. Mobile dùng viewport 390×844, CPU chậm 4 lần, cấu hình mạng tải xuống 200.000 byte/s, độ trễ 150 ms; mỗi trang đo 3 lượt bằng context mới. Chỉ số tải xong là sự kiện load, không phải LCP: LCP mobile quan sát gần như giữ nguyên, khoảng 1,06 giây. Layout shift là phép đo lab ngắn, chưa đại diện CLS field ở percentile 75. Các số trên là baseline của máy phát triển, không phải SLA production.

## Kiểm tra nhiều yêu cầu đồng thời

### Tính đúng của đăng ký

Các ca sau đã qua trên PostgreSQL thật ở schema ngẫu nhiên tách biệt:

- 64 yêu cầu tranh chỗ thứ 40 khi đã có 39 học viên: đúng 1 yêu cầu thành công, tổng không vượt 40. Lượt cuối ghi nhận khoảng 381 ms cho toàn nhóm gọi dịch vụ, qua pool tối đa 10 kết nối.
- 32 lần gửi lại cùng request key và token: đúng 1 bản ghi mới, mọi lần hợp lệ nhận lại cùng ID; đổi token hoặc dùng key đó cho lớp khác bị từ chối.
- 16 request key khác nhau cho cùng CCCD trong cùng lớp: đúng 1 hồ sơ hoạt động.
- Cùng CCCD đăng ký 8 lớp khác nhau đồng thời: tạo 8 đăng ký và chỉ 1 Student chuẩn hóa.
- Một lớp đang bị giữ khóa không chặn đăng ký vào lớp khác.
- Chuyển lớp và đăng ký mới tranh chỗ cuối: chỉ một thao tác nhận được chỗ.
- Khôi phục hồ sơ và đăng ký mới tranh chỗ cuối: không vượt sĩ số.
- Sửa giảm sức chứa đồng thời với đăng ký mới: số chỗ đã ghi nhận không vượt sức chứa sau commit.
- Xác nhận/đổi CCCD trong lúc request đang chờ: kiểm tra trùng đọc lại sau khóa định danh, không tạo hồ sơ trùng từ snapshot cũ.
- Hai Chromium context thực đi qua wizard và gửi HTTP tranh một chỗ: đúng một người tới bước thanh toán; người còn lại nhận thông báo hết chỗ. Replay request HTTP không tăng số hồ sơ.

Các thao tác quản trị nhiều bản ghi vẫn giữ cơ chế tuần tự cũ để bảo vệ các quy tắc như tài khoản quản trị cuối cùng. Đăng ký công khai không còn phải chờ khóa toàn cục đó. Khóa nhiều lớp và nhiều định danh được lấy theo thứ tự ổn định; các kiểm tra sĩ số/trùng được thực hiện trong transaction trước khi ghi.

### Tải đọc có giới hạn

Mỗi route nhận 200 GET, concurrency 10, trên server/schema benchmark riêng. Các route quản trị dùng một tài khoản admin giả. Tổng 800 GET đều trả 200, không có lỗi hay timeout.

| Route | P50 | P95 | Tốc độ quan sát |
| --- | ---: | ---: | ---: |
| /api/classes | 10,7 ms | 51,3 ms | khoảng 594 request/s |
| /hocsocapcuu/courses | 80,3 ms | 102,4 ms | khoảng 119 request/s |
| /registrations | 118,4 ms | 133,1 ms | khoảng 84 request/s |
| /courses/[classId] | 173,7 ms | 193,6 ms | khoảng 57 request/s |

Đây là phép thử ngắn trên loopback với 10 client, không phải khả năng tối đa hoặc sức chịu tải production. Chưa suy rộng sang hàng trăm người dùng, dữ liệu lớn hơn hay nhiều instance. Thử tải chỉ thực hiện trên schema và server giả; các kiểm tra qua Nginx đang phục vụ local là GET smoke test đơn lẻ.

## Những thay đổi chính

1. **Đóng gói và khởi động:** thu hẹp tracing exclusion từ toàn bộ `.next` xuống `.next/dev`; kiểm tra file server cần thiết trong traces. Build tự chạy artifact standalone để kiểm tra login, JS/CSS, redirect xác thực và 404. Docker build với thư mục mặc định cũng qua. Compose có readiness check và inject OTP secret hiện có ở runtime.
2. **Đăng ký đồng thời:** khóa lớp bảo vệ sĩ số, khóa request key bảo vệ idempotency, khóa CCCD bảo vệ Student và kiểm tra trùng. Áp dụng cùng cơ chế cho tạo thủ công, Excel, chuyển lớp, khôi phục, sửa sức chứa và xác nhận định danh. Quyền quản trị khi xác nhận hồ sơ được kiểm tra lại bên trong transaction.
3. **Danh sách và tổng quan:** lọc, sort và phân trang hồ sơ trong PostgreSQL, 10 hàng/trang. Lịch sử tải khi mở, 20 sự kiện/lần. Tổng quan lớp dùng group/count thay vì tải toàn bộ hồ sơ để đếm. Có chống response cũ ghi đè kết quả tìm kiếm mới và giữ phạm vi lớp, mask CCCD theo quyền.
4. **Truy vấn và kết nối:** cache xác thực trong phạm vi request RSC; adapter sở hữu và đóng pool; tránh tạo pool thừa khi dev hot reload. Mặc định 10 kết nối/process, timeout kết nối và truy vấn có giới hạn. Thêm 7 index phục vụ lớp, thứ tự trang, kiểm tra CCCD và tracking.
5. **Trang công khai:** cache metadata/sĩ số công khai tối đa 10 giây/process và gộp request đọc đồng thời. Chỉ trang lịch poll endpoint nhỏ khi tab hiện; refresh sau khi snapshot thay đổi. Giữ nội dung trang ngoài Suspense của tracking để tránh footer nhảy bố cục. Ảnh hero dùng Next Image với kích thước theo viewport. Quyết định nhận chỗ luôn đọc database trong transaction, không dùng cache hiển thị.
6. **Bảo mật:** cập nhật Next.js/eslint-config-next 16.3.8, Prisma 7.10.1, sharp 0.35.5, nodemailer 10.1.2 và các dependency bắc cầu có bản vá tương thích. Tracking validate UUID, allowlist/độ dài, rate limit và chống ghi trùng đồng thời. HTML có CSP thực thi tương thích framework; tài liệu riêng vẫn có CSP sandbox. Tắt X-Powered-By và thêm no-store ở nhánh từ chối export.
7. **Kiểm thử:** sửa kỳ vọng ảnh theo pixel/metadata sau re-encode, ổn định việc lấy mẫu animation, chờ kết quả tìm kiếm server. UI runner tạo schema riêng, tắt SMTP thật và dọn file upload giả sau kiểm thử; không dùng schema nghiệp vụ để tạo fixture.

## Xác minh triển khai local

- 13/13 bộ kiểm thử logic/tích hợp qua; 36/36 UI chính và 2/2 UI RBAC qua. Sau bổ sung cleanup fixture, chạy lại 6/6 ca UI bảo mật cũng qua.
- TypeScript, lint và kiểm tra whitespace diff qua; lint không còn warning.
- Host build cuối qua trong khoảng 14,9 giây với cache build đã có, bao gồm kiểm tra artifact và smoke standalone. Không so sánh thời gian này trực tiếp với cold build.
- Migration chỉ thêm 7 index đã áp dụng trên PostgreSQL localhost; 8 migration đều đã áp dụng. PostgreSQL container và named volumes được giữ nguyên.
- App và Nginx local đã thay bằng bản mới. /login, /api/classes, /hocsocapcuu và static JS trả 200 qua Nginx; /uploads vẫn 404. App container có trạng thái healthy.
- Số dòng Class, Student, Registration và StoredFile không đổi trong quá trình thay container. Hash cả 4 file riêng tư không đổi.
- Dev server cổng 3001 đã chạy Next.js 16.3.8. Server benchmark cổng 3101 đã dừng; schema và credential benchmark giả đã xóa. Một schema còn sót từ lần kiểm thử lỗi ban đầu và các thư mục upload giả cũng đã dọn.

## Phần còn lại và lưu ý triển khai

Audit production hiện bằng 0. Audit gồm cả công cụ phát triển còn 1 advisory high của braces 3.0.3 trong chuỗi ESLint → fast-glob → micromatch. Registry dùng ở lần kiểm tra chưa phát hành bản 3.0.4 mà advisory nêu; không ép một phiên bản không tồn tại. Package này không nằm trong nhánh production được audit. Theo dõi cập nhật upstream và chạy audit lại khi cập nhật công cụ build.

CSP hiện vẫn cho inline script/style để tương thích Next.js và motion; đây chưa phải strict CSP bằng nonce/hash. Giới hạn giải nén XLSX, job xuất Excel lớn, quét/cách ly PDF, retention và xử lý tài liệu từng nằm trong lịch sử Git vẫn là các hạng mục riêng của báo cáo gốc. Đợt này tập trung vào các đường thực thi local và đăng ký đồng thời theo yêu cầu mới; cấu hình TLS/SMTP production không được thay đổi.

Khi đưa cơ chế khóa mới sang môi trường nhiều instance, cần nâng đồng bộ mọi tiến trình có quyền ghi đăng ký hoặc cutover trong cửa sổ bảo trì. Không chạy song song writer phiên bản cũ chỉ dùng khóa toàn cục với writer mới dùng khóa theo lớp. Ngân sách kết nối PostgreSQL phải tính tổng app instance, worker và công cụ bảo trì; tăng DATABASE_POOL_MAX riêng lẻ không tự tăng năng lực hệ thống.

## Bằng chứng và mã nguồn

Các log/số đo chi tiết nằm trong `.local/remediation-20261018`, bị Git bỏ qua. Những thay đổi sẵn có của người dùng được giữ lại; chưa tạo commit.

- [Khóa lớp và đăng ký](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/lib/admissions.ts:38>)
- [Khóa định danh học viên](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/lib/students.ts:10>)
- [Xác nhận hồ sơ trong transaction](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/app/actions/student.ts:26>)
- [Phân trang hồ sơ](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/lib/registration-page.ts:9>)
- [Cache thông tin lớp công khai](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/lib/public-classes.ts:16>)
- [Kiểm thử cạnh tranh](<//wsl.localhost/Debian/home/sonnguyen/Learning/tests/concurrency.integration.ts:1>)
- [Kiểm thử hai trình duyệt qua HTTP](<//wsl.localhost/Debian/home/sonnguyen/Learning/tests/concurrency.spec.ts:1>)
- [Index mới](<//wsl.localhost/Debian/home/sonnguyen/Learning/prisma/migrations/20261018000100_registration_performance_indexes/migration.sql:1>)
- [Số đo trước và sau](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/remediation-20261018/measurements.json>)
- [Tải 10 client](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/remediation-20261018/load-results.json>)
- [Kết quả UI](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/remediation-20261018/ui.log>)
- [Kết quả race database](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/remediation-20261018/test-concurrency.log>)
- [Audit production](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/remediation-20261018/audit-prod.json>)
- [Kiểm tra container qua Nginx](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/remediation-20261018/deployment-http.json>)
- [Báo cáo gốc](<//wsl.localhost/Debian/home/sonnguyen/Learning/docs/audits/security-performance-2026-10-18.md>)
