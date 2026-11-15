Write-Host "========================================================" -ForegroundColor Green
Write-Host "Starting PhytoVision AI (Backend + Frontend)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend in separate window
Write-Host "Starting Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root'; & '$Root\backend\venv\Scripts\python.exe' -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

# 2. Start Frontend in separate window
Write-Host "Starting Frontend on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\frontend'; npm run dev"

Write-Host ""
Write-Host "Both servers launched in separate windows!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "Swagger:  http://127.0.0.1:8000/docs" -ForegroundColor Yellow

