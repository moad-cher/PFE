@echo off
setlocal

echo ==============================================
echo   Starting FastAPI backend + React frontend
echo ==============================================
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend\backend_by_domain"
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

echo [1/2] Starting backend on http://localhost:8001 ...
start "FastAPI Backend" cmd /k "cd /d "%BACKEND_DIR%" && python -m uvicorn app.main:app --port 8001"

echo [2/2] Starting frontend on http://localhost:5173 ...
start "React Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Done. Two terminals were opened:
echo  - FastAPI Backend: http://localhost:8001
echo  - React Frontend:  http://localhost:5173
echo.
echo Close this window or press any key.
pause > nul
