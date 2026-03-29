@echo off
setlocal

echo ==============================================
echo   Starting FastAPI backend + React frontend
echo   (Accessible from local WiFi devices)
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

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :gotip
)
:gotip
REM Remove leading space
set "LOCAL_IP=%LOCAL_IP: =%"

echo [1/2] Starting backend on 0.0.0.0:8001 ...
start "FastAPI Backend" cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo [2/2] Starting frontend on 0.0.0.0:5173 ...
start "React Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev -- --host"

echo.
echo ==============================================
echo   SERVERS STARTED - Accessible on LAN!
echo ==============================================
echo.
echo Local access:
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:8001
echo.
echo LAN access (from other devices):
echo   - Frontend:  http://%LOCAL_IP%:5173
echo   - Backend:   http://%LOCAL_IP%:8001
echo.
echo ==============================================
echo Close this window or press any key.
pause > nul
