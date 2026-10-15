# Định hướng mỹ thuật

Stylized realism: ánh sáng ban ngày ấm nhẹ, cây xanh dịu, bề mặt bê tông/gạch/vữa, kính xanh xám. Bối cảnh thành phố nhìn từ trên cao bằng PerspectiveCamera (FOV 42°), khối phố thấp tầng chuyển sang cao tầng. UI giấy sáng, xanh rêu, diện tích trống và chữ Việt dễ đọc.

Ảnh tham chiếu chưa được cung cấp dưới dạng tệp hình trong phiên làm việc. Không xác nhận mức tương đồng 80%. Khi có ảnh cần so sánh cùng camera, tỷ lệ, ánh sáng, silhouette, mật độ và chi tiết bằng screenshot bản dựng thực tế.

Ba mô hình hiện tại là PLACEHOLDER gốc: nhà vườn mái dốc/ống khói/hiên/khung cửa, nhà phố gạch nhiều tầng/phào/canopy, tháp văn phòng kính/crown/phòng kỹ thuật. Chúng có texture nhúng, geometry/material tái sử dụng và tỷ lệ theo ô. Vẫn được tạo từ các bộ phận hình học đơn giản, không phải đồ họa cuối. Đường, cây cũng placeholder. Không lấy tài nguyên Cities: Skylines.

Mục tiêu asset sản xuất: bevel mép, mái/gờ thoát nước, cửa và ban công có chiều sâu, nền/biên công trình phù hợp, PBR basecolor/normal/roughness, atlas chung; silhouette đọc rõ ở camera xa. Chọn bộ asset đồng bộ thay vì trộn phong cách. Bổ sung xe và vỉa hè chi tiết khi đo được ngân sách scene.

Chưa dùng SSAO/bloom hoặc hiệu ứng nặng. Chốt polygon/material/texture budget bằng benchmark thiết bị mục tiêu, không dựa trên FPS máy cloud.

## Nâng cấp đường và quy mô

Đường nhựa xám than, bốn làn trên đại lộ và hai làn ở phố dân cư. Sơn trắng/ngà rõ, zebra và stop line ở giao lộ, median xanh, vỉa hè procedural lát gạch so le, góc cong, cột đèn tỷ lệ khoảng 6.5m và cây trên sidewalk. Xe chỉ là vật thể trang trí. Chọn hạ tầng điện ngầm nên không kéo dây trên không trong demo.

Camera đi trong đô thị liên tục thay vì nhìn một đế đất nhỏ nổi riêng. Mặt đất và fog che vùng render xa; skyline proxy giữ mật độ ở xa. Gần đại lộ có văn phòng/nhà phố, các công trình dịch vụ có sân và signage màu. School có tháp đồng hồ; y tế có dấu cộng xanh; cứu hỏa có garage đỏ/tháp; cảnh sát có cột radio/khối xanh; mini mart có awning; park có fountain/bench/planter.

Nhãn tiếng Việt và bảng dịch vụ hỗ trợ nhận diện khi placeholder chưa đủ tinh tế. Chưa đạt đồ họa sản xuất hoặc mức tương đồng định lượng với ảnh chưa được cung cấp.
