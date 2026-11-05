@echo off
title WorqDen Platform — Localhost Server
echo ========================================================
echo    🚀 STARTING WORQDEN LOCALHOST SERVER
echo ========================================================
echo.
echo Checking Node.js environment...
node -v
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo.
echo Starting backend server on http://localhost:5000 ...
start "" http://localhost:5000
node backend/server.js
pause
