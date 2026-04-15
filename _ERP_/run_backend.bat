@echo off
setlocal

echo ==============================================
echo   Starting FastAPI Backend (External Window)
echo ==============================================
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"

if not exist "%BACKEND_DIR%\app\main.py" (
  echo [ERROR] Backend not found at:
  echo         %BACKEND_DIR%
  pause
  exit /b 1
)

echo Starting backend on localhost:8001 ...
cd /d "%BACKEND_DIR%"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

pause
