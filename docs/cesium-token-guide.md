# Hướng Dẫn Lắp Cesium Ion Token

## CesiumJS là gì?
CesiumJS là thư viện bản đồ 3D mã nguồn mở. Để sử dụng terrain 3D và imagery từ Cesium Ion, bạn cần một Access Token (miễn phí).

## Bước 1: Đăng ký tài khoản
1. Truy cập: https://ion.cesium.com/signup/
2. Tạo tài khoản miễn phí (Free tier: 5GB assets, 500K tiles/tháng)

## Bước 2: Tạo Access Token
1. Đăng nhập vào Cesium Ion Dashboard
2. Vào **Access Tokens** (menu trái)
3. Nhấn **"Create Token"**
4. Đặt tên: `public-infra-system`
5. Chọn scope: ✅ Default (đủ cho development)
6. Nhấn **"Create"** và copy token

## Bước 3: Thêm vào dự án
Mở file `.env` tại gốc dự án:
```
VITE_CESIUM_ION_TOKEN=paste_your_token_here
```

## Bước 4: Khởi động lại frontend
```bash
cd frontend
npm run dev
```

Bản đồ sẽ tự động load terrain 3D từ Cesium Ion.

## Không có Token?
**Không sao!** Frontend đã được thiết kế fallback:
- Không có token → sử dụng OpenStreetMap tiles (2D)
- Có token → sử dụng Cesium World Terrain (3D)

Bạn có thể phát triển toàn bộ tính năng mà không cần token, chỉ cần lắp vào khi muốn trải nghiệm 3D.
