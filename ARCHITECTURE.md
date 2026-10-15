# Kiến trúc Focus City · Thành phố mở

Nâng cấp trên cấu trúc hiện tại, không tạo ứng dụng hay branch mới. React điều phối lệnh → core/state dữ liệu thuần → renderer hiển thị; persistence không chứa Three.js objects. Simulation/Pomodoro không được mở rộng trong lượt này.

| Module                 | Trách nhiệm                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| core                   | Cấu hình 64×64/4m, GameState v2, RAF loop                                                                              |
| roads/layout           | Topology toàn cục: đại lộ X ở z=30..33, đường nhánh 2 ô theo chu kỳ 24; modulo đúng cả tọa độ âm                       |
| roads/render           | Mặt đường, vạch làn/stop line/zebra, dải phân cách, góc vỉa hè bo và đèn; dữ liệu từ topology, không viết trong engine |
| world/chunks           | Chunk 32×32, cửa sổ 7×7, cache có eviction, revision và các mức chi tiết                                               |
| world/grid             | World ↔ cell hữu hạn cho dữ liệu cũ và tọa độ toàn cục cho streaming                                                   |
| districts/layout       | Seed/hash theo tọa độ; footprint; bố trí mật độ; chừa khu dịch vụ; truy vấn công trình theo mọi ô trong footprint      |
| services/catalog       | Sáu định nghĩa asset/tên/màu/footprint và vị trí demo                                                                  |
| services/labels        | Nhãn HTML truy cập được bằng bàn phím, project tọa độ 3D mỗi frame, thu hồi cùng scene                                 |
| environment/resources  | Geometry/material/procedural paving texture chia sẻ, quản lý dispose                                                   |
| environment/decoration | Cây đường phố/công viên, sân vườn, chỗ đỗ và xe trang trí tĩnh                                                         |
| rendering/batches      | Gom matrix của công trình, đường, trang trí thành InstancedMesh theo geometry/material/shadow                          |
| rendering/engine       | Điều phối module, renderer/raycast/ánh sáng/stats và lệnh UI; không chứa generator road/layout                         |
| camera                 | PerspectiveCamera/OrbitControls, damping/reset, zoom 28..620m, target radius ≤32768m, focus dịch vụ/đại lộ             |
| assets/buildings       | Manifest GLB, loader/cache/clone/dispose và catalog mô hình/footprint                                                  |
| persistence            | IndexedDB/transaction/validate/migrate v1→v2                                                                           |
| ui                     | Công cụ camera/lưới/chất lượng, save/reset, bảng sáu dịch vụ, số chunk/draw calls                                      |

## Hệ tọa độ và quy hoạch

Y lên; đơn vị mét. Lõi 64×64 đặt giữa world origin, cell center `(cell+.5-size/2)*cellSize`. Tọa độ global cho phép x/z âm và vượt size. Công trình lưu bằng ô tâm, footprint lẻ để có vùng chiếm dụng xác định. Generator tránh mọi ô đường và footprint dịch vụ, cho kết quả giống nhau dù sinh cả vùng hay từng chunk nhỏ.

Đại lộ liên tục 16m (bốn làn, median), đường địa phương 8m (hai làn). Topology xác định theo tọa độ global nên không tạo ngõ cụt nhân tạo ở biên chunk. Road renderer tạo các giao lộ một lần tại chunk sở hữu tâm; neighbor queries được tính ngoài biên để sidewalk/curb liền mạch. Lõi có cụm dịch vụ hai phía đại lộ, nhà phố/văn phòng gần trục chính, nhà vườn ở xa hơn.

## Streaming và LOD

ChunkManager sinh dữ liệu 49 chunk quanh target camera khi đi qua ranh giới chunk 128m; cache loại chunk không còn cần. State.buildings là nguồn chân lý của lõi, kể cả khi đã xóa công trình: không tự mọc lại khi quay về. Bên ngoài lõi được tái tạo bằng hash/toạ độ; chưa lưu chỉnh sửa vùng ngoài. Cả 49 chunk được gom vào các batch toàn cục để hạn chế draw calls; chưa culling từng instance. Mỗi batch có bounding sphere; có thể chia spatial batches khi scene lớn hơn.

9 chunk gần có chi tiết đường/đèn/zebra/xe; nhà GLB chỉ dùng trong bán kính khoảng 145m tính tại lần rebuild. Ngoài vùng đó dùng proxy; cây xa ít polygon và không cast shadow. Mặt đường và sơn kẻ dùng plane; curb gần giữ thể tích. Pixel ratio/shadow theo tier. Không postprocessing nặng. LOD đổi theo rebuild chunk, chưa cross-fade, có thể thấy popping. Mỗi lần dịch cửa sổ hiện reaggregate batch đồng bộ, chưa worker/async scheduler.

Mặt đất 4096m dịch theo target, sương che vùng render xa, không có đế đất nổi. Giới hạn target 32.768m bảo vệ độ chính xác; đây là pseudo-infinite có streaming, không thế giới vô hạn toán học. Camera zoom ra xa hơn nhưng vẫn giữ Perspective/isometric feel và không xuống dưới địa hình phẳng.

## Persistence và migration

DB `focus-city`, DB version 1/store `saves`/key `main` giữ nguyên; game schema lên version 2, độc lập DB version. Schema mới lưu lõi, buildings, grid/quality/focusMinutes; không lưu scene, matrix, texture hay cache chunk. Validate id, vị trí, footprint chồng lấn/đè đường, bounds, kiểu dữ liệu và version.

V1 được validate bằng topology/loại nhà cũ. Tạo layout mới, chuyển các record cũ vào lô dân cư còn trống gần tọa độ tương ứng, giữ id dưới prefix `legacy-`, kind/rotation và preferences. Giữ nguyên snapshot v1 trong `legacySnapshot`. Không đủ lô thì từ chối migration thay vì bỏ công trình. Việc tải chỉ chuyển trong bộ nhớ; IndexedDB chỉ thay sau Save/Reset rõ ràng. Unsupported/corrupt data không tự bị xóa. Không có automatic downgrade.

## Vòng đời và kiểm thử

Renderer dừng RAF, observer, listener, controls; dispose instance buffers trước shared asset resources, cả textures/ImageBitmap. Cache chunk/labels/paving canvas texture/geometry/shadow đều được thu hồi. Mỗi rebuild chỉ dispose instance buffers, không dispose geometry/material chia sẻ.

Unit tests chứng minh topology liền, layout không chồng, chunk composability/tọa độ âm/cache bounded/migration. Browser tests kiểm tra assets/render/camera/save và dịch vụ/streaming. Workflow Pages chạy trên main/PR với base theo repository; deployment thật vẫn là bước riêng cần kiểm tra GitHub.
