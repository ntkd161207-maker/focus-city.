# Tiến độ và tiêu chí

- [x] Module hóa React/TypeScript/Vite/Three.js.
- [x] Bản đồ 32×32, cellSize cấu hình, taxonomy, lưới, raycast/hover/chọn ô.
- [x] Perspective camera, pan/rotate/zoom mượt, giới hạn và reset.
- [x] Ánh sáng, PBR, texture, bóng và chất lượng Low/Medium/High, FPS/draw calls.
- [x] Manifest, GLB loader/cache/instances/lifecycle, ba mô hình gốc placeholder.
- [x] IndexedDB save/load/reset, schema validation và khung migration.
- [x] UI Việt, vùng Pomodoro sắp có.
- [x] Unit/browser test suites, workflow GitHub Actions/Pages.
- [ ] Bật Pages, push và xác minh deployment thực tế (cần quyền GitHub của chủ repository).
- [ ] Đánh giá ảnh tham chiếu khi được cung cấp; thay placeholder bằng asset sản xuất.
- [ ] Benchmark trên Dell Latitude 5320 thật; không suy ra từ software WebGL.

Kết quả lệnh thực tế được báo trong bàn giao; checkbox triển khai tính năng không thay thế kết quả test. Không có xây dựng tương tác, simulation hay timer thật trong giai đoạn này.

## Xác minh tại môi trường cloud — 2026-10-15

- `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`: thành công với lockfile.
- TypeScript và production build base `/focus-city./`: qua.
- Vitest: **19/19 tests qua**, 3 tệp test.
- Playwright + Chromium hệ thống + SwiftShader: **4/4 tests qua**; camera reset đã được sửa để xóa quán tính trước khi phục hồi vị trí.
- Browser suite xác minh ba GLB tải thành công, có draw calls, chọn ô, zoom/rotate/pan/reset, lưới, chất lượng, lưu/refresh/reset, báo dữ liệu lỗi, lỗi asset và bố cục mobile.
- Vite dev server: HTTP 200, đúng title, scene ready, không có page error trong lần kiểm tra browser. Quan sát được 25 draw calls và 90.778 tam giác; đây là số đo cảnh mẫu, không phải bảo đảm hiệu năng thiết bị thật.
- Đã xem screenshot desktop và mobile: cảnh 3D và công cụ hiển thị. Không có ảnh tham chiếu để so mức tương đồng.
- `npm run format:check` và `git diff --check`: qua.
- Build có cảnh báo bundle JS lớn hơn 500 kB: khoảng 846 kB, gzip 231 kB, chủ yếu Three.js. Không tắt cảnh báo; khi bổ sung nội dung cần xem xét tách tải renderer và assets theo khu vực.
- Workflow GitHub Actions chưa chạy trên GitHub; chưa xác minh deploy/live URL. Cloud draft đã lưu hướng dẫn cài/khởi động, chưa được người dùng Publish.

## Nâng cấp thành phố mở (sau nền tảng ban đầu)

- [x] Đại lộ bốn làn xuyên X, đường nhánh hai làn có topology xuyên chunk.
- [x] Zebra/stop line/lane marks, median, sidewalk lát gạch/góc bo, đèn và cây.
- [x] Lõi 64×64, streaming 49 chunk quanh camera, cache eviction và chi tiết thấp ở xa.
- [x] Sáu dịch vụ GLB gốc với footprint/màu/hình dáng/nhãn UI riêng.
- [x] Layout theo quận/khu, footprint không đè lên đường; camera tới đại lộ/dịch vụ/khám phá Đông.
- [x] Migration v1→v2 trong bộ nhớ, giữ snapshot gốc, không tự ghi đè DB.
- [x] Typecheck, unit tests/build base Pages đã qua trong quá trình nâng cấp.
- [x] Browser suite nâng cấp: 6/6 qua, gồm camera/save/reset, 9 GLB, dịch vụ, streaming và migration.
- [ ] Đo trên laptop Intel thật; chưa tuyên bố 60 FPS.

Phần ghi nhận Giai đoạn 1 ở trên là lịch sử trước nâng cấp (32×32/3 GLB/19 unit/4 browser), không phải mô tả bản hiện tại. Xem README/ARCHITECTURE cho trạng thái mới.

### Kết quả bản nâng cấp cuối — 2026-10-15

- Typecheck, production build với `/focus-city./`, **30 unit tests** và **6 browser tests**: qua.
- Browser tests trên production preview xác minh chín GLB, camera/save/load/reset, migration, đủ sáu dịch vụ, đại lộ, đèn/giao lộ và streaming qua ba chunk rồi quay lại.
- Capture production độc lập: **0 console/page errors**, chín GLB HTTP thành công. Screenshot toàn cảnh, cận đại lộ, phía Đông và mobile nằm trong `artifacts/`; metadata ở `artifacts/validation.json`.
- Cảnh toàn cảnh 1600×1000 ghi nhận 49 chunk, 2.060 công trình, 82 draw calls/345.438 tam giác tại thời điểm capture. Đây là thống kê cảnh trên SwiftShader, không chứng minh FPS trên Intel iGPU. Chưa benchmark Dell thật.
- Format check và `git diff --check`: qua. Cảnh báo bundle Vite >500 kB vẫn tồn tại (khoảng 885 kB JS, gzip 243 kB), chưa cần hậu kỳ hay dependency mới.
- Chưa chạy deployment GitHub; workflow Pages hiện có vẫn được giữ. Cơ chế streaming/LOD/dịch vụ là nâng cấp scene, không có traffic/economy/Pomodoro simulation mới.
