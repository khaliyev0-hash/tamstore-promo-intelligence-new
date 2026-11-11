@echo off
setlocal enabledelayedexpansion
title TamStore Promo Intelligence - Server Stopper

echo =================================================================
echo        TAMSTORE PROMO INTELLIGENCE - SERVERLERI DAYANDIR
echo =================================================================
echo.

set KILLED=0

:: 1. Dayandir Port 8000 - Backend FastAPI
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :8000') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo [OK] Backend serveri dayandirilir - Port 8000, PID %%a
        taskkill /F /PID %%a >nul 2>&1
        set KILLED=1
    )
)

:: 2. Dayandir Port 5173 - Frontend Vite
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :5173') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo [OK] Frontend serveri dayandirilir - Port 5173, PID %%a
        taskkill /F /PID %%a >nul 2>&1
        set KILLED=1
    )
)

echo.
if "!KILLED!"=="1" (
    echo [UGURLU] Butun TamStore serverleri dayandirildi ve portlar azad edildi.
) else (
    echo [INFO] Aktiv ve ya ilisib qalmis TamStore serveri tapilmadi.
)
echo.
exit /b 0
