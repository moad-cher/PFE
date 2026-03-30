@echo off
echo Starting ERP System...
echo.

REM Start Backend
start "ERP Backend" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start Frontend
start "ERP Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Open a general terminal at project root
start "ERP Terminal" cmd /k "cd /d %~dp0"

echo.
echo ===================================
echo ERP System Started!
echo ===================================
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:5173
echo ===================================
echo.
pause
