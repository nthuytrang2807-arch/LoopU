# Loop.sv.vn — Nền tảng Giao dịch & Trao đổi Đồ Dùng Sinh Viên

Website thương mại điện tử tuần hoàn dành cho sinh viên đại học tại Việt Nam, cho phép tìm kiếm, mua bán, theo dõi đơn hàng nội khu ký túc xá và vận hành quản trị thông qua REST API đầy đủ.

## Tính năng chính

- **Khám phá & Lọc sản phẩm (`Khám phá`)**: Tìm kiếm theo từ khóa, lọc theo danh mục (`Giáo trình`, `Công nghệ`, `Nội thất KTX`, `Dụng cụ học tập`, `Di chuyển`), tình trạng, danh sách yêu thích, người bán và sắp xếp theo giá/đánh giá. Hỗ trợ chuyển đổi song ngữ `Tiếng Việt / English`.
- **Chi tiết sản phẩm & Đánh giá**: Xem thông tin tình trạng, mức tiết kiệm, lọc nhanh đồ cùng người bán, sao chép liên kết chia sẻ, và gửi đánh giá thực tế.
- **Giỏ hàng & Thanh toán (`Giỏ hàng`)**: Tính toán ngưỡng miễn phí giao nội khu KTX từ `300.000₫`, điều chỉnh số lượng và đặt đơn qua `COD`, `VietQR` hoặc `Ví Loop` (tự động trừ tồn kho trên máy chủ).
- **Theo dõi đơn hàng (`Đơn hàng`)**: Tra cứu mã đơn `LP-XXXX`, theo dõi 4 bước giao nhận, xác nhận nhận hàng hoặc hủy đơn đang chờ (tự động hoàn kho).
- **Đăng bán & Quản lý tin (`Đăng bán`)**: Đăng sản phẩm mới kèm bộ ảnh studio, xem trước thẻ hiển thị trực tiếp, cập nhật tồn kho hoặc gỡ tin.
- **Tài khoản sinh viên (`Tài khoản`)**: Đăng ký, đăng nhập, đặt lại mật khẩu (băm `scrypt` + token HMAC-SHA256), chỉnh sửa hồ sơ và quản lý danh sách đã lưu.
- **Bảng điều khiển quản trị (`Quản trị`)**: Bảo vệ bằng `ADMIN_PASSCODE` hoặc biểu mẫu thiết lập mật khẩu quản trị lần đầu, thống kê doanh thu theo danh mục, cập nhật trạng thái đơn hàng, quản lý tồn kho và xử lý hộp thư hỗ trợ sinh viên.

## Cài đặt & Chạy trên máy cá nhân

```bash
# 1. Cài đặt thư viện
npm install

# 2. Cấu hình biến môi trường (tùy chọn)
cp .env.example .env

# 3. Chạy môi trường phát triển (Express + Vite ở cổng 3000)
npm run dev
```

## Biến môi trường

Xem chi tiết trong `.env.example`:
- `ADMIN_PASSCODE`: Mật khẩu quản trị cho mục **Quản trị**. Nếu bỏ trống, giao diện sẽ hiển thị form thiết lập mật khẩu quản trị một lần khi truy cập lần đầu.
- `SESSION_SECRET`: Khóa ký HMAC-SHA256 cho phiên đăng nhập (tự động sinh ngẫu nhiên an toàn nếu chưa cấu hình).

## Triển khai Production

```bash
# Kiểm tra TypeScript
npm run lint

# Build frontend tối ưu vào thư mục dist/
npm run build

# Khởi chạy server production
NODE_ENV=production npm start
```
