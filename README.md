# Focus City 2.1

Nền tảng City Builder theo chiến lược **CITY FIRST**: phát triển thành phố trước, tích hợp Pomodoro và các chức năng học tập sau.

## Chạy dự án

Cần Node.js 20 trở lên. Không có thư viện bên ngoài, không cần `npm install` hay bước build.

```sh
cd /workspace/focus-city.
npm start
```

Mở `http://localhost:8000` trên máy chạy server. Nếu dùng môi trường đám mây có hỗ trợ chuyển tiếp cổng, chuyển tiếp cổng **8000** và mở địa chỉ được giao diện môi trường cung cấp. Không mở trực tiếp `index.html` bằng `file://`, vì trình duyệt cần HTTP để tải JavaScript modules.

Đổi cổng khi cần: `PORT=8080 npm start`. Máy chủ phát triển mặc định lắng nghe trên `0.0.0.0`; chỉ dùng cho phát triển. Để chạy riêng trên máy cá nhân: `HOST=127.0.0.1 npm start`.

## Xem trên Windows

1. Cài **Node.js bản LTS** từ https://nodejs.org (Node.js 20 trở lên).
2. Tải mã nguồn từ trang GitHub của repository: **Code → Download ZIP**, rồi giải nén. Nếu GitHub vẫn chỉ có `README.md`, mã nguồn Phase 1 chưa được đẩy lên nhánh đó: dùng gói ZIP mã nguồn được cung cấp trong cuộc trò chuyện hoặc đưa mã nguồn lên GitHub trước khi tải.
3. Trong thư mục có `index.html` và `package.json`, nhấp đúp **Start-City.cmd**. Giữ cửa sổ này mở.
4. Khi thấy `Focus City listening on port 8000`, mở **http://localhost:8000** bằng Chrome hoặc Edge trên cùng máy Windows.

Không cần `npm install`. Nếu muốn dùng terminal, mở thư mục dự án trong PowerShell và chạy:

```powershell
node scripts/serve.mjs
```

Lệnh `node` này cũng tránh lỗi PowerShell chặn `npm.ps1`. Nếu cổng 8000 đang bận:

```powershell
$env:PORT = '8080'
node scripts/serve.mjs
```

Sau đó mở `http://localhost:8080`. Dừng server bằng `Ctrl+C`.

Nếu dùng Git thay vì ZIP, đặt tên thư mục đích không có dấu chấm cuối để tương thích Windows:

```powershell
git clone https://github.com/ntkd161207-maker/focus-city. focus-city
cd focus-city
node scripts/serve.mjs
```

### Vì sao localhost trong Codex không mở được trên máy cá nhân?

`localhost` luôn là máy đang chạy trình duyệt. Máy chủ chạy trong đám mây không tự xuất hiện tại `localhost` trên Windows. Chỉ có thể xem từ máy cá nhân qua một URL chuyển tiếp cổng do nền tảng cung cấp, hoặc bằng cách tải dự án về và chạy server trên Windows. Phiên Codex dùng để kiểm tra hiện không cung cấp công cụ mở Preview/chuyển tiếp cổng; ảnh chụp thực tế nằm trong `test-results/` sau khi chạy kiểm tra trình duyệt.

### Có thể nhấp đúp index.html không?

Không phải cách chạy được hỗ trợ. Trang sử dụng `<script type="module">`, các lệnh `import` và tải SVG; cần phục vụ bằng HTTP. Nhấp đúp `index.html` dùng giao thức `file://` và có thể chỉ hiện khung giao diện, không khởi tạo thành phố. Trong lần kiểm tra hiện tại, Chromium của môi trường chặn truy cập `file://` bằng `ERR_BLOCKED_BY_ADMINISTRATOR`; kiểm tra chạy đầy đủ ứng dụng qua HTTP đã đạt.

## Thao tác

- Kéo bằng chuột hoặc một ngón tay để di chuyển bản đồ.
- Cuộn chuột, chụm hai ngón tay hoặc dùng nút −/+ để zoom (30–250%).
- Bật **Lưới ô** để xem 400 ô đất; **Toàn cảnh** đặt lại góc nhìn.
- Bấm một nhà/cây để xem mã, tọa độ và diện tích. Chọn từ danh sách **Khám phá** cũng đưa camera đến công trình.
- Khi bản đồ nhận focus: phím mũi tên di chuyển, `+`/`-` zoom, `Home` về toàn cảnh, `Escape` bỏ chọn.
- Tọa độ ô dùng chỉ số **0–19** trên cả hai trục.

## Cấu trúc

```text
index.html             Giao diện, nút điều khiển và bảng chi tiết
css/styles.css         Bố cục responsive, màu sắc và kiểu chữ
js/world.js            Bản đồ 20×20, dữ liệu công trình, chuyển đổi tọa độ
js/renderer.js         Canvas 2D, camera, thứ tự vẽ, chọn sprite
js/app.js              Khởi tạo, điều khiển chuột/cảm ứng/bàn phím
assets/                Bộ SVG gốc: nhà vườn, nhà phố, cây xanh, favicon
scripts/serve.mjs      Máy chủ HTTP phát triển, không cần dependencies
tests/world.test.js   Kiểm tra dữ liệu và phép chiếu bản đồ
tests/browser-smoke.cjs Kiểm tra tương tác bằng Playwright (tùy chọn)
```

## Nền tảng đã có

400 ô đất isometric 2.5D; 21 nhà mẫu thuộc hai kiểu, 32 cây và mạng đường có vỉa hè, vạch đường, giao lộ. SVG sử dụng chi tiết mái, cửa, kính, bồn cây, tán lá và bóng đổ; không dùng emoji. Đường được vẽ bằng vector theo các ô láng giềng.

Dữ liệu công trình là `{ id, type, x, y, footprint, variant }`, độc lập với camera. `world.objectAt(x, y)` tra cứu công trình theo ô; `OBJECT_TYPES` đăng ký đồ họa và kiểu công trình. Renderer chuyển tọa độ lưới thành tọa độ màn hình và vẽ theo chiều sâu. Khi bổ sung xây dựng, có thể dùng dữ liệu chiếm ô và footprint này để kiểm tra vị trí; hiện chưa có chế độ đặt/xóa công trình hoặc lưu thành phố.

Canvas chỉ vẽ lại khi có thay đổi; độ phân giải theo màn hình được giới hạn ở DPR 2. Các hình được tải từ repository, không cần CDN hoặc API.

## Kiểm tra

```sh
npm test
```

Kiểm tra đủ 400 ô, chuyển đổi tọa độ, biên bản đồ, mã và diện tích công trình, không chồng lên đường, và tính liên thông của mạng đường. Kiểm tra trình duyệt được mô tả trong `tests/VALIDATION.md`.

## Phạm vi

Giai đoạn nền tảng City Builder. Chưa triển khai Pomodoro, kinh tế, quản lý đô thị hoặc chức năng học tập. Không có backend và không cần khóa API.
