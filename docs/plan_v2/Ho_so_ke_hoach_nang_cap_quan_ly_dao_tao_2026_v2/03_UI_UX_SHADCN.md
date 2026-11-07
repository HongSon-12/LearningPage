# 03. Kế hoạch UI/UX với shadcn/ui

## 1. Mục tiêu

Chuẩn hóa giao diện nhưng vẫn giữ concept riêng của từng chương trình đào tạo.

## 2. Stack giao diện chuẩn

| Thành phần | Package/cách bổ sung | Vai trò |
|---|---|---|
| CSS/theme | `tailwindcss`, `@tailwindcss/postcss`, `postcss` nếu chưa có | Layout, responsive, token, theme |
| Component | shadcn CLI | Button, Input, Field, Card, Dialog, Sidebar, Tabs, Table... |
| Data table | `@tanstack/react-table` | Sort/filter/page/select/column visibility |
| Form | `react-hook-form` | Form tương tác phức tạp |
| Validation | `zod` | Schema dữ liệu |
| RHF + Zod | `@hookform/resolvers` | Kết nối validation |
| Toast | Sonner qua shadcn | Thông báo UI thống nhất |

Các dependency nội bộ của shadcn như `clsx`, `tailwind-merge`, `class-variance-authority`, `cmdk`, `react-day-picker`, `vaul`... chỉ để CLI thêm khi component thực tế cần.

## 3. Discovery trước khi init

Trước khi chạy shadcn:
- đọc `package.json`, lockfile;
- kiểm tra Tailwind/PostCSS;
- kiểm tra `components.json`;
- kiểm tra alias `@/*`;
- kiểm tra `src/components/ui`;
- không init đè cấu hình đang hoạt động;
- không trộn Base UI/Radix/React Aria ngẫu nhiên.

Lệnh tham khảo:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input field card badge table dialog alert-dialog tabs sidebar dropdown-menu select checkbox radio-group tooltip sheet drawer skeleton separator breadcrumb sonner
pnpm add @tanstack/react-table react-hook-form zod @hookform/resolvers
```

Không chạy máy móc nếu package/component đã có.

## 4. Package bổ sung trong quá trình làm

Codex **được phép đề xuất thêm** để thuận tiện/tối ưu hơn theo `12_KE_HOACH_DEPENDENCIES.md`.

Có thể cân nhắc khi thật sự cần:
- `date-fns`: xử lý ngày giờ phức tạp/lặp nhiều;
- `react-day-picker`: date picker;
- `cmdk`: command palette;
- `nuqs` hoặc tương đương: URL filter state phức tạp;
- package kiểm tra magic bytes upload;
- logging/observability package khi có hệ thống vận hành nhận log/trace.

Không mặc định thêm Redux, React Query, Axios, Redis hoặc UI framework thứ hai.

## 5. Design system

Shared tokens:
```text
--brand-primary
--brand-secondary
--brand-accent
--success
--warning
--danger
--surface
--muted
--border
```

`components/ui/*`: shadcn base, không chứa Prisma/business rule.

`components/admin/*`:
- `AdminShell`
- `StatCard`
- `FilterBar`
- `StatusBadge`
- `DataTable`
- `EmptyState`
- `EntityActions`

`components/public/*`:
- `ProgramHero`
- `ClassCard`
- `RelatedCourses`
- `ProgramSection`
- `FaqSection`
- `RegistrationCta`

## 6. Admin routes

### `/`
- 4-6 stat cards.
- Việc cần xử lý quan trọng hơn chart.
- Chart không được làm chậm first paint.

### `/courses`
- filter chương trình/trạng thái/thời gian;
- sĩ số;
- CRUD theo quyền;
- nút Quản lý học viên.

### `/courses/[classId]`
Màn hình trọng tâm:
- header lớp + status + sĩ số;
- quick actions;
- khu Học viên / Hồ sơ / Chứng từ / Lịch sử;
- DataTable + column visibility;
- dialog/drawer cho thao tác ngắn;
- vùng rộng cho hồ sơ dài.

### `/registrations`
- review hồ sơ;
- mặc định PENDING;
- duyệt/từ chối;
- lý do bắt buộc;
- thanh toán theo quyền;
- link sang lớp.

### `/users`
- quyền rõ;
- server vẫn kiểm tra;
- action nhạy cảm có confirm.

## 7. Landing page

Shared blocks, khác theme/content:
1. Hero.
2. Lợi ích/đối tượng.
3. Nội dung đào tạo.
4. Hình thực hành.
5. Lớp mở.
6. Học phí/đăng ký.
7. FAQ.
8. Related.
9. CTA.

`framer-motion` chỉ dùng animation nhẹ có ích. Không animate bảng/số liệu nặng trên mobile.

## 8. Form

Client:
- RHF quản lý state;
- Zod validation;
- browser validation cơ bản;
- giữ dữ liệu nếu lớp vừa đầy.

Server:
- validate lại;
- derive price/role/scope từ server;
- transaction cho sĩ số;
- không tin request client.

## 9. DataTable

TanStack chỉ quản lý UI state.

Dữ liệu lớn:
- filter/sort/page bằng query params;
- server query;
- không tải toàn bộ học viên xuống client.

Ví dụ:
```text
/courses?status=OPEN&courseType=...
/courses/abc?payment=PAID&query=nguyen
```

## 10. Mobile/a11y

Test:
- 360x800;
- 390x844;
- 768px;
- 1366/1440 desktop.

Yêu cầu:
- column priority/card view;
- sticky action hợp lý;
- vùng chạm khoảng 44px;
- label thật;
- focus visible;
- keyboard;
- dialog có title/description;
- aria-live cho lỗi/thông báo;
- không dùng màu làm tín hiệu duy nhất.

## 11. Definition of Done UI

- đúng quyền;
- loading/empty/error;
- desktop/mobile;
- keyboard;
- không layout shift lớn;
- không gửi dữ liệu thừa;
- screenshot/UAT;
- test nghiệp vụ không regress;
- package mới được ghi nhận.

## 12. Triển khai Phase 1 — 17/10/2026

Đã có cấu hình shadcn new-york/Radix, tokens và shared components tại `src/components/`. AdminShell hỗ trợ sidebar desktop, Sheet mobile, active navigation, skip link và Sonner. Palette public cũ được giữ; accent của admin/auth/portal được scope riêng.

`/login` dùng RHF/Zod và label/error/loading thật. `/courses` có bộ lọc chương trình/trạng thái/ngày, bảng sorting/pagination/column visibility, form create/edit và xác nhận xóa. `/courses/[classId]` dùng DataTable cho roster; giữ các action thanh toán, duyệt, chuyển lớp, chứng từ, Excel và lịch sử hiện hữu. AdminDialog dùng Radix và phục hồi focus theo logical trigger ID khi hàng được refresh.

TanStack Table dùng native v9 API, xem ADR-015. Pagination hiện là client-side trên dữ liệu cùng phạm vi baseline; server pagination/select DTO cho dữ liệu lớn vẫn thuộc Phase 5.

Skeleton table nằm sau server authorization, không đặt loading boundary bao quanh kiểm tra scope: giữ HTTP404 cho lớp không thuộc phạm vi. Có error state với retry cho admin.

Đã chạy 5 nhóm Playwright regression, 5 viewport (360/390/768/1366/1440), keyboard/focus trap/restore, cuộn bảng và role UI; đã xem screenshot desktop/mobile. Chưa thay thế UAT nghiệp vụ, screen-reader audit hoặc performance benchmark trước release.


## Hoàn thiện ô chọn/ngày giờ — 17/10/2026, Phase02d

Đã thay mọi select hiển thị ở bộ lọc và biểu mẫu bằng SelectField/SelectOption trên Radix Select theo style shadcn. Áp dụng ở lớp, kiểm tra đăng ký/danh sách học viên, thanh toán, chuyển lớp, thêm học viên, tài khoản/phân công và đăng ký công khai. Không còn import NativeSelect hoặc JSX `<select>` trong các màn hình; component native-select scaffold chưa dùng vẫn được giữ.

Bộ chung `src/components/forms/select-field.tsx`: cao44px, nền trắng, viền/radius/focus thống nhất, lựa chọn xanh + check, tên dài xuống dòng, menu có giới hạn theo viewport và cuộn. Giá trị rỗng dùng mã nội bộ chỉ trong Radix; hidden input gửi đúng giá trị nghiệp vụ. Dùng onValueChange trực tiếp; RHF dùng ControlledSelectField, không giả lập event native. Các lớp portal có ui-overlay để giữ màu xanh khi ra ngoài admin-shell; không đổi màu accent đỏ của landing page.

`DateTimePicker`: nhập dd/mm/yyyy (hoặc8 chữ số tự thêm `/`), HH:mm24giờ; lịch tiếng Việt, tuần bắt đầu thứ Hai, chọn nhanh tháng/năm, hôm nay/xóa. Ngày kèm giờ có hai bước Ngày/Giờ trong cùng bảng để vừa màn hình điện thoại. RHF dùng ControlledDateTimeField; FormData chỉ có ISO YYYY-MM-DD/HH:mm/YYYY-MM-DDTHH:mm như trước. Kiểm tra ngày nhuận/ngày không tồn tại, giữ bản nháp nhập sai và báo lỗi, không tự làm tròn sang ngày khác. Ngày sinh/hạn đăng ký và bộ lọc cũng dùng bộ chung. Không thay API/schema/luật sĩ số/học phí.

Keyboard, Escape/focus return, menu trong dialog và màn hình360/390/1440 đã kiểm tra qua trình duyệt. Screenshot cuối `.local/ui-controls` được rà trực quan, gồm menu dài, lịch và ngày-giờ gọn. Kết quả tại harness/build-log.md.


## Bố cục gọn và hồ sơ học viên — Phase02e,17/10/2026

Đã bỏ giới hạn1600px ở shell và giới hạn lồng1280/1152/1024px trên các trang quản trị. Nội dung dùng hết phần màn hình còn lại, padding16px/20px; giữ độ rộng có chủ đích của sidebar, bảng, dialog và khối chữ. Thanh trên và logo sidebar cao64px. Thanh trên hiển thị H1 của trang hiện tại; phần tiêu đề lớn/icon/breadcrumb lặp trong nội dung được thay bằng mô tả/nút thao tác gọn. Trang con có liên kết về mục cha ngay trên tiêu đề.

`AdminUI.PageHeader` giữ server boundary/props icon cho tương thích, render client PageHeading với dữ liệu serializable; không gửi function icon qua client boundary. PageHeading đăng ký title/parent vào dispatch-only PageTitleContext. AdminShell dùng metadata đúng pathname hoặc tên route dự phòng; không hiển thị tên học viên cũ sau khi điều hướng. Giữ server auth trước render. Khi đổi trang cuộn vùng nội dung về đầu; header vẫn ở ngoài vùng cuộn. CourseLinks đã theo cùng contract.

Danh sách `/students` có tìm tên/liên hệ/CCCD (vai trò được phép), lọc lớp và đối chiếu, số kết quả và phân trang20. Gửi tìm kiếm qua server action, không ghi PII lên query string. Table gọn trên desktop, card trên mobile, nút mở hồ sơ rõ ràng. Bộ lọc mobile được thu gọn; làm mới cạnh số kết quả. Trạng thái cần đối chiếu tính cả hồ sơ chung và snapshot đăng ký chưa đối chiếu trong phạm vi đang xem.

Trang chi tiết dùng hai cột thông tin/lịch sử ở màn hình rộng; mobile xếp dọc và có nút chuyển tới thông tin/lịch sử. Editor sử dụng container query để không ép hai cột input vào cột hẹp. Mã chứng chỉ/xác nhận/hóa đơn và trạng thái đặt theo từng lần đăng ký. Quyền sửa hồ sơ vẫn chỉ ADMIN, checkbox đối chiếu bắt buộc và logic OTP/tra cứu giữ nguyên.

Sửa thêm khoảng đệm vô tình do hidden controls nằm cạnh trigger trong các phần tử space-y: SelectField có một wrapper DOM duy nhất; DateTimePicker đặt khoảng cách lỗi riêng. Ô tìm và ô chọn cùng hàng đã được đo thẳng hàng/cùng chiều cao trong browser. Calendar truyền containerClassName cho bố cục tháng/năm để giữ responsive.

Nghiệm thu23/23 Playwright59.1s, tsc/lint/build/private-trace gate/HTTP PASS, domain student-directory và date-time PASS. Có đo padding/chiều rộng, một H1/thanh64px ở7 trang, viewport360/390/1440/1866/2560, dynamic title/back, query/pagination/role replay/mask và hồ sơ detail. Ảnh `.local/ui-layout` đã rà trực quan. Không dependency/migration/deploy mới.


## Phase02f — UI consistency and returning registration (17/10/2026)
- Main admin content/table headers/actions14px; supporting text13px/20px, shared badges13px. Stat card labels14px, primary count28px/32px. Tabular numerals align counts, dates and IDs; student CCCD uses normal UI font rather than small monospace.
- Tables share48px headings,12px row vertical padding/16px horizontal padding and middle alignment. Actions heading/cells right aligned and compact; common row buttons36px on desktop/44px on touch widths. White fields and outline surfaces; input/select/date44px,16px mobile/14px desktop.
- Registration requests CCCD first. Choose manual entry for new registrations or email OTP to retrieve previous details. No profile/existence signal before verification. After verification: a compact welcome, editable populated fields and next-step payment. Changing CCCD clears data; pending OTP survives reviewing class details; submission/upload states prevent identity changes. Step changes scroll to the form.
- Mobile welcome stacks so text gets the full width. Floating call hidden on registration; support telephone remains below the form.
- Existing shadcn/Radix stack retained. No new dependencies/schema changes. Verified locally; real SMTP/device/deployment gates remain.


## Phase02g — Hover, button affordance and larger admin type (17/10/2026)
User revised previous small/ghost treatment: management main text16px, supporting14px, page title20px desktop17px mobile, stat counts32px. Admin CSS font tokens apply to shells and portalled controls; public registration typography keeps prior values. Caption length variable has a13px public fallback and14px admin value, compatible with cn class merging.

All shared table cells inherit their row background, including sticky action cells; headers use the same opaque muted background. Hover/focus highlights the entire data row without geometric change. Row action variants have blue tinted surfaces/borders and stronger hover; delete variants stay rose. Icon buttons show accessible-label tooltips. Desktop row buttons40px/touch44px. Dashboard arrows replaced by labeled Xem lớp buttons. Group action intrinsic width is reserved; student action column widened and course status filter expanded after increasing type.

Verification: production build/type/private-artifact gate and lint pass. Full browser suite25/25 pass; final layout suite4/4 rerun after intrinsic width fix. Tests compare cell/header colors, before/after geometry, action bounds within cell, opaque sticky mobile cell, button border/background/type/title, actual fonts and no page overflow. Desktop/mobile screenshots reviewed.


## Phase02h — Nhịp cuộn trang cộng đồng
17/10/2026: giảm khoảng trống giữa hero và phần tiếp từ256px xuống64pxmobile/88pxdesktop; rút khoảng cách tiêu đề/thẻ. Thêm liên kết Xem tiếp cuộn mượt đến tình huống thường gặp, dùng khoảng bù96px sẵn ở root để tiêu đề không bị navbar80px che. Không can thiệp wheel/touch hoặc ép chuyển mục. Reveal nội dung sớm120px, chuyển động nhẹ hơn; tôn trọng reduced-motion và dừng tự đổi ảnh khi bật chế độ này. Kiểm thử390/1440,anchor/keyboard/wheel/hash/reduced-motion/no-overflow đạt2/2;build/lint đạt.
Các đề xuất cải thiện nội dung/chuyển đổi được trình bày cho người dùng; chưa đổi các tuyên bố,học phí hay chương trình đào tạo.


## Phase02i — Tách tài khoản, phân quyền và phân công lớp (17/10/2026)
- `/users`: tài khoản đăng nhập, tạo/sửa tài khoản, chọn một trong ba vai trò, đổi mật khẩu, khóa tài khoản; bảo vệ quản trị cuối cùng và tài khoản đang phụ trách lớp giữ nguyên.
- `/permissions`: thiết lập quyền theo nhóm bằng checkbox. ADMIN luôn toàn quyền, không thể sửa. CLASS_MANAGER và ACCOUNTANT bật/tắt trong phạm vi nghiệp vụ cũ; chưa mở cấp chéo vai trò hoặc tạo vai trò mới. Quyền phụ thuộc tự bật/tắt theo thao tác. Lưu có phiên bản để tránh ghi đè cấu hình từ tab khác.
- `/courses/assignments`: phân công quản lý lớp, truy cập từ Lớp học. Phạm vi lớp vẫn gắn managerId; phân quyền vai trò không tự mở rộng phạm vi dữ liệu.
- Cấu trúc RBAC: User → Role → Permission; RolePolicy/RolePermission lưu trong DB. Kiểm tra người dùng đang hoạt động và quyền hiện tại phía máy chủ; menu và nút chỉ hiển thị quyền được cấp. Thu hồi quyền có hiệu lực từ yêu cầu tiếp theo, bao gồm trang cũ còn mở, tài liệu định danh, điểm danh và Excel. Trường hợp không còn quyền có trang hướng dẫn riêng, không vòng lặp chuyển hướng.
- Thanh đầu quản trị80px để đủ chỗ cho tiêu đề và liên kết quay lại. Bỏ bốn thẻ điều hướng trùng sidebar trong Tổng quan; giữ thẻ thống kê.
- Bỏ cấu hình cú pháp chuyển khoản trên Settings. Cố định `{CLASS_CODE} {NAME}`; tên viết hoa, bỏ dấu. Bản ghi cũ giữ lại để tương thích, giao diện thanh toán dùng hàm cố định.
- Trang cộng đồng nới vùng nội dung tối đa1440px, giữ lề trên màn hình lớn để dễ đọc. Sửa hydration do reduced-motion khác giữa server/client; hiệu ứng xuất hiện lặp lại khi cuộn lên/xuống, tôn trọng tùy chọn giảm chuyển động.
- Tham chiếu mô hình RBAC: https://csrc.nist.gov/Projects/role-based-access-control/faqs . Không tuyên bố chứng nhận tuân thủ NIST; phiên bản hiện tại dùng ba vai trò cố định và phạm vi lớp độc lập.


## Phase02j — Không gian làm việc của lớp (17/10/2026)
Thay thế cách phân công của Phase02i: bỏ màn hình phân công riêng. ADMIN chọn **Người phụ trách** ngay trong biểu mẫu tạo/sửa lớp; lưu phân công và thông tin lớp trong cùng giao dịch, kiểm tra tài khoản active/CLASS_MANAGER và giữ nguyên bảo vệ phạm vi lớp. `/courses/assignments` cũ chỉ chuyển về danh sách lớp; không còn nút hay bảng phân công riêng.

`/courses` dùng các nhóm Tất cả / Sắp học / Đang học / Đã kết thúc, dựa lịch học và trạng thái kết thúc; không tự thay đổi trạng thái nhận đăng ký. Bảng hiển thị người phụ trách và số buổi. Thao tác chính **Mở lớp**, bên cạnh Sửa/Xóa theo quyền. Người chỉ có quyền buổi học vẫn có lối vào riêng. Nút tạo, tìm/lọc và bảng không còn bị chia bởi nút phân công riêng.

`/courses/[id]` là không gian chung: tóm tắt lịch, địa điểm, phụ trách, đăng ký và số liệu gọn; điều hướng **Học viên / Buổi học / Chứng từ / Thông tin**. Mục Thông tin cho phép sửa tại chỗ; kế toán xem thông tin, không sửa lớp. Mục Chứng từ có cột thanh toán, hóa đơn, số GCN/GXN đúng loại chứng nhận, bàn giao; lọc chờ thanh toán, chưa có hóa đơn/chứng nhận, chưa bàn giao. Kế toán và quản lý lớp giữ quyền từng trường; mở Cập nhật đi thẳng phần chứng từ. Tìm học viên tiếp tục gửi nội bộ, không đưa định danh vào URL.

Buổi học dùng hàng ngang trên desktop: tên/trạng thái/lịch/địa điểm/số đã điểm danh và cụm Điểm danh/Sửa. Màn hình nhỏ xếp gọn theo chiều dọc, cụm nút giữ ngang. Nhãn sidebar và nút rút gọn nhưng giữ tên truy cập rõ nghĩa cho nút chỉ biểu tượng.

Bảng quản trị có đường kẻ cột1px nhẹ, tiêu đề căn giữa, nút sắp xếp bỏ khoảng lệch trái. Ô nhập, lịch và select dùng nền trắng; bỏ nền xám do dark media của thiết bị áp vào giao diện sáng; trạng thái disabled vẫn phân biệt. Không thay đổi cỡ chữ lớn đã chốt.

Cảnh báo Reduced Motion đến từ useReducedMotion của Motion trong môi trường phát triển, không phải lỗi chức năng. Thay bằng useSyncExternalStore đọc matchMedia có server snapshot cố định, cập nhật khi thiết bị đổi tùy chọn và không phát cảnh báo. Vẫn giữ chế độ giảm chuyển động, dừng tự đổi ảnh và không tạo hydration mismatch. Tham chiếu: https://motion.dev/troubleshooting/reduced-motion-disabled .


## Phase02k — Bố cục 3/7 và giữ nguyên tổng quan lớp (17/10/2026)
- `/users` chuyển từ bảng và hộp thoại sang bố cục3/7: tìm/lọc/chọn tài khoản bên trái, tạo/sửa trực tiếp bên phải. Trên điện thoại xếp dọc. Giữ nguyên kiểm tra vai trò, tự khóa/hạ quyền, quản trị cuối cùng, phân công lớp và thu hồi phiên. Lưu xong xóa mật khẩu khỏi biểu mẫu; khóa lựa chọn khi đang lưu.
- `/permissions` chọn vai trò bên trái30%, thiết lập quyền bên phải70%; giữ draft theo vai trò, phụ thuộc quyền, giới hạn hai vai trò và ADMIN bảo vệ như cũ.
- Thay quyết định căn giữa tất cả tiêu đề ở phase trước: tiêu đề và nội dung cùng trục theo từng cột. Chữ/liên hệ/lịch căn trái, trạng thái/số lượng căn giữa, thao tác căn phải. Bỏ khoảng đệm icon của nút sắp xếp; không có đường kẻ dọc.
- Bộ lọc `/courses` dùng grid theo chiều rộng container thật: một hàng khi đủ chỗ, ba/hai cột ở vùng hẹp, một cột trên điện thoại; tìm kiếm không ép tất cả ô xuống dòng. Ô ngày190px trong hàng rộng để hiển thị đủ định dạng, giới hạn từ/đến tương ứng.
- Tổng quan lớp và bốn nút thuộc layout dùng chung. Chọn Học viên/Buổi học/Chứng từ/Thông tin chỉ đổi panel bên dưới; URL và Back/Forward giữ hoạt động. Giữ vị trí cuộn khi chuyển giữa các mục cùng lớp. Trang điểm danh chi tiết vẫn có khung tập trung riêng.
- Từng trang con vẫn kiểm tra quyền mới từ máy chủ, không dùng layout được cache thay cho kiểm tra quyền. Layout chỉ lấy số liệu tổng hợp tối thiểu trong phạm vi lớp, không đưa định danh lên phần chung. Khi không có quyền xem đăng ký, ẩn số liệu và các mục tương ứng.
- Bảng Học viên tập trung hồ sơ/liên hệ/trạng thái; thanh toán chuyển sang bảng Chứng từ cùng hóa đơn/GCN-GXN/bàn giao. Chứng từ không có nút xóa đăng ký, mở Cập nhật vào đúng phần chứng từ.
- Chỉ chạy các kiểm tra liên quan đến thay đổi theo yêu cầu người dùng; không chạy toàn bộ bộ kiểm thử.


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
