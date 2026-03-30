@echo off
echo Restarting Backend...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul
timeout /t 2 /nobreak >nul
start "ERP Backend" cmd /k "cd /d %~dp0 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"
echo Backend restarted!
