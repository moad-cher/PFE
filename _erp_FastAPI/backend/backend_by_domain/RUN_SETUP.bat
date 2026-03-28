@echo off
echo ================================================================
echo   SIMPLE SETUP - Building Domain Backend
echo ================================================================
echo.

cd /d "%~dp0"

echo Running Python build script...
python build_domain_backend.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo   SUCCESS! Now copying supporting files...
    echo ================================================================
    
    REM Copy supporting files
    copy "..\backend_by_architecture\.env" ".env" 2>nul
    copy "..\backend_by_architecture\requirements.txt" "requirements.txt" 2>nul
    copy "..\backend_by_architecture\alembic.ini" "alembic.ini" 2>nul
    copy "..\backend_by_architecture\create_db.py" "create_db.py" 2>nul
    copy "..\backend_by_architecture\smoke_test.py" "smoke_test.py" 2>nul
    copy "..\backend_by_architecture\ws_smoke_test.py" "ws_smoke_test.py" 2>nul
    
    xcopy "..\backend_by_architecture\alembic" "alembic\" /E /I /Y /Q 2>nul
    
    if not exist "media" mkdir media
    
    echo.
    echo ================================================================
    echo   ALL DONE! Backend structure created!
    echo ================================================================
    echo.
    echo Next: Test with:
    echo   python -m uvicorn app.main:app --port 8001
    echo.
) else (
    echo.
    echo ================================================================
    echo   ERROR! Build script failed. See error above.
    echo ================================================================
    echo.
)

pause
