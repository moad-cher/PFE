@echo off
echo Creating backend_by_domain directory structure...

set BASE=c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_domain\app

mkdir "%BASE%\core" 2>nul
mkdir "%BASE%\websockets" 2>nul
mkdir "%BASE%\auth" 2>nul
mkdir "%BASE%\users" 2>nul
mkdir "%BASE%\projects" 2>nul
mkdir "%BASE%\tasks" 2>nul
mkdir "%BASE%\hiring" 2>nul
mkdir "%BASE%\notifications" 2>nul
mkdir "%BASE%\messaging" 2>nul
mkdir "%BASE%\ai" 2>nul

echo.
echo Directories created successfully!
echo.
echo Now run: python c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_domain\build_domain_backend.py
pause
