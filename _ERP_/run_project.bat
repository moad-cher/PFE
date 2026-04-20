REM filepath: c:\Users\acer\Desktop\stage\_ERP_\run_project.bat
@echo off
setlocal

echo ==============================================
echo   Starting FastAPI backend + React frontend
echo   (Localhost only)
echo ==============================================
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

if not exist "%BACKEND_DIR%\app\main.py" (
  echo [ERROR] Backend not found at:
  echo         %BACKEND_DIR%
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend not found at:
  echo         %FRONTEND_DIR%
  pause
  exit /b 1
)

echo [1/2] Starting backend on localhost:8001 (external window) ...
start "FastAPI Backend" cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"

timeout /t 2 /nobreak > nul
echo [2/2] Starting frontend on localhost:5173 (external window) ...
start "React Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Both services are starting in separate windows.
echo Backend: http://localhost:8001
echo Frontend: http://localhost:5173
echo.

exit /b 0
