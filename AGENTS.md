# Hướng dẫn tác nhân

- Dùng checkout hiện tại; mỗi cloud task đã cô lập, không tạo worktree trừ khi người dùng yêu cầu.
- Node 24, `npm ci`, không đổi lockfile chỉ để cài đặt. Khi cache mặc định không ghi được, dùng `npm ci --cache /workspace/.npm-cache`.
- Tôn trọng ranh giới module trong ARCHITECTURE.md. Dữ liệu simulation/persistence không chứa Three.js objects. UI không điều khiển trực tiếp scene internals.
- Các thư mục simulation/pomodoro/roads có phần chuẩn bị; không tự chuyển sang Giai đoạn 2.
- Xác minh `npm run typecheck`, `npm test`, `VITE_BASE_PATH='/focus-city./' npm run build`, `npm run test:e2e` cho thay đổi liên quan. Browser tests cần Chromium; có thể đặt PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH cho executable hệ thống. Không coi software WebGL là benchmark phần cứng.
- Đường dẫn asset qua BASE_URL. Không thêm API key, nguồn asset không rõ giấy phép hoặc sao chép Cities: Skylines.
- Bảo toàn save lỗi/unsupported version đến khi người dùng chủ động reset/lưu. Migration phải có tests.
- Phải dispose geometry/material/texture/instance buffer/listener/RAF/observer theo ownership. Tránh loop React state mỗi frame; stats throttle.
- Không công bố 80% giống ảnh, 60 FPS trên Dell hay deploy thành công khi chưa có bằng chứng.

## Thành phố mở

- Road topology/layout phải dùng tọa độ toàn cục, modulo đúng số âm. Không reset topology tại mỗi chunk.
- Giữ cache 49 chunk có eviction; dữ liệu lõi là nguồn chân lý, không tái sinh công trình đã xóa khi quay lại.
- Thay đổi schema phải giữ migration v1→v2 và legacySnapshot; không ghi lại IndexedDB trong load.
- Thêm dịch vụ qua services/catalog và asset manifest, không hardcode mô hình vào engine.
- Screenshot bằng app thật trong artifacts; không dùng ảnh ý tưởng làm bằng chứng. FPS SwiftShader không phải hiệu năng Intel laptop.
