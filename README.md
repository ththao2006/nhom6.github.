# trueticket — Static event ticketing demo

Website tĩnh mô phỏng nền tảng bán vé sự kiện bằng HTML, CSS và JavaScript thuần, có thể xuất bản bằng GitHub Pages.

## Chạy thử
- Mở `index.html` bằng trình duyệt. Để trải nghiệm tốt nhất, nên dùng VS Code + extension Live Server.
- Website dùng `localStorage` để lưu tài khoản demo, sự kiện tự tạo, đơn hàng và vé trên cùng trình duyệt.

## Tài khoản demo
- Khách hàng: `customer@trueticket.demo`
- Ban tổ chức: `organizer@trueticket.demo`
- Quản trị viên: `admin@trueticket.demo`
- Mật khẩu demo: `trueticket123`

## Chức năng có trong bản demo
- Trang chủ phong cách tối, sự kiện nổi bật, nghệ sĩ.
- Tìm kiếm và lọc theo thể loại, địa điểm, miễn phí/có phí.
- Chi tiết sự kiện, chọn loại vé, sơ đồ ghế minh họa.
- Thanh toán mô phỏng thành công/thất bại.
- Vé điện tử và mã QR minh họa.
- Lưu sự kiện yêu thích.
- BTC tạo sự kiện và xem danh sách.
- Admin ẩn/hiện sự kiện.
- Thiết kế responsive cho desktop và điện thoại.

## Lưu ý
- Đây là đồ án frontend demo, không phải hệ thống bán vé thực tế.
- Không có backend, cơ sở dữ liệu dùng chung hoặc xác thực bảo mật.
- Mã QR chỉ để minh họa, không dùng để check-in.
- Ảnh và font từ các nguồn trực tuyến nên cần kết nối Internet để hiển thị đầy đủ.
- Khi triển khai GitHub Pages, giữ nguyên cấu trúc thư mục và bật Pages từ nhánh `main`, thư mục `/root`.

## Xuất bản GitHub Pages
1. Tạo repository GitHub tên `trueticket`.
2. Upload toàn bộ file/thư mục trong project này.
3. Vào Settings → Pages.
4. Chọn Deploy from a branch → `main` → `/ (root)` → Save.
5. Chờ GitHub Pages tạo đường dẫn website.
