# InfraWatch — Hệ Thống Quản Lý Hạ Tầng Công Cộng (Đà Nẵng)

> GIS Dashboard + AI Incident Detection + Workflow Tự Động + Analytics Nâng Cao

## Kiến trúc

| Component | Công nghệ | Port |
|-----------|-----------|------|
| Backend API | Django 4.2 + DRF + (PostGIS optional) | 8000 |
| AI Service | FastAPI + YOLOv8 | 8001 |
| Frontend | React 18 + Vite + Leaflet (+ Cesium 3D tùy chọn) | 5173 |
| Database | SQLite (dev) / PostgreSQL+PostGIS (prod) | 5432 |
| Cache | Redis | 6379 |

Khu vực hoạt động: **Đà Nẵng — Hải Châu / Sơn Trà** (bbox 16.04–16.10°N, 108.20–108.24°E).

## Khởi động nhanh

### 1. Chuẩn bị
```bash
cp .env.example .env
```

### 2. Backend (SQLite mặc định)
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_users
python manage.py seed_areas
python manage.py seed_data
python manage.py seed_reports
python manage.py runserver
```

### 3. AI Service
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python download_model.py        # tải YOLO (chỉ chạy 1 lần)
uvicorn main:app --port 8001 --reload
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Truy cập
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:8000/api/v1/
- **Admin Django**: http://localhost:8000/admin/
- **AI docs**: http://localhost:8001/docs

## Tài khoản demo (sau khi chạy `seed_users`)

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@infra.local` | `admin123456` | Admin |
| `operator1@infra.local` | `operator123` | Operator |
| `operator2@infra.local` | `operator123` | Operator |
| `tf1@infra.local` | `taskforce123` | TaskForce |
| `tf2@infra.local` | `taskforce123` | TaskForce |
| `tf3@infra.local` | `taskforce123` | TaskForce |
| `citizen@infra.local` | `citizen123` | Citizen |

## Tính năng đã triển khai

### Sprint 1 — Nền tảng Production
- **Map Leaflet/OSM** mặc định + cluster + heatmap + popup, click→tạo report
- **Cesium 3D** làm tab phụ (kích hoạt khi `VITE_CESIUM_ION_TOKEN` có giá trị)
- **RBAC** áp dụng vào tất cả ViewSets (citizen / operator / taskforce / admin)
- **Notifications polling 30s** (bell icon, badge, dropdown 10 thông báo gần)
- **Activity Log** mọi thao tác + trang admin timeline
- **Đăng ký** công dân, **Profile** xem/sửa + đổi mật khẩu + avatar
- **Seed Đà Nẵng** ~30 vị trí thực tế, 12 báo cáo demo

### Sprint 2 — Workflow hoàn chỉnh
- Auto pipeline: `pending → assigned` tự tạo Task; `→ resolved` tự tạo MaintenanceLog + cập nhật asset; `→ rejected` notify reporter
- **Report detail** `/reports/:id`: ảnh before/after, mini-map, timeline (audit), comments thread
- **Task assignment** modal có gợi ý taskforce + dropdown chọn thủ công + priority queue
- **Maintenance** trang quản lý bảo trì với filter status

### Sprint 3 — Analytics & Dashboards
- 5 endpoint analytics: `timeline`, `response_time`, `hour_heatmap`, `top_areas`, `ai_accuracy`
- Trang `/analytics` với 5 chart Line/Bar/Doughnut
- Export CSV cho assets / reports / tasks / maintenance
- **Dashboard theo role**: Citizen (báo cáo của tôi), TaskForce (priority queue), Operator/Admin (KPIs + chart)
- **Settings page** admin: AI threshold, map center, branding

### Sprint 4 — Tính năng nâng cao
- **Area Management**: 6 quận Đà Nẵng (Hải Châu, Sơn Trà, Thanh Khê, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ), filter dropdown
- **Real YOLO**: `download_model.py`, endpoint `/classify_batch`, threshold qua env, FE confirm modal khi confidence thấp
- **Admin User Management** `/admin/users`: CRUD + activate/deactivate + link xem hoạt động

## API Endpoints (chính)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/v1/auth/login/` | Đăng nhập (JWT) |
| POST | `/api/v1/auth/register/` | Đăng ký công dân |
| GET/PATCH | `/api/v1/auth/profile/` | Hồ sơ |
| POST | `/api/v1/auth/change_password/` | Đổi mật khẩu |
| GET | `/api/v1/users/?role=taskforce` | List users theo role (auth) |
| GET/POST/PATCH/DELETE | `/api/v1/admin/users/` | CRUD user (admin) |
| GET/POST | `/api/v1/assets/` | Tài sản |
| GET | `/api/v1/assets/heatmap/` | Heatmap data |
| GET | `/api/v1/assets/export/?format=csv` | Export CSV |
| GET/POST | `/api/v1/reports/` | Báo cáo |
| PATCH | `/api/v1/reports/{id}/update_status/` | Đổi trạng thái + auto pipeline |
| GET/POST | `/api/v1/reports/{id}/comments/` | Bình luận |
| GET | `/api/v1/reports/{id}/timeline/` | Timeline (từ audit) |
| GET | `/api/v1/reports/analytics/timeline/` | Số report theo bucket |
| GET | `/api/v1/reports/analytics/response_time/` | Avg thời gian xử lý |
| GET | `/api/v1/reports/analytics/hour_heatmap/` | Số report theo giờ |
| GET | `/api/v1/reports/analytics/top_areas/` | Top khu vực |
| GET | `/api/v1/reports/analytics/ai_accuracy/` | Phân bố confidence AI |
| GET/POST/PATCH | `/api/v1/tasks/` | Tác vụ (`?order=priority` cho priority queue) |
| PATCH | `/api/v1/tasks/{id}/complete/` | Hoàn thành (multipart: notes + completion_image) |
| GET/POST/PATCH | `/api/v1/maintenance/` | Bảo trì |
| GET | `/api/v1/notifications/` | Thông báo của tôi |
| PATCH | `/api/v1/notifications/{id}/read/` | Đánh dấu đã đọc |
| GET | `/api/v1/notifications/unread_count/` | Số chưa đọc |
| GET | `/api/v1/audit/` | Activity log (admin) |
| GET/POST/PATCH/DELETE | `/api/v1/areas/` | Khu vực Đà Nẵng |
| GET/PATCH | `/api/v1/system/settings/` | System settings |
| POST | `/classify` | AI phân loại 1 ảnh |
| POST | `/classify_batch` | AI phân loại nhiều ảnh |
| GET | `/health` | AI health check |

## Biến môi trường

```bash
# .env (root)
DJANGO_SECRET_KEY=...
DB_HOST=db
DB_NAME=public_infra_db
DB_USER=postgres
DB_PASSWORD=localdev
DB_PORT=5432
USE_POSTGIS=false             # true để bật PostGIS (cần GDAL + DB postgis)
REDIS_URL=redis://redis:6379/0
AI_SERVICE_URL=http://ai-service:8001
AI_CONFIDENCE_THRESHOLD=0.5

# Frontend
VITE_API_URL=http://localhost:8000
VITE_AI_API_URL=http://localhost:8001
VITE_CESIUM_ION_TOKEN=         # Để trống → tab Cesium 3D bị disable
```

## Workflow tự động (tóm tắt)

```
Citizen → tạo Report (AI tự phân loại nếu confidence ≥ threshold)
   ↓
Operator → review
   ↓
   ├─ Phân công taskforce → tự tạo Task + Notification
   │   ↓
   │   TaskForce → check-in + upload ảnh hoàn thành
   │   ↓
   │   Operator xác nhận → Report=resolved
   │       ↓
   │       Asset linked → tự tạo MaintenanceLog + cập nhật asset.status/last_maintained_at
   │       Citizen → nhận notification "Đã xử lý"
   │
   └─ Reject → Notification gửi reporter với lý do
```

## Git workflow (5 agent)

```
agent/{agent-name}/{type}-{feature}
```

Ví dụ: `agent/backend/feat-rbac`, `agent/frontend/feat-leaflet-map`.
