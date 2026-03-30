@echo off
REM UpTime Checker - Start both Backend and Frontend servers
REM This script opens backend and frontend in separate terminal windows with hot-reload enabled

title UpTime Checker - Startup

echo.
echo ================================
echo  UpTime Checker - Starting...
echo ================================
echo.

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Start Backend Server in a new window
echo Starting Backend Server on http://localhost:5002...
start "UpTime Checker - Backend" cmd /k "cd /d "%SCRIPT_DIR%backend" && npm run dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start Frontend Server in a new window
echo Starting Frontend Server on http://localhost:3002...
start "UpTime Checker - Frontend" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

REM Wait a moment for frontend to start
timeout /t 3 /nobreak

REM Open the app in the default browser
echo.
echo Opening app in browser at http://localhost:3002...
timeout /t 1 /nobreak
start http://localhost:3002

echo.
echo ================================
echo  ✓ Servers are running!
echo ================================
echo.
echo Backend:  http://localhost:5002
echo Frontend: http://localhost:3002
echo.
echo Close either terminal window to stop that server.
echo Close both windows to stop the entire application.
echo.
