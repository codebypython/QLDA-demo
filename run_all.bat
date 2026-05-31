@echo off
:: Enable UTF-8 encoding for CMD console to display Vietnamese characters nicely
chcp 65001 > nul

echo ====================================================================
echo                 InfraWatch - HỆ THỐNG QUẢN LÝ HẠ TẦNG
echo              KỊCH BẢN KHỞI ĐỘNG NHANH TOÀN BỘ LOCAL (HOST)
echo ====================================================================
echo.

echo [1/3] Đang khởi động Backend Django (Cổng 8000)...
start "InfraWatch Backend (Port 8000)" cmd /k "cd backend && venv\Scripts\activate && python manage.py migrate && python manage.py runserver"

echo [2/3] Đang khởi động AI Service FastAPI (Cổng 8001)...
start "InfraWatch AI Service (Port 8001)" cmd /k "cd ai-service && venv\Scripts\activate && python -m uvicorn main:app --port 8001"

echo [3/3] Đang khởi động Frontend React (Cổng 5173)...
start "InfraWatch Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================================
echo Khởi động hoàn tất! Các cửa sổ terminal riêng biệt đã được mở.
echo.
echo - Bản đồ ^& Dashboard Frontend: http://localhost:5173
echo - API Backend: http://localhost:8000/api/v1/
echo - Tài liệu AI API Swagger: http://localhost:8001/docs
echo ====================================================================
echo * Mẹo: Để dừng hệ thống, chỉ cần tắt các cửa sổ terminal hoặc nhấn Ctrl+C.
echo.
pause
