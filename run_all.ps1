# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "                InfraWatch Da Nang" -ForegroundColor Cyan
Write-Host "         KICH BAN KHOI DONG HE THONG DA CLIENT" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Detect active physical IPv4 address in network
Write-Host "[*] Dang do tim dia chi IP noi bo dang hoat dong..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and 
    $_.InterfaceAlias -notlike "*VirtualBox*" -and 
    $_.InterfaceAlias -notlike "*VMware*" -and 
    $_.InterfaceAlias -notlike "*vEthernet*" 
} | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    # Fallback to any non-loopback IP
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
}

if (-not $ipAddress) {
    $ipAddress = "localhost"
    Write-Host "[!] Khong tim thay card mang LAN/Wi-Fi. Khoi dong mac dinh tren localhost." -ForegroundColor LightRed
} else {
    Write-Host "[+] Phat hien dia chi IP mang LAN/Wi-Fi: $ipAddress" -ForegroundColor Green
}

# Step 2: Auto-rewrite frontend/.env with current network IP
Write-Host "[*] Tu dong dong bo hoa tap tin frontend/.env..." -ForegroundColor Yellow
$envContent = @"
VITE_CESIUM_ION_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhMzJlN2MzZi1hZmFkLTQ5MmQtOGViMS1lZWNhM2U4YWQ4OGEiLCJpZCI6NDM4Njc2LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODAyNDk3NTh9.WCuIzXWc0-bQVXG1PL-kPEmJYkhSHMBMPnrqqI6QAvg
VITE_API_URL=http://$($ipAddress):8000
VITE_AI_API_URL=http://$($ipAddress):8001
"@
Set-Content -Path "frontend/.env" -Value $envContent -Encoding UTF8
Write-Host "[+] Da ghi de file '.env' thanh cong." -ForegroundColor Green

# Step 3: Start Services listening on 0.0.0.0
Write-Host ""
Write-Host "[1/3] Dang khoi dong Backend Django (Port 8000, ho tro LAN)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; venv\Scripts\activate; python manage.py migrate; python manage.py runserver 0.0.0.0:8000"

Write-Host "[2/3] Dang khoi dong AI Service FastAPI (Port 8001, ho tro LAN)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-service; venv\Scripts\activate; python -m uvicorn main:app --host 0.0.0.0 --port 8001"

Write-Host "[3/3] Dang khoi dong Frontend React (Port 5173, ho tro LAN)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --host"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "Khoi dong hoan tat! Cac cua so terminal da duoc mo." -ForegroundColor Green
Write-Host ""
Write-Host "- Dashboard Frontend: http://localhost:5173" -ForegroundColor Green
if ($ipAddress -ne "localhost") {
    Write-Host "- Truy cap tu Smartphone (Chung Wi-Fi): http://$($ipAddress):5173" -ForegroundColor Cyan
}
Write-Host "- API Backend: http://$($ipAddress):8000/api/v1/" -ForegroundColor Green
Write-Host "- AI Service Swagger: http://$($ipAddress):8001/docs" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "* Meo: De dung he thong, hay dong cac cua so terminal." -ForegroundColor Green
Write-Host ""
