@echo off
chcp 65001 >nul
title TamStore Promo Intelligence - Server Restart

cd /d "%~dp0"

call STOP.bat
call START.bat
