# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "                InfraWatch Da Nang" -ForegroundColor Cyan
Write-Host "             KICH BAN KHOI DONG NHANH TOAN BO" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Dang khoi dong Backend Django (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; venv\Scripts\activate; python manage.py migrate; python manage.py runserver"

Write-Host "[2/3] Dang khoi dong AI Service FastAPI (Port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-service; venv\Scripts\activate; python -m uvicorn main:app --port 8001"

Write-Host "[3/3] Dang khoi dong Frontend React (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "Khoi dong hoan tat! Cac cua so terminal da duoc mo." -ForegroundColor Green
Write-Host ""
Write-Host "- Dashboard Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "- API Backend: http://localhost:8000/api/v1/" -ForegroundColor Green
Write-Host "- AI Service Swagger: http://localhost:8001/docs" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "* Meo: De dung he thong, hay dong cac cua so terminal." -ForegroundColor Green
Write-Host ""
