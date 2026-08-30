@echo off
title CRYMA — Starting...

echo.
echo  ================================================
echo   CRYMA — Starting Development Servers
echo  ================================================
echo.

:: ── Start Laravel backend in a new window ──
echo  [1/2] Starting Laravel backend on http://127.0.0.1:8000 ...
start "CRYMA Backend" cmd /k "cd /d "%~dp0backend" && set "PATH=%PATH%;C:\Users\estra\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe" && php artisan serve"

:: Small delay so backend gets a head start
timeout /t 2 /nobreak >nul

:: ── Start Vite frontend in a new window ──
echo  [2/2] Starting React frontend on http://localhost:5173 ...
start "CRYMA Frontend" cmd /k "cd /d "%~dp0web" && set "PATH=%PATH%;C:\Program Files\nodejs" && npm run dev"

echo.
echo  ================================================
echo   Both servers are starting in separate windows.
echo   Open http://localhost:5173 in your browser.
echo  ================================================
echo.
pause
