# Hướng Dẫn Cài Đặt PostgreSQL + PostGIS (Windows)

## Bước 1: Cài đặt PostgreSQL

1. Tải PostgreSQL installer từ: https://www.postgresql.org/download/windows/
2. Chạy file `.exe` và làm theo wizard
3. Đặt mật khẩu cho user `postgres` (ghi nhớ lại)
4. **QUAN TRỌNG**: Tick ✅ "Launch Stack Builder at exit?" trước khi nhấn Finish

## Bước 2: Cài PostGIS qua Stack Builder

1. Stack Builder sẽ mở tự động (hoặc tìm "Stack Builder" trong Start Menu)
2. Chọn PostgreSQL server vừa cài → Next
3. Mở rộng **"Spatial Extensions"** → tick **PostGIS 3.x Bundle** → Next
4. Hoàn tất cài đặt PostGIS

## Bước 3: Tạo Database

Mở **pgAdmin 4** (cài cùng PostgreSQL) hoặc dùng `psql`:

```sql
-- Tạo database
CREATE DATABASE public_infra_db;

-- Kết nối vào database
\c public_infra_db

-- Bật PostGIS extension
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

-- Kiểm tra
SELECT PostGIS_Full_Version();
```

Nếu thấy kết quả dạng `POSTGIS="3.x.x"` là thành công.

## Bước 4: Cấu hình cho Django

File `.env` trong dự án:
```
DB_PASSWORD=your_postgres_password
DATABASE_URL=postgis://postgres:your_postgres_password@localhost:5432/public_infra_db
```

Django sẽ tự kết nối qua engine `django.contrib.gis.db.backends.postgis`.

## Lưu ý quan trọng

- Bạn cần quyền Admin trên Windows để cài đặt
- PostgreSQL mặc định chạy trên port `5432`
- Nếu dùng Docker, bỏ qua bước 1-2, chạy: `docker-compose up db`
