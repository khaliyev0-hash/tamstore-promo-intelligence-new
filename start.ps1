# TamStore Promo Intelligence - PowerShell Launcher
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       TAMSTORE PROMO INTELLIGENCE - PLATFORM LAUNCHER           " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# Add portable node if present
$portableNode = "$env:LOCALAPPDATA\Temp\node-portable\node-v20.18.0-win-x64"
if (Test-Path "$portableNode\node.exe") {
    $env:PATH = "$portableNode;$env:PATH"
}

# Determine Python command
$pyCmd = $null
$pyArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pyCmd = "py"
    $pyArgs = @("-3", "run_app.py")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
    $pyArgs = @("run_app.py")
} else {
    Write-Host "[XƏTA] Python tapılmadı! Zəhmət olmasa Python 3.10+ quraşdırın." -ForegroundColor Red
    Read-Host "Davam etmək üçün Enter sıxın..."
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[XƏTA] Node.js tapılmadı! Zəhmət olmasa Node.js quraşdırın." -ForegroundColor Red
    Read-Host "Davam etmək üçün Enter sıxın..."
    exit 1
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[MƏLUMAT] Frontend asılılıqları quraşdırılır (npm install)..." -ForegroundColor Yellow
    Push-Location frontend
    npm.cmd install
    Pop-Location
}

Write-Host "[OK] Serverlər başladılır..." -ForegroundColor Green
& $pyCmd $pyArgs
