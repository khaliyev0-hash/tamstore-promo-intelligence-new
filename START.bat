@echo off
setlocal
title TamStore Promo Intelligence - Platform Launcher

cd /d "%~dp0"

echo =================================================================
echo        TAMSTORE PROMO INTELLIGENCE - PLATFORM LAUNCHER
echo =================================================================
echo.

:: 1. Add portable node to PATH if available
if exist "%LOCALAPPDATA%\Temp\node-portable\node-v20.18.0-win-x64\node.exe" (
    set "PATH=%LOCALAPPDATA%\Temp\node-portable\node-v20.18.0-win-x64;%PATH%"
)

:: 2. Check Python installation
set PY_CMD=
py -3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_CMD=py -3"
) else (
    python --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "PY_CMD=python"
    )
)

if "%PY_CMD%"=="" (
    echo [XETA] Python tapilmadi!
    echo Zehmet olmasa Python 3.10+ qurasdirin ve PATH-e elave edin.
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

:: 3. Check Node.js installation
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [XETA] Node.js tapilmadi!
    echo Zehmet olmasa Node.js qurasdirin.
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 4. Check if frontend dependencies are installed
if not exist "frontend\node_modules\" (
    echo [INFO] Frontend asililiqlari tapilmadi, yuklenir - npm install...
    cd frontend
    call npm.cmd install
    cd ..
    if %ERRORLEVEL% NEQ 0 (
        echo [XETA] npm install ugursuz oldu!
        pause
        exit /b 1
    )
)

:: 5. Launch the application
echo [OK] Python ve Node.js askarlandi.
echo [OK] Serverler basladilir...
echo.

%PY_CMD% run_app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [XETA] Tetbiq gozlenilmeden dayandi.
    pause
)
