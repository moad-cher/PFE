@echo off
echo ================================================================
echo   Cleaning up setup scripts from backend_by_domain
echo ================================================================
echo.

cd /d "%~dp0"

echo Deleting setup scripts...
del build_domain_backend.py
del create_dirs.py
del setup_structure.py
del create_structure.bat
del SETUP.bat
del RUN_SETUP.bat
del START_HERE.txt

echo.
echo Deleting Python cache directories...
rmdir /s /q app\__pycache__ 2>nul
for /d /r app %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"

echo.
echo ================================================================
echo   ✅ Cleanup complete!
echo ================================================================
echo.
echo Your backend_by_domain is now clean and production-ready!
echo.
echo Kept files (useful):
echo   - README.md (documentation)
echo   - ARCHITECTURE.md (visual guide)
echo   - create_db.py (database initialization)
echo   - smoke_test.py (API testing)
echo   - ws_smoke_test.py (WebSocket testing)
echo.
pause
