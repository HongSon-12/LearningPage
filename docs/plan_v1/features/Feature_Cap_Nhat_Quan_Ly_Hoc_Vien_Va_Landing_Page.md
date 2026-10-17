# Cập nhật tính năng quản lý học viên và Landing Page

Ngày ghi nhận: 06/10/2026.

Trạng thái: Tài liệu yêu cầu để làm cơ sở triển khai. Các mục có nhãn **Đề xuất** hoặc **Cần chốt** chưa phải quy tắc nghiệp vụ đã thống nhất.

## 1. Phạm vi và tài liệu liên quan

Bổ sung và điều chỉnh chức năng quản lý lớp, học viên, đăng ký, phân quyền, Landing Page và dữ liệu Excel trên hệ thống đào tạo Trung tâm Cấp cứu 115.

Tài liệu này ghi nhận yêu cầu mới, cùng các điểm cần cập nhật so với tài liệu trước:

- [Quy trình quản lý CME](../business_logic/CME_Quy_Trinh_Quan_Ly.md).
- [Đối tượng học viên](../business_logic/Doi_Tuong_Hoc_Vien.md).
- [Form đăng ký và Upload](./Feature_Form_Va_Upload.md).
- [Tra cứu](./Feature_Tra_Cuu.md).
- [Email tự động](./Feature_Gui_Email_Tu_Dong.md).
- [Cấu trúc dữ liệu](../architecture/Database_Schema.md).
- [Giao diện quản trị](../ui_ux/admin_ui_spec.md) và [giao diện học viên](../ui_ux/user_ui_spec.md).

Trong tài liệu, **chương trình đào tạo** là nhóm nội dung như Sơ cấp cứu Cộng đồng, CME ABCDE hoặc Hồi sinh tim phổi; **khóa/lớp** là một đợt tổ chức cụ thể có mã, lịch học và sĩ số. Hiện hệ thống có `courseType`, `courseBatch` và `Class`; cần thống nhất định nghĩa “cùng khóa học” trước khi xây dựng điều kiện chuyển lớp.

Đường dẫn đã cập nhật: `/` chuyển vào `/admin`; `/hocsocapcuu` là Landing Page Sơ cấp cứu hiện tại. Các trang `/courses`, `/register/[classId]` và `/search` phục vụ chọn lớp, đăng ký và tra cứu.

## 2. Chức năng chuyển lớp

### Yêu cầu

- Cho phép chuyển học viên từ lớp này sang lớp khác.
- Từ danh sách hoặc chi tiết hồ sơ học viên, chọn lớp đích và thực hiện chuyển lớp.
- Cập nhật đồng bộ thông tin học viên, lớp đang đăng ký, trạng thái đăng ký và danh sách học viên của lớp mới.
- Danh sách và sĩ số lớp cũ phải được cập nhật tương ứng; học viên không xuất hiện như một đăng ký đang hoạt động ở cả hai lớp do thao tác chuyển.
- Cho phép tra cứu và chuyển qua lại giữa các lớp thuộc cùng khóa học.

### Đề xuất xử lý

- Kiểm tra lớp đích, điều kiện tiếp nhận và số chỗ còn lại trước khi chuyển.
- Thực hiện thay đổi lớp và cập nhật sĩ số trong cùng một giao dịch dữ liệu; nếu thất bại, giữ nguyên hồ sơ ở lớp cũ.
- Giữ thông tin cá nhân, hồ sơ đính kèm và lịch sử thanh toán; không mặc định đặt lại trạng thái đã duyệt hoặc đã thanh toán.
- Lưu lịch sử chuyển gồm lớp cũ, lớp mới, người thực hiện, thời điểm, lý do và trạng thái trước/sau khi chuyển.
- Nếu hồ sơ cần duyệt lại theo điều kiện lớp mới, hiển thị rõ việc thay đổi trạng thái trước khi lưu.

**Cần chốt:** Phạm vi “cùng khóa học”; có cho chuyển khác chương trình không; cách xử lý lớp đã kết thúc, học phí chênh lệch, hóa đơn và GCN/GXN đã phát hành.

## 3. Đăng ký thủ công / đăng ký vét

### Yêu cầu

- Bổ sung chức năng tạo đăng ký học viên từ giao diện quản trị, bao gồm đăng ký thủ công và đăng ký vét.
- Thông tin cần cung cấp tương tự quy trình đăng ký trực tuyến của chương trình được chọn.
- Bao gồm thông tin cá nhân, liên hệ, đơn vị/tổ chức và các hồ sơ minh chứng tương ứng; trường bắt buộc phụ thuộc đối tượng học viên và loại chương trình theo tài liệu hiện có.
- Sau khi lưu thành công, học viên xuất hiện trong danh sách lớp, danh sách đăng ký và số lượng đăng ký tương ứng.
- Cho phép theo dõi riêng hồ sơ nhập thủ công và đăng ký vét.

### Đề xuất xử lý

- Dùng chung quy tắc kiểm tra thông tin với đăng ký trực tuyến để tránh hai bộ tiêu chuẩn khác nhau.
- Ghi nhận hình thức đăng ký (trực tuyến, thủ công, vét), người nhập, thời điểm và ghi chú.
- Kiểm tra trùng hồ sơ trong lớp trước khi tạo; không coi mọi đăng ký dùng chung số điện thoại là cùng một người.
- Áp dụng cùng cơ chế kiểm soát sĩ số với đăng ký trực tuyến.
- Nhập trạng thái hồ sơ và thanh toán theo quyền được cấp; đăng ký thủ công/vét không tự động có nghĩa là đã duyệt hoặc đã thanh toán.

**Cần chốt:** Đăng ký vét có được phép sau hạn đăng ký hoặc khi lớp đã đầy không; ai có quyền ngoại lệ; có gửi email tự động cho đăng ký thủ công/vét không. Chưa mặc định cho phép vượt sĩ số.

## 4. Quản lý học viên theo khóa học / lớp

### Yêu cầu

- Có danh sách học viên theo từng khóa/lớp và bộ lọc theo chương trình, khóa, lớp.
- Tra cứu học viên trong phạm vi khóa/lớp và xem hồ sơ đăng ký liên quan.
- Theo dõi trạng thái hồ sơ, thanh toán, GCN/GXN và hóa đơn trên danh sách hoặc trang chi tiết.
- Thực hiện chuyển học viên qua lại giữa các lớp thuộc cùng khóa học từ màn hình quản lý.
- Danh sách, kết quả tra cứu và sĩ số phải phản ánh lớp mới sau khi chuyển.

### Đề xuất giao diện

- Tìm theo họ tên, số điện thoại, CCCD hoặc mã hồ sơ.
- Bộ lọc trạng thái duyệt, thanh toán, hình thức đăng ký và trạng thái gửi GCN.
- Hiển thị số học viên đã ghi nhận / sức chứa của lớp, kèm đường dẫn tới hồ sơ và lịch sử chuyển lớp.
- Dùng một quy tắc đếm thống nhất giữa website, danh sách quản trị và báo cáo.

## 5. Hiển thị các lớp / khóa học liên quan

### Yêu cầu

- Trên Landing Page của mỗi lớp/chương trình, bổ sung khu vực giới thiệu các lớp hoặc khóa học khác đang hoặc sắp mở.
- Học viên có thể xem thông tin và chuyển tới trang giới thiệu, lịch học hoặc đăng ký của lựa chọn phù hợp.

### Đề xuất hiển thị

- Mỗi thẻ gồm tên chương trình/lớp, lịch khai giảng nếu đã có, học phí, trạng thái và nút xem chi tiết/đăng ký.
- Không lặp lại lớp đang được xem; ưu tiên các lớp cùng chương trình hoặc phù hợp đối tượng học viên.
- Lớp sắp mở nhưng chưa nhận đăng ký chỉ hiển thị thông tin; chỉ mở nút đăng ký khi đáp ứng điều kiện tiếp nhận.
- Lấy dữ liệu từ hệ thống quản lý lớp để lịch học, học phí và tình trạng còn chỗ được đồng bộ.

**Cần chốt:** Tiêu chí “sắp mở”, cách sắp xếp lớp liên quan và có cho phép quản trị chọn thủ công lớp được giới thiệu không. Trạng thái lớp hiện tại chỉ có `OPEN`, `FULL`, `DONE`, nên chưa thể mặc định suy ra “sắp mở” từ một trạng thái riêng.

## 6. Tài khoản và phân quyền

### Yêu cầu

- Bổ sung tài khoản dành cho **Quản lý lớp** và **Kế toán**, bên cạnh tài khoản Quản trị hiện có.
- Phân quyền theo chức năng và phạm vi dữ liệu phù hợp từng vai trò.
- Kiểm tra quyền tại máy chủ cho thao tác đọc/ghi dữ liệu; việc ẩn nút trên giao diện không thay thế kiểm tra quyền.

### Ma trận quyền đề xuất

| Nhóm chức năng | Quản trị | Quản lý lớp | Kế toán |
| --- | --- | --- | --- |
| Tài khoản, phân quyền, cấu hình chung | Quản lý | Không | Không |
| Lớp, danh sách học viên, hồ sơ | Toàn bộ | Trong phạm vi được giao | Xem thông tin phục vụ đối soát |
| Đăng ký thủ công/vét, chuyển lớp, duyệt/từ chối hồ sơ | Có | Trong phạm vi được giao | Không mặc định cấp quyền |
| Đối soát và cập nhật thanh toán | Có | Xem | Có |
| Cập nhật mã hóa đơn điện tử | Có | Xem | Có |
| Cập nhật GCN/GXN và trạng thái gửi GCN | Có | Trong phạm vi được giao | Xem nếu cần nghiệp vụ |
| Import/Export Excel | Toàn bộ | Dữ liệu và trường được cấp quyền | Dữ liệu và trường được cấp quyền |

**Cần chốt:** Ma trận quyền chính thức; Quản lý lớp phụ trách lớp được giao hay toàn bộ chương trình; tài khoản có được kiêm nhiều vai trò không. Các quyền trong bảng là phương án ban đầu để trao đổi.

## 7. Tạo trước các đường dẫn Landing Page, chưa triển khai giao diện và nội dung


### Yêu cầu

- Mỗi Landing Page của từng lớp/chương trình có concept riêng, phù hợp nội dung đào tạo và đặc điểm đối tượng học viên.
- Có thể khác nhau về bố cục, hình ảnh, màu sắc, thông điệp, nội dung giới thiệu và nút kêu gọi đăng ký.
- Vẫn giữ nhận diện Trung tâm Cấp cứu 115, thông tin lớp chính xác và kết nối với luồng đăng ký tập trung.
- Các trang hỗ trợ điện thoại và có khu vực lớp/khóa học liên quan theo mục 5.

### Hướng concept đề xuất

| Chương trình | Hướng nội dung và hình ảnh |
| --- | --- |
| Sơ cấp cứu Cộng đồng | Dễ hiểu, tình huống thực tế, gia đình và nơi làm việc, thực hành kỹ năng |
| CME ABCDE | Chuyên môn y khoa, quy trình đánh giá và xử trí ban đầu, thông tin đào tạo liên tục |
| Lái xe vận chuyển cấp cứu | Tình huống vận chuyển, an toàn và xử trí ban đầu trên xe cấp cứu |
| Hồi sinh tim phổi nâng cao | Chuyên sâu, phối hợp đội cấp cứu, kỹ năng thực hành nâng cao |
| Hồi sinh tim phổi cơ bản | Các kỹ năng nền tảng, hình ảnh thực hành và đối tượng phù hợp |

**Cần chốt:** Một Landing Page riêng cho từng lớp cụ thể hay một concept theo chương trình dùng cho nhiều đợt lớp; đường dẫn và cách quản lý nội dung các trang mới. `/hocsocapcuu` tiếp tục là đường dẫn trang Sơ cấp cứu hiện tại.

## 8. Ghi nhận số lượng đăng ký khi lớp gần đầy

### Quy tắc yêu cầu

1. Học viên chọn lớp và hoàn tất thông tin ở Bước 2.
2. Khi bấm chuyển sang **Bước 3 – Thanh toán**, máy chủ kiểm tra thông tin và số chỗ còn lại.
3. Nếu còn chỗ, lưu đăng ký thành công và ghi nhận học viên là **01 học viên** của lớp ngay tại thời điểm này, dù chưa hoàn tất thanh toán.
4. Chỉ sau khi lưu thành công mới cho học viên vào Bước 3 và hiển thị thông tin thanh toán.
5. Số lượng trên website và hệ thống quản trị cập nhật theo đăng ký đã ghi nhận này.
6. Nếu không còn chỗ, không tạo thêm đăng ký chiếm chỗ và không cho tiếp tục sang bước thanh toán; hiển thị phản hồi phù hợp.

Thông báo lớp đầy: **“Số lượng học viên đã đủ. Vui lòng kiểm tra lại hoặc chọn lớp khác.”**

Thông báo lỗi xử lý khác: **“Lỗi cần kiểm tra lại. Vui lòng thử lại hoặc liên hệ bộ phận quản lý lớp.”** Không báo lớp đầy khi nguyên nhân thực tế là lỗi hệ thống.

### Tình huống kiểm tra bắt buộc

- Lớp có 39/40 học viên, nhiều người đồng thời chuyển từ Bước 2 sang Bước 3: chỉ một đăng ký mới được ghi nhận; số lượng tối đa là 40/40.
- Các yêu cầu còn lại nhận thông báo lớp đầy và giữ thông tin đã nhập để có thể chọn lớp khác.
- Bấm nhiều lần hoặc gửi lại cùng yêu cầu do mất kết nối không tạo nhiều đăng ký và không tính nhiều chỗ cho cùng một thao tác.
- Không tính thêm một học viên lần nữa khi tải biên lai hoặc bấm hoàn tất ở Bước 3.
- Đăng ký trực tuyến, thủ công/vét, import tạo mới và chuyển lớp phải phối hợp cùng cơ chế kiểm soát sĩ số.

### Điểm cần điều chỉnh

- Tài liệu giao diện cũ mô tả tạo đăng ký khi hoàn tất Bước 3; cần chuyển thời điểm tạo đăng ký sang lúc Bước 2 được xác nhận thành công.
- Mã nguồn hiện đã tạo đăng ký trước Bước 3, nhưng kiểm tra số chỗ và tạo hồ sơ là hai thao tác tách rời; cần bổ sung xử lý đồng thời an toàn tại cơ sở dữ liệu (giao dịch với khóa hoặc cơ chế tương đương).
- Cập nhật số lượng trên giao diện chỉ phản ánh kết quả; máy chủ là nơi quyết định có nhận đăng ký hay không.
- Tách việc ghi nhận chỗ khỏi xác nhận đã thanh toán và duyệt hồ sơ; học viên vào Bước 3 vẫn có thể đang chờ thanh toán/chờ duyệt.
- Đối chiếu thời điểm gửi email với tài liệu Form B; email xác nhận tiếp nhận thông tin không được khẳng định đã nhận biên lai khi học viên chưa tải lên.

**Cần chốt:** Khi nào trả lại chỗ cho hồ sơ bị từ chối, hủy hoặc bỏ dở thanh toán; có thời hạn giữ chỗ không. Chưa mặc định áp dụng tự động hết hạn. Quy tắc đếm hiện tại theo trạng thái thanh toán cần được thống nhất với trạng thái hồ sơ và áp dụng ở mọi màn hình.

## 9. Bổ sung lý do từ chối

### Yêu cầu

- Bổ sung trường **Lý do từ chối** khi từ chối hồ sơ/đăng ký/học viên.
- Lưu lý do cùng thao tác từ chối để phục vụ theo dõi và quản lý.
- Cho phép xem lý do tại hồ sơ học viên và danh sách quản lý phù hợp.

### Đề xuất xử lý

- Bắt buộc nhập lý do có nội dung trước khi xác nhận từ chối.
- Lưu người thực hiện, thời điểm và lịch sử thay đổi trạng thái.
- Không xóa lý do cũ khỏi lịch sử khi hồ sơ được xét duyệt lại.
- Phân biệt từ chối hồ sơ với hủy thanh toán; không tự động đổi trạng thái tài chính chỉ vì từ chối hồ sơ.

**Cần chốt:** Lý do có hiển thị cho học viên hoặc gửi qua email không; việc từ chối có giải phóng chỗ ngay không.

## 10. Import/Export dữ liệu Excel

### Yêu cầu

- Bổ sung chức năng Import/Export file Excel để quản lý và cập nhật thông tin học viên.
- Cho phép thao tác theo khóa/lớp và phạm vi quyền tài khoản.
- Bổ sung các trường dữ liệu sau vào hồ sơ, giao diện quản lý và file Excel:

| Trường | Ý nghĩa | Kiểu dữ liệu đề xuất |
| --- | --- | --- |
| Đã gửi GCN trực tiếp | Ghi nhận GCN đã được giao trực tiếp | Có/Không |
| Đã gửi GCN qua bưu điện | Ghi nhận GCN đã được gửi qua bưu điện | Có/Không |
| Số GXN | Số Giấy xác nhận | Văn bản |
| Mã hóa đơn điện tử | Mã phục vụ tra cứu hóa đơn | Văn bản |

GCN: Giấy chứng nhận. GXN: Giấy xác nhận. Hai trường gửi GCN ghi nhận phương thức đã thực hiện; không đồng nghĩa với việc đã cấp chứng nhận hoặc bưu điện đã giao thành công.

### Đề xuất Import

- Có file mẫu `.xlsx`, hướng dẫn trường bắt buộc và cách nhập ngày, trạng thái, mã lớp.
- Cho phép tạo mới hoặc cập nhật; xác định rõ chế độ trước khi thực hiện.
- Dùng mã hồ sơ đăng ký để đối chiếu khi cập nhật; không dùng riêng họ tên làm khóa nhận diện.
- Xem trước dữ liệu, báo lỗi theo dòng/cột, chỉ ghi dữ liệu hợp lệ theo chính sách đã chọn.
- Không dùng import để vượt quyền, vượt sĩ số hoặc đổi lớp mà bỏ qua quy trình chuyển lớp.
- Có báo cáo số dòng tạo mới, cập nhật, lỗi và lý do; không âm thầm ghi đè hoặc bỏ dòng lỗi.

### Đề xuất Export

- Xuất `.xlsx` theo bộ lọc khóa/lớp và quyền xem dữ liệu.
- Có mã hồ sơ, mã lớp, thông tin học viên, trạng thái hồ sơ/thanh toán và các trường hậu kỳ được cấp quyền.
- Giữ số điện thoại, CCCD, Số GXN và mã hóa đơn dưới dạng văn bản để không mất số 0 đầu.
- Cho phép xuất file có thể nhập lại để cập nhật, với định danh và tên cột ổn định.

### Đối chiếu dữ liệu hiện có

- `invoiceCode` đã lưu mã tra cứu hóa đơn: ưu tiên dùng lại cho **Mã hóa đơn điện tử**, không tạo trường trùng ý nghĩa.
- `certificateCode` đang dùng cho số chứng chỉ; cần phân biệt với **Số GXN**, tránh ghi đè dữ liệu chứng chỉ/GCN hiện có.
- Đề xuất bổ sung riêng các trường trạng thái gửi GCN, Số GXN, lý do từ chối, hình thức đăng ký và lịch sử chuyển lớp; tên trường kỹ thuật sẽ thống nhất khi thiết kế dữ liệu.

**Cần chốt:** Hai trường gửi GCN có thể cùng được đánh dấu không; có cần ngày gửi, người gửi hoặc mã bưu gửi không; khóa nhận diện import tạo mới và chính sách xử lý file có cả dòng đúng lẫn dòng lỗi.

## 11. Tiêu chí nghiệm thu tổng hợp

- Chuyển lớp cập nhật đồng bộ hồ sơ, danh sách và sĩ số lớp cũ/mới; có lịch sử và không chuyển thành công một phần.
- Đăng ký thủ công/vét cung cấp thông tin theo cùng chương trình như đăng ký trực tuyến và hiển thị trong quản lý lớp.
- Tra cứu, lọc và quản lý học viên theo khóa/lớp; quyền thao tác đúng vai trò và phạm vi dữ liệu.
- Landing Page có concept phù hợp và giới thiệu các lớp/khóa học liên quan đang hoặc sắp mở.
- Tình huống 39/40 với nhiều yêu cầu đồng thời không vượt 40; ghi nhận chỗ ngay trước khi vào Bước 3.
- Từ chối hồ sơ lưu được lý do và cho phép tra cứu lịch sử.
- Import/Export Excel hỗ trợ các trường mới, đối chiếu đúng hồ sơ, không mất số 0 đầu và không vượt quyền/sĩ số.
- Tài liệu quy trình, dữ liệu, email và giao diện được cập nhật đồng bộ khi các quy tắc còn mở được thống nhất và tính năng được triển khai.


## 12. Thiết lập đã triển khai (06/10/2026)

- Đã bổ sung migration cho vai trò, phiên đăng nhập, phân công quản lý lớp, hình thức đăng ký, lý do từ chối, Số GXN, trạng thái gửi GCN và lịch sử thay đổi.
- Đăng nhập dùng mật khẩu bcrypt và phiên ngẫu nhiên lưu trong cookie HttpOnly; tài khoản bị khóa không tiếp tục sử dụng phiên cũ. Có giới hạn đăng nhập sai.
- Quản lý lớp chỉ xem/thao tác lớp được giao; Kế toán được đối soát thanh toán và cập nhật mã hóa đơn; Quản trị quản lý tài khoản và phân công lớp.
- Có đăng ký thủ công và vét. Đăng ký vét được tiếp nhận sau hạn đăng ký khi lớp vẫn OPEN và còn chỗ; không vượt sĩ số.
- Chuyển lớp trong cùng `courseType`, cùng học phí, giữa các lớp được cấp quyền. Hồ sơ đã có hóa đơn/GCN/GXN hoặc lớp cũ đã kết thúc cần xử lý riêng trước khi chuyển. Trạng thái hồ sơ và thanh toán được giữ nguyên; lịch sử ghi mã lớp cũ/mới, lý do, người thao tác và thời điểm.
- Quy tắc đếm: hồ sơ có trạng thái khác REJECTED và thanh toán khác CANCELLED chiếm một chỗ. Từ chối/hủy giải phóng chỗ; kích hoạt lại phải kiểm tra sĩ số. Chưa tự động hết hạn giữ chỗ khi chưa thanh toán.
- Kiểm tra chỗ và tạo hồ sơ trước Bước 3 chạy trong giao dịch có khóa PostgreSQL dùng chung cho mọi thao tác ảnh hưởng sĩ số. Mỗi yêu cầu đăng ký trực tuyến có định danh để gửi lại không tạo trùng.
- Sĩ số trong dữ liệu thay đổi ngay khi giao dịch lưu thành công; trang học viên đang mở làm mới mỗi 15 giây khi tab đang hiển thị. Kiểm tra tại máy chủ luôn quyết định việc nhận hồ sơ.
- Có Landing Page riêng theo concept chương trình ở `/dao-tao/[slug]`, trang lớp ở `/lop/[classId]`, và danh sách lớp liên quan. Trang `/hocsocapcuu` giữ nội dung Sơ cấp cứu hiện tại.
- “Sắp mở” hiện hiển thị các lớp OPEN có lịch khai giảng từ hôm nay trở đi; chưa bổ sung trạng thái tuyển sinh dự kiến riêng.
- Excel dùng `.xlsx`, tối đa 500 dòng/5 MB. Có file mẫu theo vai trò, bước kiểm tra trước khi xác nhận và lưu toàn bộ file trong một giao dịch. Khi một dòng không hợp lệ, toàn bộ file không được lưu.
- Import tạo mới yêu cầu mã lớp và thông tin theo chương trình; mặc định MANUAL hoặc chọn LATE. Import cập nhật đối chiếu Mã hồ sơ, không chuyển lớp qua Excel; ô trống giữ dữ liệu cũ. Mọi sửa đổi đều bị kiểm tra quyền.
- Hai trường gửi GCN là hai cờ độc lập; Số GXN được lưu riêng, không ghi đè `certificateCode`. Mã hóa đơn dùng lại `invoiceCode`.
- Lý do từ chối bắt buộc, được lưu trong hồ sơ và lịch sử; chưa tự động gửi lý do qua email cho học viên.

### Vận hành và kiểm tra

- Đăng nhập: `/login`.
- Quản lý học viên, chuyển lớp, đăng ký thủ công/vét, Excel: `/registrations`.
- Tạo tài khoản và phân công Quản lý lớp: `/users` (Quản trị).
- Migration: `pnpm exec prisma migrate deploy`, sau đó `pnpm exec prisma generate`.
- Khởi tạo quản trị khi chưa có tài khoản thật: `pnpm setup:admin`. Mật khẩu mạnh được lưu ở `ttcc-app/.local/admin-access.txt`, ngoài Git. Không đặt lại mật khẩu tài khoản thật đã có.
- Kiểm thử dữ liệu: `pnpm test:management` tạo schema kiểm thử riêng, tự dọn sau khi kết thúc.
- Kiểm thử HTTP: `pnpm test:http` dùng máy chủ dev; đọc thông tin truy cập riêng và tạo tài khoản kiểm thử tạm, không gửi email.
- Đã kiểm tra 12 yêu cầu đồng thời ở mức 39/40 chỉ nhận thêm một người; gửi lại không tạo trùng; chuyển lớp có lịch sử; import lỗi rollback; Excel giữ số 0 đầu; quyền và khóa tài khoản hoạt động.
- Kiểm tra TypeScript, ESLint cho mã mới và build production đã đạt. Công cụ kiểm tra trình duyệt đang lỗi môi trường, nên chưa xác nhận trực quan bố cục bằng trình duyệt tự động.


## 13. Điều chỉnh trang quản trị và luồng thao tác

- `/`: Hệ thống Quản trị (yêu cầu đăng nhập); `/login`: đăng nhập.
- `/courses`: danh sách lớp, nút **Quản lý học viên** trong cột thao tác.
- `/courses/[classId]`: quản lý riêng học viên của lớp; tra cứu, chuyển lớp theo quyền, đăng ký thủ công/vét, thanh toán, chứng nhận, GXN, hóa đơn và Import/Export Excel. Import tại trang lớp chỉ chấp nhận mã lớp tương ứng.
- `/registrations`: kiểm tra thông tin và tài liệu đăng ký; mặc định hồ sơ chờ duyệt, có duyệt/từ chối và lý do từ chối. Không chứa thao tác nhập Excel, thêm học viên, chuyển lớp hay cấp chứng từ. Có liên kết sang trang quản lý học viên của lớp.
- `/course-links`: **Link khóa học**, chỉ hiển thị link Landing Page của 5 khóa học chính (không liệt kê từng lớp), link trực tiếp/Facebook/Zalo/Fanpage, nút sao chép và mở trang. Đường dẫn được tạo theo địa chỉ website hiện tại.
- `/settings`, `/users`: cài đặt và tài khoản theo quyền.
- `/hocsocapcuu/courses`: lịch khai giảng công khai, thay đường dẫn `/courses` cũ để tránh trùng trang quản trị. `/hocsocapcuu`, `/dao-tao/[slug]`, `/lop/[classId]` vẫn là các trang công khai.
- Đường dẫn trang `/admin` và `/admin/...` cũ tự chuyển sang đường dẫn mới.
