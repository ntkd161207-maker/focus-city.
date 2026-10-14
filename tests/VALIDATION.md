# Kết quả kiểm tra nền tảng City Builder

Đã chạy trong môi trường đám mây ngày 14/10/2026 với Node.js 24.19.0, Playwright 1.62.1 và Chromium 154.0.8037.57.

## Dữ liệu: 3/3 bài kiểm tra đạt

Lệnh: `npm test`.

- Bản đồ đủ 400 ô độc lập, biên hợp lệ và phép chuyển đổi tọa độ khứ hồi đúng cho toàn bộ ô.
- 21 nhà và 32 cây có mã riêng, tọa độ và footprint hợp lệ, không chiếm ô đường.
- Toàn bộ 68 ô đường thuộc một mạng liên thông.

## Trình duyệt: 9/9 nhóm kiểm tra đạt

Chạy server bằng `npm start`, sau đó chạy:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

1. Khởi tạo giao diện desktop, tải tài nguyên, số lượng công trình.
2. Zoom bằng nút và bánh xe, giới hạn 30–250%, trở về toàn cảnh.
3. Lưới ô thay đổi hình ảnh canvas và trạng thái nút.
4. Danh sách công trình, chi tiết tọa độ và chọn trực tiếp trên sprite.
5. Kéo dịch công trình đúng khoảng cách màn hình; kéo không bị hiểu thành click.
6. Bàn phím: di chuyển, zoom, Home, Escape.
7. Resize sang tablet 900×700, không tràn ngang.
8. Mobile 390×844/DPR 2: không tràn ngang, nút cảm ứng, pinch hai ngón, kéo một ngón, chọn công trình.
9. Không có lỗi JavaScript, HTTP hoặc tải tài nguyên trong các tương tác trên.

Ảnh chụp được tạo tại `test-results/desktop.png` và `test-results/mobile.png` (thư mục đầu ra không đưa vào Git).

Playwright có sẵn trong môi trường kiểm tra này. Trên máy khác, có thể cài riêng công cụ kiểm tra tùy chọn bằng `npm install --no-save --package-lock=false playwright@1.62.1`, sau đó `npx playwright install chromium` và `npm run test:browser`. Nếu dùng Chromium hệ thống, đặt `CHROMIUM_PATH` thành đường dẫn binary. Công cụ này không cần để chạy ứng dụng.

## Các kiểm tra bổ sung

- `git diff --check` và kiểm tra cú pháp JavaScript đạt.
- HTTP trả 200 cho trang chính và module JavaScript, 403 cho `.git/config`, 404 cho đường dẫn không tồn tại.
- Đã xem ảnh chụp desktop và mobile để kiểm tra phối cảnh, đồ họa và bố cục.

Chưa kiểm tra trên Safari/Firefox hoặc thiết bị cảm ứng thật. Chưa có chức năng đặt/xóa/lưu công trình; chưa thêm Pomodoro, kinh tế hay quản lý đô thị.
