@echo off
echo ================================================================
echo   Building Domain-Driven Backend Structure
echo ================================================================
echo.
echo This script will:
echo   1. Create directory structure for all domains
echo   2. Copy and reorganize all files from backend_by_architecture
echo   3. Update import statements for domain-driven design
echo   4. Copy supporting files (.env, requirements.txt, etc.)
echo.
pause

cd /d "%~dp0"

echo.
echo Step 1: Running Python build script...
echo ----------------------------------------------------------------
python build_domain_backend.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build script failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Copying supporting files...
echo ----------------------------------------------------------------

REM Copy .env file
if exist "..\backend_by_architecture\.env" (
    copy "..\backend_by_architecture\.env" ".env" >nul
    echo   ✓ .env
)

REM Copy requirements.txt
if exist "..\backend_by_architecture\requirements.txt" (
    copy "..\backend_by_architecture\requirements.txt" "requirements.txt" >nul
    echo   ✓ requirements.txt
)

REM Copy alembic configuration
if exist "..\backend_by_architecture\alembic.ini" (
    copy "..\backend_by_architecture\alembic.ini" "alembic.ini" >nul
    echo   ✓ alembic.ini
)

REM Copy alembic folder
if exist "..\backend_by_architecture\alembic" (
    xcopy "..\backend_by_architecture\alembic" "alembic\" /E /I /Y >nul
    echo   ✓ alembic\ (folder)
)

REM Copy database creation script
if exist "..\backend_by_architecture\create_db.py" (
    copy "..\backend_by_architecture\create_db.py" "create_db.py" >nul
    echo   ✓ create_db.py
)

REM Copy smoke test scripts
if exist "..\backend_by_architecture\smoke_test.py" (
    copy "..\backend_by_architecture\smoke_test.py" "smoke_test.py" >nul
    echo   ✓ smoke_test.py
)

if exist "..\backend_by_architecture\ws_smoke_test.py" (
    copy "..\backend_by_architecture\ws_smoke_test.py" "ws_smoke_test.py" >nul
    echo   ✓ ws_smoke_test.py
)

REM Create media directory
if not exist "media" (
    mkdir media
    echo   ✓ media\ (folder created)
)

echo.
echo ================================================================
echo   ✅ SUCCESS! Domain-driven backend is ready!
echo ================================================================
echo.
echo The new structure is organized by domains:
echo   📁 app/
echo      ├── core/            (shared infrastructure)
echo      ├── websockets/      (shared WebSocket manager)
echo      ├── auth/            (authentication)
echo      ├── users/           (user management)
echo      ├── projects/        (project management)
echo      ├── tasks/           (task management)
echo      ├── hiring/          (recruitment)
echo      ├── notifications/   (notifications system)
echo      ├── messaging/       (chat & messaging)
echo      ├── ai/              (AI integration)
echo      └── main.py          (FastAPI app)
echo.
echo To run the backend:
echo   python -m uvicorn app.main:app --port 8001 --reload
echo.
echo Or use the run script from the root:
echo   run_fastapi_project.bat (update path to backend_by_domain)
echo.
echo ================================================================
pause
