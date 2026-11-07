# Báo cáo bảo mật và hiệu năng LearningPage

Ngày đánh giá: 18/10/2026, múi giờ Asia/Bangkok. Phạm vi là mã nguồn đang có trong workspace, gồm các thay đổi chưa commit, trên nền commit `f130dcf`.

**Ưu tiên đầu tiên là khôi phục artifact triển khai:** Nginx/Docker local trả HTTP 500 ở cả trang đăng nhập và API danh sách lớp do thiếu chunk runtime. Bản build riêng từ mã nguồn hiện tại hoạt động, nhưng không chứng minh image Docker đang chạy hoặc quy trình build với thư mục mặc định đã đúng. Tiếp theo cần cập nhật dependency, hoàn thiện TLS và cấu hình OTP/SMTP, và chặn lạm dụng tracking. Các kiểm thử phân quyền và dữ liệu riêng tư cho thấy nhiều biện pháp bảo vệ đã hoạt động.

## Phạm vi và phương pháp

- Framework: Next.js 16.3.0 App Router, React 19.2.8, TypeScript, Prisma 7.9.1 với PostgreSQL 16, Tailwind 4; pnpm 11.21.0 và Node 22.22.2 trong Debian/WSL. Có Nginx và Docker Compose.
- Đọc mã xác thực, phân quyền, Server Actions, tất cả nhóm API, upload, OTP, Excel, truy vấn dữ liệu, cấu hình build và triển khai. Đọc hướng dẫn CLI, data security và headers từ package Next.js cài trong project.
- Chạy 10 bộ kiểm thử logic/tích hợp; kiểm thử có ghi dữ liệu dùng schema ngẫu nhiên tách biệt trên PostgreSQL localhost. Không chạy migration hay fixture vào schema nghiệp vụ `public`.
- Chạy 35 ca trình duyệt chính và 2 ca RBAC chuyên biệt bằng Chromium, dùng bản build production riêng, server chỉ bind `127.0.0.1:3101`, thư mục file riêng và schema giả. SMTP thật bị vô hiệu hóa trong server kiểm toán.
- Đo HTTP trên dữ liệu giả gồm 20 lớp và 1.000 đăng ký; chưa tạo hồ sơ Student chuẩn hóa nên số đo `/students` là trạng thái danh bạ trống. Mỗi route có 1 mẫu đầu và 10 mẫu tiếp theo, tuần tự. P95 trong mẫu nhỏ này là giá trị lớn nhất của 10 mẫu.
- Mỗi trang được đo trình duyệt 3 lần bằng context mới; quan sát đến 1,2 giây sau `load`. Mobile dùng viewport 390×844, CPU chậm 4 lần, cấu hình mạng 150 ms, tải xuống 200.000 byte/s và tải lên 93.750 byte/s. Chặn yêu cầu trình duyệt đến origin ngoài local.
- Chỉ thực hiện 4 GET đơn lẻ qua Nginx local đang có để kiểm tra phản hồi/headers; không stress test, khai thác RCE/SSRF, gửi email thật hay thử tải cao vào production. Chưa có địa chỉ production được cung cấp; kết luận TLS, headers và container chỉ áp dụng cho môi trường local/cấu hình repository đã kiểm tra.

## Kết quả kiểm thử và build

| Hạng mục | Kết quả |
| --- | --- |
| Build production riêng | PASS, 16,428 giây; biên dịch khoảng 6 giây; TypeScript khoảng 7 giây; sinh 15 trang tĩnh khoảng 348 ms |
| Bộ nhớ build | Đỉnh RSS tiến trình con khoảng 1.948.636 KiB, tương đương 1,86 GiB; không phải tổng bộ nhớ đồng thời của mọi worker |
| Kiểm tra artifact riêng | PASS kiểm tra loại `.env`, dữ liệu local, file riêng tư và backup khỏi standalone/traces |
| Logic và tích hợp | 10/10 bộ PASS: ngày giờ, quản lý đăng ký, bảo mật, migration học viên, điểm danh, danh bạ, RBAC, truy cập tài khoản, xử lý ảnh, tài khoản cá nhân |
| UI chính | 33/35 PASS trong khoảng 157 giây |
| UI RBAC chuyên biệt | 2/2 PASS; kiểm tra thu hồi quyền, thao tác cũ, menu/page/Excel, vai trò tùy chỉnh và khôi phục tài khoản |
| UI tổng cộng | 35/37 PASS; hai ca thất bại được phân tích bên dưới |
| Lint mã nguồn | 0 lỗi, 1 warning: import `ArrowLeft` không dùng ở trang đăng nhập |
| Audit toàn bộ dependency | 36 cảnh báo: 3 critical, 21 high, 11 moderate, 1 low |
| Audit nhánh production | 31 cảnh báo: 3 critical, 17 high, 10 moderate, 1 low |

Số cảnh báo audit là các mục advisory mà registry trả về, có thể cùng advisory xuất hiện cho nhiều nhánh phiên bản. Đây không phải số lỗ hổng đã chứng minh khai thác được, cũng không phải số package độc lập. Nhánh `--prod` vẫn chứa một số công cụ Prisma qua dependency bắc cầu; không đồng nghĩa mọi mục đều chạy trong request production.

Hai lỗi UI:

1. Ca tại `tests/attendance.spec.ts:664` dừng ở dòng 680 vì so sánh byte ảnh gốc với ảnh được decode/re-encode. Mã upload hiện loại EXIF/ICC, nên kỳ vọng byte gốc đã không còn phù hợp. Những assertion nằm sau chỗ dừng chưa được xác nhận bởi ca này. Cần sửa kỳ vọng để kiểm tra nội dung ảnh đã giải mã, metadata bị loại và quyền truy cập riêng biệt.
2. Ca tại `tests/landing.spec.ts:117` thất bại trong lượt đầy đủ do opacity vẫn bằng 0; chạy lại riêng vẫn thất bại nhưng ở assertion chuyển động khi cuộn ngược. Kết quả cho thấy hành vi/kỳ vọng motion chưa ổn định; chưa đủ để kết luận một nguyên nhân duy nhất. Giữ trace để điều tra, tách kiểm tra khả năng nhìn thấy nội dung khỏi độ dịch chuyển của spring animation.

Build thử đầu tiên đặt trong `.local` bị bộ kiểm tra artifact từ chối vì đường dẫn này thuộc diện loại khỏi trace. Lint mặc định cũng quét artifact kiểm toán trong `.local` và sinh lỗi từ mã generated. Sau đó build được đặt tại `.next-build/audit-20261018`; lint loại `.local/**` và có kết quả như bảng. Hai hiện tượng do bố trí công cụ kiểm toán này không được tính là lỗi của mã sản phẩm. Các include trong `tsconfig.json` do Next tự thêm cho thư mục kiểm toán được gỡ lại sau kiểm tra.

## Danh sách ưu tiên khắc phục

P0 cần xử lý ngay để dịch vụ hoạt động. P1 cần hoàn tất trước triển khai công khai tiếp theo. P2 nên xử lý trong đợt tối ưu và tăng độ tin cậy kế tiếp.

| Mã | Ưu tiên | Phát hiện và bằng chứng | Việc cần làm và tiêu chí đóng |
| --- | --- | --- | --- |
| O1 | P0 | Qua Nginx local, `/login` và `/api/classes` đều HTTP 500. Log `ttcc_nextjs` ghi thiếu `../../chunks/ssr/[turbopack]_runtime.js` và một API chunk. Container chỉ có 3 file dưới thư mục server chunks, trong khi standalone build riêng có 181. | Điều tra đóng gói artifact, build image mới ở môi trường cô lập và smoke test trang/API trước khi thay container phục vụ. Chỉ đóng khi image thực tế chạy có `/login` 200, API 200 và route sai 404. Không tự restart/redeploy trong lần đánh giá này. |
| S1 | P1 | Next.js 16.3.0 và các thư viện khác khớp advisory còn mở. Ba cảnh báo critical đều thuộc Next.js, nhưng có điều kiện riêng; xem bảng dependency. | Nâng Next.js và eslint-config-next đồng bộ tới ít nhất 16.3.8 theo phạm vi bản vá registry hiện trả về; sharp ít nhất 0.35.5; nodemailer ít nhất 10.0.9. Làm mới lockfile có kiểm soát, kiểm tra cả bản thực tế được trace vào standalone, chạy lại build và các bộ test. Không áp dụng override khác major hàng loạt. |
| S2 | P1 trước public | Compose/Nginx chỉ cấu hình HTTP cổng 80, không TLS, không redirect HTTPS/HSTS. `APP_ORIGIN` mặc định là HTTP localhost; mật khẩu database được ghi cố định trong Compose. Container app chạy UID 0. | Dùng TLS tại ingress thực tế, origin HTTPS chính xác và secrets runtime; thay thông tin database mặc định trước public. Chạy app bằng user không đặc quyền với quyền ghi đúng volume. Chỉ bật HSTS sau khi HTTPS/domain/subdomain đã được xác minh. Localhost không chứng minh cookie Secure hoạt động trên domain HTTP thật. |
| S3 | P1 | Compose không inject `LOOKUP_OTP_SECRET` và các biến SMTP. Container chạy thực tế cũng không có các khóa đó, trong khi local `.env` có OTP secret hợp lệ. `otpDigest` sẽ ném lỗi khi thiếu khóa; chưa có SMTP thật được xác nhận. | Inject khóa riêng cho từng môi trường cùng cấu hình SMTP; fail sớm khi khởi động nếu thiếu cấu hình bắt buộc. Xác minh gửi/nhận, retry, hết hạn, replay, đổi email và thu hồi phiên trên staging. Xác minh worker outbox và lịch chạy; không đưa secret vào image. |
| S4 | P1 | Server Action tracking không kiểm tra UUID, allowlist tên sự kiện/nguồn hay độ dài và không rate limit. Một POST ẩn danh local trả 200 và lưu nguồn dài 6.000 ký tự với tên sự kiện tùy ý. `findFirst` rồi `create` không có ràng buộc unique chống đua. | Validate dữ liệu ở server, chặn nguồn/sự kiện ngoài danh sách, giới hạn độ dài và tần suất; cân nhắc unique composite cho session/event và retention. Đóng khi payload thử bị từ chối và ghi trùng đồng thời được xử lý nguyên tử. Rủi ro đã xác nhận là ghi dữ liệu không hợp lệ; chưa đo DoS hay mức tăng dung lượng khi bị tấn công. |
| S5 | P1 nếu đã chia sẻ repo/image | Metadata Git vẫn chứa 4 blob tài liệu dưới `public/uploads`, dù HEAD không còn theo dõi file nào ở đó. README mô tả đây là tài liệu legacy chuyển sang lưu riêng. Chưa mở nội dung hoặc xác định ai từng truy cập repo/image. | Rà soát quyền truy cập repo, remote, backup và image cũ; đánh giá nội dung/lịch sử chia sẻ trong quy trình bảo mật dữ liệu. Nếu cần, lên kế hoạch làm sạch lịch sử và image có phối hợp. Xóa file tại HEAD không thu hồi được bản cũ. Không tự viết lại lịch sử Git. |
| F1 | P2 | `/registrations` tải toàn bộ bản ghi cùng lịch sử trước khi lọc/phân trang ở client: 1.607.514 byte HTML giải nén với 1.000 đăng ký. `getClasses`, public course list và API lớp cũng không có giới hạn trang. Layout lớp đọc toàn bộ đăng ký để tính counters. | Phân trang/lọc/sort trong database, trả DTO tối thiểu; chỉ lấy lịch sử khi mở chi tiết; dùng count/aggregate thay vì đọc mọi hàng. Xuất Excel lớn nên dùng job/stream với giới hạn phù hợp. Mục tiêu ban đầu: payload màn danh sách 50 hàng dưới 200 KB và thời gian tăng theo trang, không theo toàn bộ dữ liệu. |
| F2 | P2 | `LiveRosterRefresh` đặt ở toàn bộ layout public, gọi `router.refresh()` mỗi 15 giây khi tab hiển thị, kể cả trang tra cứu/landing. Tương đương tối đa 4 lần refresh/phút/tab, chưa tính request khác. | Chỉ refresh dữ liệu sĩ số ở màn cần thiết, tách endpoint nhỏ, dùng backoff hoặc cập nhật theo sự kiện. Có thể cache ngắn thông tin công khai; kiểm tra sức chứa bằng transaction khi đăng ký để giữ tính đúng. Không cache dữ liệu hồ sơ/phiên theo cách dùng chung giữa người dùng. |
| F3 | P2 | Mobile mô phỏng tải landing xong khoảng 5,39 giây, tài nguyên phụ khoảng 980 KB truyền tải. Desktop landing và lịch khóa học có tổng layout shift quan sát tới 0,182; một lần ghi nguồn shift là footer xuất hiện rồi bị đẩy khỏi viewport khi nội dung tới. | Giảm prefetch/chunk chưa cần, tải trễ motion và biểu đồ đúng màn, tối ưu ảnh; dành chỗ cho nội dung đang stream/fallback ở layout public. Mục tiêu CLS dưới 0,1, xác nhận bằng phép đo lab chuẩn và dữ liệu người dùng thật. Điều tra ca motion thất bại trước nghiệm thu UI. |
| S6 | P2 | HTML chỉ có CSP Report-Only với `unsafe-inline`; không có policy thực thi và không cấu hình nơi nhận report. File riêng tư có CSP sandbox thực thi. | Thu thập vi phạm CSP ở staging, chuyển script sang nonce/hash thích hợp rồi thực thi policy theo route; kiểm tra tương thích Next.js. Cấu hình reporting endpoint. Không thêm policy quá chặt trực tiếp khi chưa kiểm tra vì có thể làm hỏng hydration. |
| S7 | P2 | Import Excel nạp/giải nén workbook trước khi kiểm tra 500 hàng/30 cột; giới hạn 5 MB file nén chưa giới hạn tổng dung lượng giải nén. PDF chỉ kiểm tra định dạng, `scanStatus` mặc định UNVERIFIED nhưng đường tải không kiểm trạng thái. Chưa thấy job dọn file chờ/phiên/rate limit/OTP/audit hết hạn trong source/scripts. | Đặt giới hạn entry/dung lượng giải nén, timeout và worker cho import; cách ly/quét PDF nếu xử lý file không tin cậy. Thiết kế retention theo từng loại dữ liệu và dọn staged file an toàn, tránh xóa tài liệu đang được tham chiếu. Đây là rủi ro từ mã nguồn; không thử zip bomb/malware. |

### Chi tiết dependency cần xử lý

| Package hiện tại | Advisory hoặc bản vá | Mức liên quan với project |
| --- | --- | --- |
| next 16.3.0 | [RCE Windows](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), sửa từ 16.3.3 | Runtime kiểm tra là Linux/WSL và Docker Linux, nên không đáp ứng điều kiện Windows của advisory này. |
| next 16.3.0 | [RCE khi tối ưu AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), sửa từ 16.3.3 | Có sử dụng Image Optimization. Upload riêng chỉ cho PNG/JPG/WebP/PDF; chưa chứng minh attacker đưa được AVIF vào optimizer. Không gửi payload khai thác. |
| next 16.3.0 | [RCE next/og ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), sửa từ 16.3.6 | Không tìm thấy dùng `next/og`/`ImageResponse` trong source. |
| next 16.3.0 | SSRF Image Optimization và các cảnh báo cache/metadata; registry nêu bản vá từ 16.3.8 | [Nhà duy trì nêu SSRF không ảnh hưởng khi không cấu hình remotePatterns](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4); project hiện không cấu hình trường này. Không thấy `use cache` hoặc Draft Mode trong source. Nâng bản vá vẫn cần thiết. |
| sharp 0.35.3 | Cảnh báo libheif và [librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w); bản vá bao phủ từ 0.35.5 | Decode ảnh upload là đường xử lý thật; magic bytes/MIME/pixel limit và từ chối SVG/AVIF giảm khả năng tiếp cận từng decoder lỗi. Không được coi kiểm tra định dạng là thay thế bản vá. |
| nodemailer 10.0.3 | Nhiều cảnh báo parser/envelope; [bản vá từ 10.0.9 cho parsing địa chỉ](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-g57g-f23g-4646) | Email có validation và giới hạn ở một số đầu vào; SMTP hiện chưa cấu hình. Chưa chứng minh khai thác parser ở luồng thực tế. |
| brace-expansion 1.1.18 / 2.1.4 | Nhánh bản vá tương ứng ít nhất 1.1.21 / 2.1.7 theo các advisory trong audit | Qua archiver/readdir-glob của ExcelJS; đường pattern do attacker điều khiển chưa được chứng minh. |
| fast-uri 3.1.5 | Các advisory bản vá tới 3.1.8 | Qua resolvers/AJV và công cụ Prisma; chưa thấy ứng dụng dùng đầu vào URI này để fetch từ server. |
| mysql2 3.15.3 / deepmerge-ts 7.1.5 | Các bản vá tới mysql2 3.23.1 và deepmerge-ts 8.0.0 | Đến từ nhánh Prisma CLI/config; ứng dụng đang dùng PostgreSQL. Cần giải quyết bằng cập nhật upstream tương thích, không ép đổi major tùy tiện. |
| uuid 8.3.2 / source-map-js 1.2.1 | uuid từ 11.1.1; source-map-js từ 1.2.2 theo audit | uuid cũ thuộc ExcelJS, khác dependency uuid trực tiếp 14.0.1. Điều kiện buffer API/source-map do người dùng kiểm soát chưa được chứng minh. |

Đối chiếu bản vá ở thời điểm đánh giá với advisory và lockfile mới trước khi cập nhật. Sau nâng cấp, audit lại để xác nhận các nhánh bắc cầu thực sự được thay thế.

### Nguyên nhân artifact cần điều tra

`next.config.ts:10` loại `./.next/**/*` khỏi output tracing trên mọi route, trong khi Docker build mặc định cũng dùng `.next`. Đây là nghi vấn mạnh cho tình trạng mất chunk; chưa xác nhận bằng cách rebuild Docker với đúng quy trình mặc định. Bản kiểm toán dùng `.next-build/audit-20261018`, nên không chịu cùng điều kiện đường dẫn đó. Bộ `check-build-output.ts` hiện kiểm tra dữ liệu riêng tư nhưng chưa xác nhận mọi runtime/chunk cần thiết đều có và chạy được. Cần thêm smoke test chính standalone/image sẽ triển khai.

## Thời gian phản hồi HTTP local

Đơn vị ms; đo đến khi đọc hết response body trên loopback. HTML là byte sau giải nén. Đây là baseline tuần tự trên máy phát triển đang có dịch vụ khác, không phải năng lực phục vụ đồng thời hay độ trễ production. Các màn quản trị dùng session giả của admin; Excel xuất một lớp gồm 50 đăng ký giả.

| Route | HTTP | Mẫu đầu | P50 10 mẫu tiếp | P95 10 mẫu tiếp | Body byte |
| --- | --- | ---: | ---: | ---: | ---: |
| /login | 200 | 60,9 | 11,5 | 17,9 | 22.033 |
| /hocsocapcuu | 200 | 312,3 | 17,6 | 29,3 | 51.984 |
| /hocsocapcuu/courses | 200 | 30,4 | 18,1 | 27,5 | 98.010 |
| /search | 200 | 6,5 | 7,7 | 12,9 | 18.501 |
| / | 200 | 112,3 | 25,2 | 32,5 | 87.106 |
| /registrations | 200 | 141,0 | 99,4 | 110,5 | 1.607.514 |
| /courses | 200 | 69,6 | 25,7 | 40,3 | 136.239 |
| /students | 200 | 37,1 | 19,8 | 28,0 | 36.515 |
| /api/classes | 200 | 37,7 | 14,3 | 16,2 | 1.441 |
| /api/admin/excel với classId | 200 | 140,3 | 37,8 | 60,8 | 12.120 |

Mẫu đầu là lần đo đầu cho route, không phải thời gian khởi động nguội của toàn hệ thống. Số đo `/students` chưa đại diện danh bạ có dữ liệu chuẩn hóa. Chưa đo luồng động của mọi slug/class/session có thể có trong production.

## Tải trang bằng Chromium

Các cột thời gian là trung vị 3 lần, ms. Cột shift là tổng layout shift không do tương tác cao nhất trong cửa sổ quan sát, là phép đo lab ngắn chứ không phải CLS field ở percentile 75. LCP cũng là giá trị lab quan sát trước khi kết thúc phép đo. Không thu thập INP vì chưa có chuỗi tương tác đại diện.

| Trang và điều kiện | DOMContentLoaded | Load | LCP | Shift tối đa |
| --- | ---: | ---: | ---: | ---: |
| /login desktop | 40,8 | 83,1 | 52 | 0 |
| /hocsocapcuu desktop | 36,9 | 130,5 | 284 | 0,182 |
| /hocsocapcuu/courses desktop | 62,8 | 99,5 | 372 | 0,182 |
| /search desktop | 22,4 | 82,5 | 168 | 0,00291 |
| / desktop | 71,5 | 143,6 | 88 | 0 |
| /registrations desktop | 218,7 | 241,3 | 192 | <0,000001 |
| /hocsocapcuu mobile CPU/mạng mô phỏng | 847,5 | 5.387,3 | 1.060 | 0 |

Mobile landing có trung vị khoảng 113 ms tổng phần thời gian vượt 50 ms của các long task quan sát được; đây là chỉ báo tự đo, không phải điểm TBT Lighthouse. Không có lỗi JavaScript `pageerror` trong các lượt đo. Tài nguyên JS ghi nhận gồm cả prefetch phát sinh trong cửa sổ quan sát; không diễn giải thành toàn bộ JS bắt buộc để hiện màn đầu.

Tổng mọi JS chunk của build khoảng 2.509.780 byte, gzip riêng từng chunk khoảng 781.296 byte; không phải lượng tải của một route. Chunk lớn nhất khoảng 392 KB raw/91 KB gzip. Build trace ghi `run-typescript` khoảng 7,03 giây và `run-turbopack` khoảng 6,48 giây; các span lồng nhau không được cộng để tính tổng.

[Google mô tả mục tiêu CLS tốt là 0,1 trở xuống và đánh giá field ở percentile 75](https://web.dev/articles/cls). Cần đo bằng Lighthouse/Web Vitals trên staging và theo dõi người dùng thật sau phát hành trước khi khẳng định đạt Core Web Vitals.

## Xác thực và HTTP security headers

Các kiểm tra trên build riêng xác nhận:

- Đăng nhập đúng qua API trả 200; cookie có HttpOnly, Secure, SameSite=Lax và Path=/.
- GET quản trị không đăng nhập redirect 307 tới `/login`; xuất Excel không đăng nhập trả 403; file riêng tư và đường legacy upload trả 404.
- POST login/upload với Origin khác trả 403; login multipart vượt giới hạn trả 413. Phản hồi các ca này có no-store, trừ nhánh từ chối export hiện chưa đặt Cache-Control.
- Session là token ngẫu nhiên 32 byte, database lưu SHA-256; hạn 8 giờ. Mật khẩu dùng bcrypt; đăng nhập có bộ đếm IP/tài khoản. Kiểm thử xác nhận thu hồi phiên, role/class scope, OTP HMAC một lần, chặn replay và giới hạn đoán mã.
- File upload có giới hạn dung lượng thực khi đọc stream, kiểm MIME/chữ ký, decode ảnh, giới hạn pixel, loại EXIF/ICC, quyền sở hữu và thư mục riêng. Download riêng dùng no-store, attachment, nosniff và CSP sandbox.

| Header hoặc biện pháp | Bản build riêng | Qua Nginx local đang chạy |
| --- | --- | --- |
| X-Content-Type-Options | nosniff | Có ở phản hồi từ app, kể cả 500 |
| X-Frame-Options | DENY | Có ở phản hồi từ app |
| Referrer-Policy | no-referrer | Có ở phản hồi từ app |
| Permissions-Policy | Có hạn chế theo route | Có trên phản hồi đã lấy |
| CSP thực thi cho HTML | Thiếu, chỉ Report-Only | Chỉ Report-Only |
| CSP thực thi cho tài liệu riêng | sandbox/default-src none | Không thử tải tài liệu thật |
| HSTS/TLS | Server kiểm toán HTTP loopback | Không có TLS/HSTS trong ingress local |
| /uploads legacy | 404, no-store | 404 từ Nginx, thiếu các header chung của app |

CSP Report-Only không chặn vi phạm. Header hiện cũng thiếu cấu hình gửi report tới server; xem [tài liệu Mozilla](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only). Không coi các header tốt là bằng chứng rằng trang hoạt động khi HTTP đang là 500.

Không có bằng chứng kiểm thử vượt xác thực hoặc vượt phạm vi lớp thành công trong các luồng đã kiểm tra. Kết quả này không bao phủ mọi biến thể nghiệp vụ hoặc chứng nhận không còn lỗ hổng.

## Kế hoạch thực hiện

1. **Ngay:** xử lý O1, xác nhận image hoạt động bằng smoke test; giữ chặn `/uploads`. Không dùng image hiện trả 500 để đánh giá tốc độ trang thành công.
2. **Trước public tiếp theo:** xử lý S1–S5 theo điều kiện áp dụng; staging phải có TLS, origin/secrets đúng, email thật đã xác minh và audit dependency được phân loại. Tách tài khoản database runtime khỏi quyền DDL/migration nếu triển khai thực tế đang dùng chung.
3. **Đợt tối ưu kế tiếp:** phân trang server, aggregate counters, thu hẹp refresh/prefetch, ổn định fallback/layout và sửa kỳ vọng kiểm thử ảnh/motion. Bổ sung kiểm tra gói triển khai hoàn chỉnh.
4. **Vận hành:** retention và backup cả database lẫn private volume; diễn tập restore; log lỗi an toàn, theo dõi HTTP 5xx, outbox, latency và dung lượng. Sau sửa, chạy lại cùng baseline; chỉ thử tải đồng thời trên staging/local được chỉ định với giới hạn tài nguyên và dữ liệu giả.

## Bằng chứng và tái lập

Các file trong `.local/audit-20261018` chứa log và số đo đã lưu; thư mục này bị Git bỏ qua. Artifact build nằm trong `.next-build/audit-20261018` và cũng bị bỏ qua. Không có thay đổi mã ứng dụng hoặc lockfile do đánh giá này.

- Build: `build.log`, `build-summary.json`, `bundle-profile.json`.
- Kiểm thử: từng `test-*-summary.json`/log, `upload-images.test-summary.json`, `self-account.integration-summary.json`; `ui-results.json` và `rbac-results.json`.
- Lỗi UI: `landing-recheck.json`, trace trong `playwright-results` và `landing-recheck`.
- HTTP và browser: `measurements.json`; `docker-http.json`, `docker-errors.log` đã che chuỗi kết nối/email.
- Tracking: `tracking-check.json`, `tracking-http.json`, `tracking-http-stored.json`.
- Layout/history: `layout-shifts.json`, `history-metadata.json`.
- Script tái lập: `run.py`, `prepare.mjs`, `start-server.mjs`, `ui.py`, `seed.ts`, `measure.mjs` và các cấu hình Playwright kiểm toán.

Chạy từ root repository với database local:

```sh
NEXT_BUILD_DIR=.next-build/audit-20261018 pnpm build
pnpm exec eslint . --ignore-pattern '.local/**'
pnpm test:security
pnpm test:rbac
pnpm test:account-access
pnpm exec tsx tests/upload-images.test.ts
pnpm exec tsx tests/self-account.integration.ts
```

Các script kiểm toán tạo/xóa schema giả theo tên đã ghi nhận; không trỏ chúng vào production. Server kiểm toán được dừng và schema/credential giả được dọn sau lần chạy. Các dịch vụ Docker/dev sẵn có được giữ nguyên. Báo cáo không chứa mật khẩu hay nội dung tài liệu cá nhân.

### Liên kết tới mã và bằng chứng

- [Báo cáo HTTP và tải trang](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/audit-20261018/measurements.json>)
- [Kết quả UI chính](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/audit-20261018/ui-results.json>)
- [Kết quả RBAC](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/audit-20261018/rbac-results.json>)
- [Audit dependency production](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/audit-20261018/audit-prod.log>)
- [Lỗi container đã che dữ liệu](<//wsl.localhost/Debian/home/sonnguyen/Learning/.local/audit-20261018/docker-errors.log>)
- [Cấu hình tracing và headers](<//wsl.localhost/Debian/home/sonnguyen/Learning/next.config.ts:5>)
- [Cấu hình triển khai](<//wsl.localhost/Debian/home/sonnguyen/Learning/docker-compose.yml:1>)
- [Đóng gói image](<//wsl.localhost/Debian/home/sonnguyen/Learning/Dockerfile:23>)
- [Xác thực phiên](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/lib/auth.ts:12>)
- [Đăng nhập và cookie](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/app/actions/auth.ts:15>)
- [Tracking công khai](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/app/actions/tracking.ts:5>)
- [Danh sách đăng ký không phân trang](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/app/actions/adminRegistration.ts:57>)
- [Giải nén Excel trước giới hạn hàng](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/lib/excel.ts:142>)
- [Refresh công khai định kỳ](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/app/(user)/components/LiveRosterRefresh.tsx:4>)
- [Hiệu ứng scroll](<//wsl.localhost/Debian/home/sonnguyen/Learning/src/app/(user)/components/ScrollReveal.tsx:6>)
