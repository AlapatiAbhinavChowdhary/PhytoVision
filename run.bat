@echo off
title PhytoVision AI Launcher
echo ========================================================
echo Starting PhytoVision AI (Backend + Frontend)
echo ========================================================

:: 1. Launch FastAPI Backend in a new window
echo Starting Backend API on http://127.0.0.1:8000 ...
start "PhytoVision Backend" cmd /k "cd /d %~dp0 && backend\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

:: 2. Launch Vite Frontend in a new window
echo Starting Vite Frontend on http://localhost:5173 ...
start "PhytoVision Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo Both servers launched in separate windows!
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo - Swagger:  http://127.0.0.1:8000/docs
echo ========================================================
echo (Keep the two new command windows open while using the app)
pause

