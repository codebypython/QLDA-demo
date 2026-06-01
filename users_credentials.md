# Danh Sách Tài Khoản & Mật Khẩu Hệ Thống InfraWatch

Tài liệu này cung cấp chi tiết toàn bộ các tài khoản mặc định được khởi tạo (seeded) trong cơ sở dữ liệu của hệ thống quản lý hạ tầng InfraWatch Da Nang để phục vụ công tác kiểm thử, demo và đánh giá phân quyền (RBAC).

> [!WARNING]
> Tài liệu này chứa thông tin tài khoản và mật khẩu dùng cho việc phát triển và thử nghiệm cục bộ. Vui lòng bảo mật thông tin và không sử dụng các mật khẩu này trong môi trường vận hành thực tế (Production).

---

## 1. Vai trò Quản trị viên (Admin)
Quản trị viên có toàn quyền kiểm soát hệ thống, cấu hình tham số AI/Bản đồ, CRUD mọi thực thể và theo dõi nhật ký hoạt động (Activity Logs).

| Họ và tên | Username | Email | Mật khẩu | Chức vụ |
| :--- | :--- | :--- | :--- | :--- |
| **Lê Hoàng Admin** | `admin` | `admin@infra.local` | `admin123456` | System Admin |

---

## 2. Vai trò Điều hành viên (Operator)
Điều hành viên chịu trách nhiệm kiểm duyệt báo cáo sự cố, phân công tác vụ xử lý cho Đội phản ứng nhanh và theo dõi tiến độ bảo trì.

| Họ và tên | Username | Email | Mật khẩu | Chức vụ |
| :--- | :--- | :--- | :--- | :--- |
| **Nguyễn Văn Điều Hành** | `operator1` | `operator1@infra.local` | `operator123` | Điều hành hệ thống |
| **Trần Thị Kiểm Duyệt** | `operator2` | `operator2@infra.local` | `operator123` | Kiểm duyệt viên |

---

## 3. Vai trò Đội phản ứng nhanh (TaskForce)
Đội phản ứng nhanh nhận các tác vụ sửa chữa, cập nhật trạng thái thi công và gửi hình ảnh nghiệm thu thực tế để hoàn thành công việc.

| Họ và tên | Username | Email | Mật khẩu | Chức vụ / Lĩnh vực |
| :--- | :--- | :--- | :--- | :--- |
| **Trần Văn Đội 1 (Đường Bộ)** | `tf1` | `tf1@infra.local` | `taskforce123` | Đội 1 - Hạ tầng giao thông, đường bộ |
| **Phạm Minh Đội 2 (Thiết Bị)** | `tf2` | `tf2@infra.local` | `taskforce123` | Đội 2 - Thiết bị công cộng, chiếu sáng |
| **Lê Hoàng Đội 3 (Môi Trường)** | `tf3` | `tf3@infra.local` | `taskforce123` | Đội 3 - Vệ sinh đô thị, môi trường |

---

## 4. Vai trò Người dân (Citizen)
Người dân có thể gửi báo cáo sự cố hạ tầng bằng hình ảnh/bản đồ, theo dõi quá trình xử lý sự cố của mình và tương tác bình luận.

| Họ và tên | Username | Email | Mật khẩu | Chức vụ |
| :--- | :--- | :--- | :--- | :--- |
| **Đặng Hoàng Công Dân** | `citizen` | `citizen@infra.local` | `citizen123` | Công dân |
| **Lê Thị Dân Trí** | `citizen1` | `citizen1@infra.local` | `citizen123` | Công dân |
| **Nguyễn Hữu Báo Cáo** | `citizen2` | `citizen2@infra.local` | `citizen123` | Công dân |
| **Trần Minh Tuấn** | `citizen3` | `citizen3@infra.local` | `citizen123` | Công dân |
| **Phạm Thu Thảo** | `citizen4` | `citizen4@infra.local` | `citizen123` | Công dân |

---

## 5. Hướng dẫn Đăng nhập nhanh
1. Mở trang đăng nhập: `http://localhost:5173/login` (hoặc IP mạng LAN tương ứng của máy chủ).
2. Sao chép và dán địa chỉ **Email** và **Mật khẩu** tương ứng từ danh sách trên để kiểm thử hành vi giao diện tương ứng với từng phân quyền RBAC.
