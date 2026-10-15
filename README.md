# Focus City · Thành phố mở

Nâng cấp trực tiếp nền tảng React/TypeScript/Vite/Three.js hiện có: thành phố isometric mở rộng theo camera, đại lộ bốn làn, giao lộ đô thị và sáu dịch vụ. Dữ liệu game lưu cục bộ bằng IndexedDB; không cần API key/backend.

## Mở và xem bản mới

Node.js 24 (xem `.nvmrc`). Trong thư mục dự án:

```sh
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị ở cổng 5173. Nếu dev server đã chạy, refresh trang. Không cần reset để nâng cấp bản lưu v1 hợp lệ.

- **Đại lộ**: tới gần giao lộ trung tâm để xem làn xe, zebra, vỉa hè, đèn đường và dải phân cách.
- **Khám phá phía Đông** hoặc kéo chuột phải: đi qua các chunk mới; thành phố tiếp tục sinh ra.
- **Đặt lại góc nhìn**: trở về trung tâm. Cuộn để zoom; kéo trái để xoay, nhấp để chọn ô. Cảm ứng: một ngón xoay, hai ngón pan/zoom.
- Bảng **Dịch vụ thành phố** hoặc nhãn trong cảnh: chọn trường học, trạm y tế, cứu hỏa, cảnh sát, mini mart, công viên để đến gần và xem tên. Mobile dùng nhãn trên bản đồ.
- **Lưới ô** hiển thị lưới của chunk tại camera. **Chất lượng**: Thấp tắt bóng, Vừa bóng 1024/pixel ratio ≤1.5, Cao bóng 2048/pixel ratio ≤2.
- **Lưu thành phố** lưu trạng thái lõi, lưới và chất lượng. Refresh tải bản lưu. **Đặt lại thành phố** có xác nhận, thay dữ liệu bằng demo mới.

## Thành phố mở rộng đến đâu?

Lõi lưu game: **64×64 ô**, mỗi ô 4m (256×256m), thay cho mảng đất 32×32 ban đầu. Các chunk **32×32 ô**, cửa sổ hoạt động **7×7 = 49 chunk** (896×896m), dịch chuyển quanh target camera. Chunk mới sinh theo tọa độ, chunk xa bị thu hồi, quay lại sinh đúng nội dung cũ. Camera được pan tới bán kính 32.768m để giữ độ chính xác.

Đây là **pseudo-infinite với streaming thật**, không phải thế giới vô hạn về toán học: chỉ 49 chunk tồn tại trong cache; vùng ngoài lõi là cảnh quan thủ tục, chưa có chỉnh sửa/xây dựng hay simulation/persistence riêng từng chunk. Sương và mặt đất liên tục che giới hạn render; không còn đế đất nổi với mép cụt. Nhà xa dùng proxy và cây giảm polygon; thay đổi LOD hiện là chuyển mức rời rạc, chưa có cross-fade.

Đại lộ Thống Nhất chạy theo trục X, qua toàn bộ các chunk ở dải z=30..33 (rộng 16m), bốn làn và dải phân cách. Đường nhánh hai làn rộng 8m lặp theo mạng phố toàn cục, không reset tại biên chunk. Có vạch làn, stop line, zebra crossing, vỉa hè lát gạch và góc bo, đèn, cây đường phố; xe là trang trí tĩnh. Không bổ sung dây điện vì demo đang theo hướng hạ tầng đô thị đi ngầm.

## Bản lưu cũ

Schema v1 được kiểm tra trước khi chuyển sang v2 **trong bộ nhớ**. Giữ tùy chọn/focusMinutes, chuyển từng công trình cũ tới lô hợp lệ gần vị trí cũ để tránh đường mới; lưu bản sao nguyên trạng ở `legacySnapshot`. Bản IndexedDB gốc chỉ được thay khi bấm Save hoặc xác nhận Reset. Version không hỗ trợ/dữ liệu lỗi được báo và không tự ghi đè. Save chỉ thuộc thiết bị, hồ sơ và origin trình duyệt hiện tại; không đồng bộ online.

## Kiểm tra và build

```sh
npm run typecheck
npm test
VITE_BASE_PATH='/focus-city./' npm run build
npx playwright install chromium
npm run test:e2e
```

Linux thiếu thư viện: `npx playwright install --with-deps chromium`. Cloud có Chromium hệ thống: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Browser tests dùng software WebGL/SwiftShader, một worker và timeout 120s cho các lượt reload/render nặng. Đây không phải benchmark GPU laptop thật.

E2E chạy production preview đúng base `/focus-city./`, kiểm tra 9 GLB, WebGL/camera/chọn ô, save/load/reset, migration v1, sáu dịch vụ và streaming qua ba chunk rồi quay về. Unit tests kiểm tra đường liên tục, footprint, tọa độ âm, tính nhất quán giữa chunk, cache bị giới hạn và migration.

## Hình ảnh bản dựng

- [Toàn cảnh thành phố mở rộng](artifacts/city-expanded-overview.png)
- [Cận giao lộ đại lộ](artifacts/boulevard-intersection.png)
- [Khu phố mới về phía Đông](artifacts/city-streamed-east.png)

Đây là screenshot từ Chromium chạy ứng dụng, không phải ảnh ý tưởng. Không có tệp ảnh tham chiếu được cung cấp để đối chiếu trực tiếp; thiết kế đường dựa trên mô tả bằng văn bản.

## GitHub Pages

Workflow `.github/workflows/pages.yml` chạy typecheck/unit/build/browser trước deploy. Trong GitHub **Settings → Pages → Source: GitHub Actions**, đưa thay đổi lên `work`. Vite base lấy từ tên repository; asset dùng `import.meta.env.BASE_URL`. Nếu đổi tên repo, truyền cùng `VITE_BASE_PATH` cho build và browser tests. Chỉ xác nhận phát hành khi job Deploy và trang thực tế thành công; phiên nâng cấp này chưa xác minh deploy GitHub.

## Phạm vi

Chín GLB là placeholder gốc CC0 có thể thay qua manifest/catalog. Sáu dịch vụ có hình dáng, màu, nhãn và footprint riêng, chưa mô phỏng giáo dục/y tế/cứu hỏa hay kinh tế. Chưa thêm road editor, công trình tương tác, traffic simulation hoặc Pomodoro thực thi. Không sao chép tài nguyên Cities: Skylines; chưa bảo đảm 60 FPS trên Dell Latitude 5320.

Xem [ARCHITECTURE.md](ARCHITECTURE.md), [TASKS.md](TASKS.md), [ART_DIRECTION.md](ART_DIRECTION.md), [ASSET_GUIDE.md](ASSET_GUIDE.md), [ROADMAP.md](ROADMAP.md).

## Phát hành bản cập nhật thứ 2

Code mới và workflow phát hành nằm trên nhánh `work`. GitHub Pages cần dùng **Source: GitHub Actions** (không chọn Deploy from a branch để phục vụ trực tiếp source TypeScript). Workflow chỉ deploy từ `work`; nhánh `phase-1-city-builder` được giữ nguyên như bản nền cũ. Sau khi chọn nguồn Pages, mở tab Actions, lọc nhánh `work`, mở lượt chạy mới nhất và chọn **Re-run all jobs** nếu lượt đầu đã thất bại do Pages chưa bật. Vì nhánh mặc định `main` hiện chỉ chứa README, nút Run workflow có thể chưa xuất hiện; push mới lên `work` vẫn tự kích hoạt workflow. URL dự kiến: https://ntkd161207-maker.github.io/focus-city./ — chỉ coi là xuất bản sau khi job Deploy thành công.
