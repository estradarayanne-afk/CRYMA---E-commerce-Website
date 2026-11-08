@echo off
REM One-click launcher for the CRYMA local stack (MySQL + Laravel API/website + Vite).
REM Run this after a reboot to bring everything back up.

set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe
set MYSQL_INI=C:\Users\RufflesOG\mysql_data\my.ini
set PHP_EXE=C:\Users\RufflesOG\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe
set BACKEND=C:\projects\CRYMA---E-commerce-Website\backend

echo Starting MySQL...
start "CRYMA MySQL" "%MYSQL_BIN%" --defaults-file="%MYSQL_INI%" --console

echo Waiting for MySQL to be ready...
timeout /t 4 >nul

echo Starting Laravel backend + website (http://localhost:8000)...
start "CRYMA API" /D "%BACKEND%" "%PHP_EXE%" artisan serve --host 0.0.0.0 --port 8000

echo Starting Vite dev server (http://localhost:5173)...
start "CRYMA Vite" /D "%BACKEND%" cmd /c npm run dev

echo.
echo ============================================================
echo  CRYMA stack is starting.
echo    Website:        http://localhost:8000
echo    MySQL data dir:  C:\Users\RufflesOG\mysql_data
echo    Dev logins: admin@example.com / Admin12345  (website admin)
echo              delivery@cryma.com / crymashop123  (mobile rider)
echo  Close THIS window only. The three server windows keep running.
echo ============================================================
pause >nul
