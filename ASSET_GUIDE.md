# Asset pipeline · Thành phố mở

## Tài nguyên hiện tại

`public/assets/models/` chứa **9 GLB 2.0**: cottage, townhouse, tower, school, clinic, fire, police, market, park. Tất cả geometry và PNG texture nhúng được tạo gốc bằng `scripts/generate-assets.mjs`, metadata CC0-1.0, PBR metal/roughness. Không có tài nguyên Cities: Skylines hoặc texture tải từ bên thứ ba. Đây là placeholder, không phải đồ họa sản xuất.

Tái tạo bằng `npm run assets:generate` từ root repository; không cần Blender. Generator deterministic và giữ geometry/material chung giữa các node trong mỗi GLB.

## Manifest và định nghĩa

- `src/assets/manifest.ts`: id, type glb/gltf, đường dẫn tương đối BASE_URL, metadata license/placeholder/unit/forward/lodPaths.
- `src/buildings/catalog.ts`: nhà dân/văn phòng, scale và footprint; kết hợp catalog dịch vụ.
- `src/services/catalog.ts`: tên, màu, symbol, footprint/asset và vị trí sáu dịch vụ demo. Có thể thay GLB mà giữ ID để không phá save.
- `src/services/labels.ts`: nhãn tiếng Việt project từ vị trí trong scene; không phụ thuộc tên node của model.
- `environment/resources.ts`: geometry/material/procedural paving texture của môi trường, không dùng asset bên ngoài.

Đơn vị mét, +Y lên, +Z là mặt trước, pivot ở tâm chân. Ba GLB nhà gốc rộng khoảng 3.5m được scale 2.2, nằm trong footprint 3×3 ô (12×12m). Dịch vụ dựng theo mét trực tiếp, scale 1: trường học footprint 7×5 ô, các dịch vụ khác 5×5 ô. Tọa độ building là ô tâm. Model phải nằm trong footprint và chừa khoảng lùi cho sidewalk.

Trường học có tháp đồng hồ; y tế có dấu cộng xanh; cứu hỏa có garage đỏ/tháp sấy; cảnh sát có wing xanh/radio mast; mini mart có awning; công viên có fountain, benches và planters. Hình dáng/màu/UI cùng giúp nhận diện trong giai đoạn placeholder.

## Quy chuẩn khi thay asset

Tên lowercase-kebab-case.glb, node có nghĩa, không nhúng camera/light. Áp dụng transform, không scale âm; UV/normal hợp lệ. Ưu tiên GLB self-contained, atlas 512–1024, PBR basecolor/normal/roughness, sRGB cho basecolor và linear cho normal/roughness. Ghi nguồn/giấy phép/credit; không mặc định file trên Internet là miễn phí.

Khi thêm loại mới: manifest → catalog → footprint validation/layout → tests. Không hardcode mesh công trình vào engine. Cần xem số đo phần cứng mục tiêu trước khi chốt polygon/material/texture budget.

## Loader, LOD và ownership

AssetManager dùng GLTFLoader, cache model/promise theo ID; báo lỗi tên asset khi tải thất bại. Instance clone mượn geometry/material/texture. Batches gom mesh tĩnh thành InstancedMesh; animated/skinned assets cần nhánh riêng trước khi hỗ trợ.

Trong vùng gần dùng GLB; ngoài bán kính chi tiết dùng proxy box/roof và cây ít polygon. Đây là LOD thủ tục rời rạc, không phải model LOD tải từ manifest. `lodPaths` là điểm mở rộng, chưa có selector tự tải model LOD, Draco/KTX2 hoặc cross-fade.

Rebuild chỉ hủy instance buffers. Đóng renderer mới dispose shared resources, texture và ImageBitmap. Không dispose material/geometry từ từng instance. Mỗi tài nguyên phải có một owner.

## Xác minh

Build với base `/focus-city./`; kiểm tra chín GLB HTTP 200, texture nạp được, hình ảnh thực từ browser. Unit tests kiểm tra GLB header/buffer bounds/metadata/catalog IDs; E2E kiểm tra tải đúng base và báo lỗi asset có chủ đích. Screenshot bản dựng được lưu trong `artifacts/`.
