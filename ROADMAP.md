# Lộ trình Focus City

## Đã có: nền tảng và nâng cấp thành phố mở

React/TypeScript/Vite/Three.js; camera, raycast/lưới, chín GLB placeholder, IndexedDB schema v2 và migration, bộ kiểm thử và workflow Pages. Lõi 64×64 với streaming 49 chunk, đại lộ bốn làn, đường nhánh/giao lộ/sidewalk/trang trí và sáu dịch vụ nhận diện được. Chưa phải mục tiêu mỹ thuật cuối hoặc city simulation.

## Đề xuất tiếp theo — chưa tự triển khai

1. Đối chiếu ảnh tham chiếu thật, lựa chọn bộ asset có giấy phép và benchmark trên Dell Latitude 5320. Cải thiện proxy LOD, culling/chunk scheduling dựa trên số đo.
2. Command/state history cho đặt/xóa/xoay công trình và road editor/topology có thể sửa, collision và zoning.
3. Persistence thay đổi theo chunk ngoài lõi, export/import, migrations có tests.
4. Simulation tick độc lập renderer: economy/population, sau đó giao thông và dịch vụ có tác dụng thực.
5. Pomodoro timestamp-based để xử lý tab nền, pause/resume/phần thưởng; thống nhất luật trước khi xây.

Tasks, journal, statistics là các mục sau; chỉ thực hiện theo yêu cầu riêng. Xe và sáu dịch vụ hiện mới là đồ họa demo, không được báo cáo như simulation đã chạy.
