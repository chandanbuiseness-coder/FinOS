@echo off
title FinOS - Dev Server Launcher
color 0A

echo.
echo ================================================
echo   FinOS - Starting Development Servers
echo ================================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Run this from the finos-app directory.
    echo Current dir: %CD%
    pause
    exit /b 1
)

:: Kill anything on port 8000 and 3001 first
echo [1/3] Clearing ports 8000 and 3001...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start Python backend
echo [2/3] Starting Python backend on port 8000...
start "FinOS Python Backend" cmd /k "python -m uvicorn api.index:app --reload --port 8000 --log-level info"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Next.js frontend
echo [3/3] Starting Next.js frontend on port 3001...
start "FinOS Next.js Frontend" cmd /k "npm run dev -- --port 3001"

echo.
echo ================================================
echo   Servers launched in separate windows!
echo.
echo   Frontend: http://localhost:3001
echo   Backend:  http://localhost:8000/api/py/docs
echo   Health:   http://localhost:8000/api/py/health
echo ================================================
echo.
echo Close this window or press any key to exit.
pause >nul
