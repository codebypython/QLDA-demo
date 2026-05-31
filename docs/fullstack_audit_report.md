# 🔍 Báo cáo Kiểm thử Toàn diện: Đối chiếu Backend ↔ Frontend

**Hệ thống**: InfraWatch — Quản lý Hạ tầng Công cộng (Đà Nẵng)  
**Ngày kiểm tra**: 2026-06-01  
**Phạm vi**: 55 endpoint Backend (Django REST) ↔ 27 file Frontend (React/Vite)

---

## Tổng quan kiến trúc

| Thành phần | Công nghệ | Số lượng |
|---|---|---|
| Backend | Django 5 + DRF + SimpleJWT | 10 app, ~55 endpoint |
| Frontend | React 18 + Vite + Zustand + Axios | 11 trang, 7 component, 1 service, 1 store |
| Giao tiếp | JWT Bearer (access 1h, refresh 7d, rotation) | Axios interceptor tự refresh |

---

## BẢNG ĐỐI CHIẾU CHI TIẾT

### Module 1: AUTHENTICATION (Xác thực)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/login/` | BE: [urls.py](file:///d:/Development/projects/public-infra-system/backend/apps/users/urls.py), SimpleJWT `TokenObtainPairView` · FE: [LoginPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/LoginPage.jsx) | Nhận `{email, password}`, trả `{access, refresh}` (200) hoặc `401 {detail: "..."}` | UI gửi đúng params. Thành công: toast + navigate `/`. Lỗi: hiển thị `err.response?.data?.detail \|\| 'Sai thông tin đăng nhập'`. Button disabled + text "Đang đăng nhập..." khi loading. | ✅ Khớp hoàn toàn | — |
| 2 | `POST /auth/register/` | BE: `RegisterView` (CreateAPIView, AllowAny) · FE: [RegisterPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/RegisterPage.jsx) | Nhận `{email, username, password, password_confirm, full_name}`. Validate: password match, Django validators. Tạo user role='citizen'. `201` hoặc `400` field errors. | UI gửi đúng 5 trường. Client check password match trước. Lỗi: flatten `Object.values(data).flat().join(', ')` — hiển thị tất cả field errors. Loading indicator đúng. | ✅ Khớp hoàn toàn | — |
| 3 | `GET /auth/profile/` | BE: `ProfileView.get` (IsAuthenticated) · FE: [store/index.js](file:///d:/Development/projects/public-infra-system/frontend/src/store/index.js) `loadProfile()` | Trả `UserSerializer` data (200) hoặc `401`. | Gọi sau login và khi `isAuthenticated=true` (App.jsx useEffect). Lỗi: silently sets user=null. | ⚠️ Sai lệch Logic | **Lỗi im lặng**: Khi profile load fail (network error, 500), user bị set null + isAuthenticated=false → logout ngầm không thông báo. **Khuyến nghị**: Phân biệt 401 (cần re-auth) vs lỗi mạng (retry/toast). |
| 4 | `PATCH /auth/profile/` | BE: `ProfileView.patch` (IsAuthenticated, MultiPartParser) · FE: [ProfilePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ProfilePage.jsx) | Nhận partial user data (FormData cho avatar). `200` hoặc `400` validation. Role KHÔNG thể thay đổi qua serializer (read_only). | UI gửi FormData đúng. Email + role field `disabled`. Thành công: toast + reload profile. Lỗi: `err.response?.data?.detail \|\| 'Lỗi cập nhật'`. | ✅ Khớp hoàn toàn | — |
| 5 | `POST /auth/change_password/` | BE: `ChangePasswordView` · FE: [ProfilePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ProfilePage.jsx) | Nhận `{old_password, new_password}`. Validate old_password + Django validators. `200 {status:'ok'}` hoặc `400 {old_password: 'Mật khẩu hiện tại không đúng'}`. | UI kiểm tra client-side password confirm match. Lỗi: flatten errors hoặc 'Lỗi đổi mật khẩu'. | ⚠️ Sai lệch Logic | **Thiếu loading**: Không có loading indicator trên form đổi mật khẩu → user có thể double-submit. **Khuyến nghị**: Thêm local `changingPwd` state, disable button khi đang xử lý. |
| 6 | `POST /auth/refresh/` | BE: `TokenRefreshView` (AllowAny) · FE: [api.js](file:///d:/Development/projects/public-infra-system/frontend/src/services/api.js) interceptor | Nhận `{refresh}`, trả `{access, refresh}` (rotation). `401` nếu expired. | Axios interceptor tự gọi khi nhận 401. Thành công: retry request gốc. Thất bại: clear tokens + redirect `/login`. | ✅ Khớp hoàn toàn | Refresh token mới được lưu nhưng **không lưu refresh token mới** từ rotation response — chỉ lưu `data.access`. Xem line 28 api.js: thiếu `localStorage.setItem('refresh_token', data.refresh)`. |

> [!WARNING]
> **Line 28 api.js**: Token refresh chỉ lưu `access` mới mà KHÔNG lưu `refresh` mới. Với `ROTATE_REFRESH_TOKENS=True` (backend), refresh token cũ bị blacklist. → Sau lần refresh đầu tiên, các refresh tiếp theo sẽ FAIL → user bị logout sau 1h. 
> **Fix**: Thêm `localStorage.setItem('refresh_token', data.refresh);` tại line 29.

---

### Module 2: USERS ADMIN (Quản lý người dùng)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 7 | `GET /admin/users/` | BE: `UserViewSet.list` (IsAdmin) · FE: [UsersAdminPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/UsersAdminPage.jsx) | Query: `role`, `is_active`. Paginated AdminUserSerializer. | UI gửi `{role}` filter. Hiển thị table đúng. Loading: "Đang tải...". | ✅ Khớp hoàn toàn | — |
| 8 | `POST /admin/users/` | BE: `UserViewSet.create` (IsAdmin) · FE: [UsersAdminPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/UsersAdminPage.jsx) | Nhận `{email, username, full_name, role, password}`. `201` hoặc `400`. | UI gửi đúng. Lỗi: flatten errors tốt. | ✅ Khớp hoàn toàn | — |
| 9 | `PATCH /admin/users/{id}/` | BE: `UserViewSet.partial_update` (IsAdmin) · FE: **KHÔNG GỌI** | Cho phép update partial user data. | `usersAPI.adminUpdate()` **có khai báo** trong api.js (line 82) nhưng **KHÔNG ĐƯỢC GỌI** bởi bất kỳ component nào. UsersAdminPage chỉ có create/deactivate/activate/delete. | 🛑 Thiếu xử lý | **Dead code + Missing feature**: Không có UI để admin edit user (đổi role, tên, email). **Khuyến nghị**: Thêm edit inline hoặc modal trong UsersAdminPage, hoặc xóa dead code `adminUpdate`. |
| 10 | `DELETE /admin/users/{id}/` | BE: `UserViewSet.destroy` (IsAdmin) `204` · FE: [UsersAdminPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/UsersAdminPage.jsx) | Hard delete user, `204`. | UI dùng `confirm()` browser dialog. Lỗi: chỉ `toast.error('Lỗi')` — mất chi tiết. | ⚠️ Sai lệch Logic | **Generic error**: Backend có thể trả 404/403 với detail nhưng UI chỉ hiện "Lỗi". **Khuyến nghị**: `toast.error(err.response?.data?.detail \|\| 'Lỗi xóa user')`. |
| 11 | `PATCH .../deactivate/` + `activate/` | BE: `UserViewSet.deactivate/activate` (IsAdmin) · FE: [UsersAdminPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/UsersAdminPage.jsx) | Set `is_active=false/true`. `200`. | Toggle đúng. UI icon thay đổi. Lỗi: `toast.error('Lỗi')` — generic. | ⚠️ Sai lệch Logic | Cùng vấn đề generic error. |
| 12 | `GET /users/` | BE: `TaskforceListView` (IsAuthenticated) · FE: nhiều page | Trả `[{id, email, full_name, role}]` active users theo role. | ReportsPage, TasksPage, ReportDetailPage gọi `listByRole('taskforce')` cho assignment dropdown. Đúng. | ✅ Khớp hoàn toàn | — |

---

### Module 3: ASSETS (Quản lý tài sản)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 13 | `GET /assets/` | BE: `AssetViewSet.list` (ReadOnlyOrOperator) · FE: [AssetsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/AssetsPage.jsx), [store](file:///d:/Development/projects/public-infra-system/frontend/src/store/index.js) | Supports: `bbox`, `type`, `status`, `area`, `search`, `ordering`. Paginated. | AssetsPage dùng `fetchAssets()` không truyền filter params. MapPage truyền `{bbox}` khi pan map. | ⚠️ Sai lệch Logic | **Thiếu filter**: AssetsPage không có UI để filter theo type/status/search/area mặc dù backend hỗ trợ đầy đủ. **Khuyến nghị**: Thêm filter bar (type dropdown, status dropdown, search input). |
| 14 | `POST /assets/` | BE: `AssetViewSet.create` (operator/admin) · FE: [AssetsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/AssetsPage.jsx) | Nhận `{name, asset_type, latitude, longitude, status, installed_at, metadata}`. `201` + ActivityLog. | UI gửi `{name, asset_type, latitude, longitude}`. Thiếu: `installed_at`, `metadata`. Lỗi: chỉ `'Lỗi tạo tài sản'` generic. | ⚠️ Sai lệch Logic | **Thiếu trường**: Form tạo không có `installed_at` và `metadata`. **Lỗi generic**: Không hiển thị chi tiết validation error từ backend. |
| 15 | `PATCH /assets/{id}/` | BE: `AssetViewSet.partial_update` · FE: [AssetsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/AssetsPage.jsx) | Nhận partial data gồm name, asset_type, status, installed_at, latitude, longitude. `200` + ActivityLog. | UI edit form gửi `{name, asset_type, status, installed_at, latitude, longitude}` — đúng. Lỗi generic. | ✅ Khớp hoàn toàn | Edit form đầy đủ hơn create form (có thêm status, installed_at). |
| 16 | `DELETE /assets/{id}/` | BE: `AssetViewSet.destroy` (operator/admin) `204` + ActivityLog · FE: [AssetsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/AssetsPage.jsx) | Hard delete. | Dùng `confirm()` dialog. | ⚠️ Sai lệch Logic | **Inconsistent**: Dùng `confirm()` thay vì `ConfirmActionModal`. Xóa tài sản có thể ảnh hưởng task/maintenance liên kết → nên dùng ConfirmActionModal với acknowledge. |
| 17 | `GET /assets/heatmap/` | BE: `AssetViewSet.heatmap` · FE: **KHÔNG GỌI** | Trả `[{lat, lng, type, status}]` không phân trang. | `assetsAPI.heatmap()` khai báo tại api.js line 94 nhưng **không bao giờ được gọi**. LeafletMap HeatLayer dùng data assets list thay thế. | 🛑 Thiếu xử lý | **Dead code**: `assetsAPI.heatmap()` không dùng. Backend endpoint tồn tại nhưng frontend không gọi. Heatmap render từ asset list → không tối ưu (paginated data vs dedicated endpoint). |
| 18 | `GET /assets/stats/` | BE: `AssetViewSet.stats` · FE: [store](file:///d:/Development/projects/public-infra-system/frontend/src/store/index.js), [DashboardPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/DashboardPage.jsx) | Trả `{total, by_type, by_status}` từ ALL assets. | OperatorDashboard gọi `fetchStats()`. Dùng cho stat cards + Doughnut chart. Lỗi: silent. | ✅ Khớp hoàn toàn | — |
| 19 | `GET /assets/actions/export-csv/` | BE: `AssetViewSet.export` · FE: **Chỉ operator gọi** (nhưng quyền BE là ReadOnlyOrOperator) | Trả CSV file. Bất kỳ user auth đều đọc được. | Nút CSV chỉ hiện cho operator/admin trên UI — đúng UX intent. | ✅ Khớp hoàn toàn | Backend cho phép bất kỳ user auth nào export → OK vì data cũng public read. |

---

### Module 4: REPORTS (Báo cáo sự cố)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 20 | `GET /reports/` | BE: `ReportViewSet.list` (RBAC filtered) · FE: [store](file:///d:/Development/projects/public-infra-system/frontend/src/store/index.js), [ReportsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportsPage.jsx) | citizen→own, taskforce→linked tasks, operator→all. Filters: `status`, `bbox`. | UI truyền `{status}` filter. Area filter = client-side bbox check (không gửi `bbox` param). Table hiển thị đúng. | ✅ Khớp hoàn toàn | Area filter là client-side — hoạt động đúng nhưng không tối ưu nếu dataset lớn. |
| 21 | `POST /reports/` | BE: `ReportViewSet.create` (any auth) · FE: [ReportsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportsPage.jsx) | FormData: `{latitude, longitude, image?, description?, incident_type?, severity?, ai_confidence?}`. Reporter tự gán. `201`. | UI gửi FormData đúng gồm cả ai_confidence. AI classification flow: file→classify→auto-fill type nếu confidence≥0.5. | ✅ Khớp hoàn toàn | — |
| 22 | `GET /reports/{id}/` | BE: `ReportViewSet.retrieve` · FE: [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | Trả ReportSerializer gồm `tasks` list (id, status, completion_image, completion_notes, assigned_to_name). | UI dùng Promise.all gọi report + comments + timeline + taskforces. Hiển thị đầy đủ. | ✅ Khớp hoàn toàn | — |
| 23 | `PATCH /reports/{id}/` | BE: citizen→own+pending only (ReportCitizenUpdateSerializer), operator→ReportOperatorUpdateSerializer · FE: [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | citizen chỉ sửa `description, incident_type, severity, image` khi status=pending. | UI hiện nút Edit chỉ cho citizen (own, pending) HOẶC operator/admin → khớp. Gửi FormData đúng. | ✅ Khớp hoàn toàn | — |
| 24 | `DELETE /reports/{id}/` | BE: citizen(own+pending) / operator/admin. `204` + ActivityLog. · FE: [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | Hard delete. | UI hiện nút Delete đúng điều kiện. Dùng `confirm()`. Navigate `/reports` sau xóa. | ⚠️ Sai lệch Logic | **Inconsistent delete UX**: Xóa report dùng `confirm()` thay vì ConfirmActionModal, nhưng "hoàn tất" report lại dùng ConfirmActionModal. Nên thống nhất UX cho hành động destructive. |
| 25 | `PATCH /reports/{id}/update_status/` | BE: operator/admin only. Complex pipeline — xem bên dưới. · FE: [ReportsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportsPage.jsx), [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | **pending→assigned**: auto-create Task + Notification. **→resolved**: auto-create MaintenanceLog + update asset. **→rejected**: Notification to reporter. | **Gọi đúng**: UI gửi `{status, assigned_to?, reason?}`. Assign: modal chọn taskforce. Resolve: ConfirmActionModal (typed phrase). Reject: ConfirmActionModal (acknowledge + reason). | ✅ Khớp hoàn toàn | Luồng phức tạp nhất hệ thống — UI map đúng 100% backend pipeline. |
| 26 | `GET/POST /reports/{id}/comments/` | BE: ReportViewSet.comments · FE: [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | GET: trả comment list. POST: `{body}`, auto-set author+report. `201`. | UI: textarea + submit. Hiển thị list đúng. Lỗi: `toast.error('Lỗi gửi bình luận')`. | ✅ Khớp hoàn toàn | — |
| 27 | `PATCH/DELETE .../comments/{cid}/` | BE: author OR operator/admin. `403` cho unauthorized. · FE: [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | PATCH: `{body}`. DELETE: `204`. Permission: author + report access check. | UI: edit/delete buttons hiện cho own comment OR operator/admin → khớp. Lỗi hiển thị đúng. | ✅ Khớp hoàn toàn | — |
| 28 | `GET /reports/{id}/timeline/` | BE: ActivityLog filtered by report · FE: [ReportDetailPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportDetailPage.jsx) | Trả `[ActivityLogSerializer]` ordered by created_at ASC. | UI hiển thị timeline visualization đúng. | ✅ Khớp hoàn toàn | — |
| 29 | `GET /reports/stats/` | BE: `ReportViewSet.stats` (RBAC filtered queryset) · FE: [store](file:///d:/Development/projects/public-infra-system/frontend/src/store/index.js), [DashboardPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/DashboardPage.jsx) | `{total, by_type, by_status, avg_ai_confidence}`. | OperatorDashboard dùng cho stat cards + Bar chart. Lỗi: silent. | ✅ Khớp hoàn toàn | — |
| 30 | Analytics endpoints (5 endpoints) | BE: `analytics/timeline`, `response_time`, `hour_heatmap`, `top_areas`, `ai_accuracy` · FE: [AnalyticsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/AnalyticsPage.jsx) | 5 analytics endpoints trả dữ liệu chart. | UI gọi đủ 5 endpoints. Hiển thị 5 charts (Line, Bar×3, Doughnut). Bucket selector (day/week/month) cho timeline. | 🛑 Thiếu xử lý lỗi | **Silent errors toàn bộ**: Tất cả 5 analytics `.catch(() => {})`. Nếu API fail → charts trống, KHÔNG có thông báo. **Không có loading**: Charts hiển thị trống trong lúc chờ data. **Khuyến nghị**: Thêm loading skeleton + error fallback UI cho từng chart section. |
| 31 | `GET /reports/actions/export-csv/` | BE: ReportPermission · FE: [ReportsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportsPage.jsx) | CSV download. | Nút CSV chỉ hiện cho operator/admin. Gọi `downloadExport` function. | ✅ Khớp hoàn toàn | — |

---

### Module 5: TASKS (Tác vụ)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 32 | `GET /tasks/` | BE: `TaskViewSet.list` (TaskPermission, RBAC) · FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | taskforce→own only, operator→all. Filters: `assigned_to=me`, `status`, `order=priority`. | UI gửi `{order, status}` params đúng. TaskforceDashboard gọi `{assigned_to:'me', order:'priority'}`. | ✅ Khớp hoàn toàn | — |
| 33 | `POST /tasks/` | BE: `TaskViewSet.create` (operator/admin) · FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | Nhận `{title, description, report, related_asset, location_lat/lng, assigned_to, priority, status, due_date}`. created_by auto-set. | UI form: title (required), description, priority, report picker, asset picker, location picker, assigned_to. `normalizeLocationPayload()` validates coords. Nút tạo chỉ hiện cho operator/admin. | ✅ Khớp hoàn toàn | Validation tọa độ tốt nhất trong app — `normalizeLocationPayload()` kiểm tra cả NaN và pair completeness. |
| 34 | `PATCH /tasks/{id}/` (taskforce) | BE: [views.py](file:///d:/Development/projects/public-infra-system/backend/apps/tasks/views.py#L41-L80) Custom logic: chỉ cho phép update `status`, không cho set `completed`, validate transitions. `400` với messages cụ thể. | FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | Backend: 4 loại error messages cụ thể (task đã hoàn thành, chỉ status, dùng complete, transition không hợp lệ). Valid transitions: open↔assigned, open↔in_progress, assigned↔in_progress. | UI: Start button (Play icon) chỉ hiện cho taskforce + status=assigned. Gửi `{status:'in_progress'}`. Lỗi: `toast.error('Lỗi')` generic. | ⚠️ Sai lệch Logic | **Mất chi tiết lỗi quan trọng**: Backend trả 4 loại error message rất cụ thể bằng tiếng Việt ('Task đã hoàn thành', 'Chỉ được cập nhật trường status', v.v.) nhưng UI chỉ hiện "Lỗi". **Khuyến nghị**: `toast.error(err.response?.data?.detail \|\| 'Lỗi cập nhật')`. |
| 35 | `PATCH /tasks/{id}/` (operator) | BE: Standard ModelViewSet partial_update — full field access + ActivityLog. · FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | Operator có thể update mọi trường. | UI: Edit modal cho operator/admin với đầy đủ fields. Gọi `tasksAPI.update()` đúng. | ✅ Khớp hoàn toàn | — |
| 36 | `DELETE /tasks/{id}/` | BE: operator/admin. `204`. · FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | Hard delete. | Delete button cho operator/admin. Dùng `confirm()`. | ⚠️ Sai lệch Logic | **Inconsistent**: Dùng `confirm()` thay vì ConfirmActionModal. Task có thể liên kết report → nên cảnh báo rõ hơn. |
| 37 | `PATCH /tasks/{id}/complete/` | BE: [views.py](file:///d:/Development/projects/public-infra-system/backend/apps/tasks/views.py#L96-L126) Set completed + notes + image. Auto: report→in_progress, Notification→created_by. · FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | `{notes?, completion_image?}`. Status→completed, completed_at→now. Side effects: report status change + notification. | UI: CompleteModal với notes, image upload, acknowledge checkbox. Submit disabled until acknowledged. Gửi FormData khi có image, plain object khi không. | ✅ Khớp hoàn toàn | Excellent UX — ConfirmActionModal + CompleteModal đảm bảo user xác nhận trước khi hoàn thành. |
| 38 | `GET /tasks/actions/export-csv/` | BE: operator/admin (TaskPermission). CSV download. · FE: [TasksPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/TasksPage.jsx) | CSV columns: id, title, priority, status, assigned_to, created_by, due_date, completed_at, created_at. | Nút CSV chỉ hiện cho operator/admin. | ✅ Khớp hoàn toàn | — |

---

### Module 6: MAINTENANCE (Bảo trì)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 39 | `GET /maintenance/` | BE: `MaintenanceViewSet.list` (RBAC) · FE: [MaintenancePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/MaintenancePage.jsx) | taskforce→own, operator→all. Filters: `asset`, `status`. | UI gửi `{status}` filter. Table hiển thị đúng. | ✅ Khớp hoàn toàn | — |
| 40 | `POST /maintenance/` | BE: operator/admin/taskforce. Taskforce: auto-set technician, validate status≠completed, validate report link. · FE: [MaintenancePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/MaintenancePage.jsx) | `{asset, status, notes, scheduled_at?, report?}`. Taskforce validation: no completed status, report must have assigned task. | UI: Taskforce create form chỉ hiện `scheduled`/`in_progress` status options (line 154-159). Report picker chỉ hiện cho taskforce (line 235). | ✅ Khớp hoàn toàn | UI restrictive options khớp tốt với backend validation. |
| 41 | `PATCH /maintenance/{id}/` | BE: [serializers.py](file:///d:/Development/projects/public-infra-system/backend/apps/maintenance/serializers.py#L24-L31) Taskforce: chỉ `notes, scheduled_at, status`. Completed log không sửa được. Status=completed → auto update asset. · FE: [MaintenancePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/MaintenancePage.jsx) | Taskforce restricted to notes/scheduled_at/status. Operator: all fields. | UI edit form: operator hiện asset/technician/report fields thêm (line 300-319). Taskforce chỉ thấy status/schedule/notes (line 321-338). | ✅ Khớp hoàn toàn | UI field visibility khớp chính xác backend field restrictions. |
| 42 | `DELETE /maintenance/{id}/` | BE: operator/admin only. `204`. · FE: [MaintenancePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/MaintenancePage.jsx) | Hard delete. | Delete button chỉ cho operator (line 404). Dùng `confirm()`. | ✅ Khớp hoàn toàn | — |
| 43 | Maintenance complete flow | BE: `perform_update` — khi status='completed': set completed_at, update asset last_maintained_at, reset asset status to active nếu damaged/maintenance. · FE: [MaintenancePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/MaintenancePage.jsx) | Side effect tự động khi update. | UI: ConfirmActionModal cho "Hoàn thành" (line 417-425). Button hiện cho status≠completed (line 396). Gọi `maintenanceAPI.update(id, {status:'completed'})`. | ✅ Khớp hoàn toàn | — |
| 44 | `GET /maintenance/actions/export-csv/` | BE: operator/admin. · FE: [MaintenancePage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/MaintenancePage.jsx) | CSV download. | Nút CSV chỉ operator/admin. | ✅ Khớp hoàn toàn | — |

---

### Module 7: NOTIFICATIONS (Thông báo)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 45 | `GET /notifications/` | BE: `NotificationViewSet.list` (own only, supports `unread=true`) · FE: [NotificationBell.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/components/common/NotificationBell.jsx) | Paginated notifications. | UI gọi `list()` + `unreadCount()` mỗi 30s (polling). Hiển thị 10 items. Click → markRead + navigate. | ✅ Khớp hoàn toàn | Polling interval khớp với `notification_polling_seconds` default (30s) nhưng **hardcoded** — không đọc từ system settings. |
| 46 | `PATCH /notifications/{id}/read/` | BE: set is_read=true. `200`. · FE: [NotificationBell.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/components/common/NotificationBell.jsx) | Mark single notification read. | UI: onClick handler gọi markRead + decrement local count (optimistic). | ✅ Khớp hoàn toàn | — |
| 47 | `POST /notifications/mark_all_read/` | BE: Bulk update all unread→read. `200 {status:'ok'}`. · FE: [NotificationBell.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/components/common/NotificationBell.jsx) | Marks all unread as read. | UI: "Đã đọc hết" button. After success: set count=0, refresh list. | ✅ Khớp hoàn toàn | — |
| 48 | `GET /notifications/unread_count/` | BE: `{unread: count}` · FE: [NotificationBell.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/components/common/NotificationBell.jsx) | Returns count of unread notifications. | Badge hiển thị count, max "9+". | ✅ Khớp hoàn toàn | — |

---

### Module 8: AUDIT LOG (Nhật ký hoạt động)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 49 | `GET /audit/` | BE: `ActivityLogListView` (IsAdmin) · FE: [ActivityPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/ActivityPage.jsx) | Filters: `actor`, `verb`, `target_type`, `since`. Paginated. | UI gửi `{actor, verb}` từ URL params + verb input. Hiển thị timeline-style. | ⚠️ Sai lệch Logic | **1)** Verb filter input triggers API on EVERY keystroke — no debounce → tạo nhiều requests thừa. **2)** Backend supports `target_type` và `since` filters nhưng UI không cung cấp. **3)** Details hiển thị raw JSON — không user-friendly. **Khuyến nghị**: Thêm debounce (300ms), target_type dropdown, date range picker, và format details thành human-readable text. |

---

### Module 9: AREAS (Khu vực)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 50 | CRUD `/areas/` | BE: `AreaViewSet` (ReadOnlyAuthenticatedOrAdminWrite) · FE: [AreasAdminPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/AreasAdminPage.jsx) | Create: `{name, code, bbox_min_lng, bbox_min_lat, bbox_max_lng, bbox_max_lat, manager?}`. Code unique. | UI: form với required name/code/bbox. Manager optional. `parseFloat` on bbox. Dual-purpose form (create/edit). | ⚠️ Sai lệch Logic | **NaN risk**: `parseFloat` trên bbox values không kiểm tra NaN — nếu user nhập text, gửi NaN tới backend → 400 nhưng error message không rõ ràng. **Khuyến nghị**: Thêm client-side NaN check trước submit. |
| 51 | `DELETE /areas/{id}/` | BE: Admin only. `204`. · FE: [AreasAdminPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/AreasAdminPage.jsx) | Hard delete. | Dùng `confirm()`. Lỗi: `toast.error('Lỗi xóa')`. | ✅ Khớp hoàn toàn | — |

---

### Module 10: SYSTEM SETTINGS (Cài đặt hệ thống)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 52 | `GET /system/settings/` | BE: `SettingsView.get` (IsAuthenticated) — merge DEFAULT + DB. · FE: [SettingsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/SettingsPage.jsx) | Returns merged settings object. Any authenticated user can read. | UI: admin-only page. Form fields: system_name, logo_url, ai_confidence_threshold (0-1), map center, notification_polling_seconds. | ✅ Khớp hoàn toàn | — |
| 53 | `PATCH /system/settings/` | BE: `SettingsView.patch` (IsAdmin) — body must be dict. · FE: [SettingsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/admin/SettingsPage.jsx) | Updates key-value pairs. `400` if not dict. | UI gửi full settings object. Thành công: toast + reload. Lỗi: `toast.error('Lỗi lưu')`. | ⚠️ Sai lệch Logic | **Settings không được ứng dụng runtime**: `notification_polling_seconds` được lưu nhưng NotificationBell hardcode 30000ms. `ai_confidence_threshold` được lưu nhưng ReportsPage hardcode 0.5. **Khuyến nghị**: Components nên đọc settings từ system API hoặc global state thay vì hardcode. |

---

### Module 11: AI SERVICE (Phân loại AI)

| STT | Chức năng / Endpoint | Vị trí mã nguồn | Mô tả Logic Backend | Thực tế hiển thị UI | Trạng thái | Chi tiết sai lệch & Khuyến nghị |
|---|---|---|---|---|---|---|
| 54 | `POST /classify` (AI Service) | BE: Separate AI microservice (port 8001) · FE: [api.js](file:///d:/Development/projects/public-infra-system/frontend/src/services/api.js#L192-L198) | FormData `{file}` → `{primary_class, confidence, ...}` | UI: gọi ngay khi user chọn ảnh. Confidence ≥ 0.5 → auto-fill type + toast. < 0.5 → pending UI. Error → `'AI service không khả dụng'`. | ✅ Khớp hoàn toàn | Dùng raw axios (không JWT interceptor) — đúng vì AI service không cần auth. |
| 55 | `POST /classify_batch` (AI Service) | FE: [api.js](file:///d:/Development/projects/public-infra-system/frontend/src/services/api.js#L199-L205) | Batch classification. | **Dead code**: Khai báo nhưng KHÔNG bao giờ được gọi. | 🛑 Thiếu xử lý | **Dead code**. Nếu không cần batch classify, nên xóa để giữ code sạch. |

---

## TỔNG HỢP KẾT QUẢ

### Thống kê trạng thái đối chiếu

| Trạng thái | Số lượng | Tỷ lệ |
|---|---|---|
| ✅ Khớp hoàn toàn | 37 | 67.3% |
| ⚠️ Sai lệch Logic | 14 | 25.5% |
| 🛑 Thiếu xử lý / Dead code | 4 | 7.3% |
| ❌ Lỗi hiển thị nghiêm trọng | 0 | 0% |
| **Tổng** | **55** | **100%** |

---

## CÁC VẤN ĐỀ NGHIÊM TRỌNG (CRITICAL)

> [!CAUTION]
> ### 1. Token Refresh Không Lưu Refresh Token Mới
> **File**: [api.js](file:///d:/Development/projects/public-infra-system/frontend/src/services/api.js#L27-L29)  
> **Vấn đề**: Với `ROTATE_REFRESH_TOKENS=True`, sau mỗi lần refresh, token cũ bị blacklist. Nhưng frontend chỉ lưu `access` mới, KHÔNG lưu `refresh` mới.  
> **Hậu quả**: User bị logout tự động sau 1 giờ (khi access token hết hạn lần 2).  
> **Fix**:
> ```diff
>   const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh/`, { refresh });
>   localStorage.setItem('access_token', data.access);
> + localStorage.setItem('refresh_token', data.refresh);
>   error.config.headers.Authorization = `Bearer ${data.access}`;
> ```

> [!CAUTION]
> ### 2. System Settings Không Được Áp Dụng Runtime
> **Vấn đề**: `notification_polling_seconds` và `ai_confidence_threshold` được admin cài đặt qua UI nhưng frontend hardcode giá trị mặc định.
> - [NotificationBell.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/components/common/NotificationBell.jsx): hardcode `30000ms`
> - [ReportsPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/ReportsPage.jsx#L76): hardcode `0.5`
> 
> **Fix**: Tạo Zustand store cho system settings, load on app init, use throughout.

---

## CÁC VẤN ĐỀ QUAN TRỌNG (IMPORTANT)

> [!IMPORTANT]
> ### 3. Error Messages Bị Mất Chi Tiết
> **15+ chỗ** dùng `toast.error('Lỗi')` generic thay vì hiển thị `err.response?.data?.detail`.  
> Đặc biệt nghiêm trọng ở:
> - Task status transitions (backend trả 4 loại error message tiếng Việt rất cụ thể)
> - User admin operations
> - Maintenance operations
> 
> **Fix pattern**: `toast.error(err.response?.data?.detail || 'Lỗi mặc định')`

> [!IMPORTANT]
> ### 4. Thiếu Loading Indicators
> Các trang/section sau KHÔNG có loading indicator:
> - Dashboard sub-dashboards (3 variants)
> - Analytics (5 charts)
> - Profile forms
> - Settings page
> - Areas admin
> - Activity page
> 
> User không biết data đang load → cảm giác unresponsive.

> [!IMPORTANT]
> ### 5. Silent Error Swallowing
> **Patern**: `.catch(() => {})` — hoàn toàn im lặng.
> - Dashboard: 3 sub-dashboards
> - Analytics: 5 endpoints
> - Store: fetchAssets error, fetchStats error
> - NotificationBell: 3 API calls
> 
> **Hậu quả**: Nếu API fail (server down, network issue), user thấy trang trống mà không biết lý do.

---

## CÁC VẤN ĐỀ PHỤ (MINOR)

> [!WARNING]
> ### 6. Dead Code (3 instances)
> | Code | File | Trạng thái |
> |---|---|---|
> | `assetsAPI.heatmap()` | api.js:94 | Khai báo, không gọi |
> | `aiAPI.classifyBatch()` | api.js:199-205 | Khai báo, không gọi |
> | `usersAPI.adminUpdate()` | api.js:82 | Khai báo, không gọi → thiếu Edit User feature |

> [!WARNING]
> ### 7. Inconsistent Delete Confirmation
> | Dùng `confirm()` | Dùng ConfirmActionModal |
> |---|---|
> | Assets delete | Report finalize (resolve) |
> | Tasks delete | Task complete |
> | Maintenance delete | Maintenance complete |
> | Users delete | Report reject |
> | Areas delete | — |
> | Report delete | — |
> 
> **Khuyến nghị**: Thống nhất dùng ConfirmActionModal cho tất cả destructive actions.

> [!NOTE]
> ### 8. Thiếu Pagination Frontend
> Backend hỗ trợ pagination (PAGE_SIZE=50), nhưng frontend KHÔNG implement:
> - Không có next/prev buttons
> - Không có page selector
> - `data.results || data` pattern bỏ qua pagination metadata (`count`, `next`, `previous`)
> 
> Với dataset nhỏ (demo) thì OK, nhưng production cần implement.

> [!NOTE]
> ### 9. Demo Credentials Hardcoded
> [LoginPage.jsx](file:///d:/Development/projects/public-infra-system/frontend/src/pages/LoginPage.jsx#L8-L9): `admin@infra.local / admin123456` là default values của email/password inputs → visible trong source code.

> [!NOTE]
> ### 10. Assets Create Form Thiếu Trường
> Create form thiếu `installed_at` và `metadata` mà backend hỗ trợ. Edit form có `installed_at` nhưng create form không có → inconsistent.

---

## ĐÁNH GIÁ TỔNG THỂ

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| **API Coverage** | 9/10 | 52/55 endpoints được gọi đúng. 3 dead code. |
| **Parameter Matching** | 9/10 | Params gửi đúng. Thiếu vài trường optional (installed_at cho asset create). |
| **Success Handling** | 9/10 | Toast messages + state refresh đúng ở hầu hết chỗ. |
| **Error Handling** | 5/10 | Nhiều generic errors, silent catches, mất backend detail. |
| **Loading States** | 6/10 | Tables có "Đang tải", forms/dashboards/analytics thiếu. |
| **Permission/RBAC UI** | 10/10 | Role-based routing + conditional UI khớp 100% backend permissions. |
| **Business Logic Sync** | 9/10 | Luồng report→task→maintenance→notification khớp đúng. |
| **State Management** | 8/10 | Zustand cho shared data, local state cho forms. Thiếu caching cho tasks/maintenance. |
| **Form Validation** | 6/10 | Validation tốt ở Tasks (normalizeLocation), nhưng thiếu ở Reports, Assets, Areas. |
| **UX Consistency** | 7/10 | Mixed confirm patterns, no pagination, no search filters. |
| **Tổng** | **7.8/10** | Hệ thống hoạt động đúng logic cốt lõi. Cần cải thiện error handling, loading UX, và tính nhất quán. |
