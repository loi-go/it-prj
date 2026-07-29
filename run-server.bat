@echo off
setlocal
cd /d "%~dp0"

echo ============================
echo   IT-PRJ Server Launcher
echo ============================
echo 1. Dev server (npm run dev)
echo 2. Production (build + start)
echo 3. Start only (uses existing build)
echo.

set /p choice="Select an option [1-3]: "

if "%choice%"=="1" (
    call npm run dev
) else if "%choice%"=="2" (
    call npm run build && call npm run start
) else if "%choice%"=="3" (
    call npm run start
) else (
    echo Invalid choice.
    pause
    exit /b 1
)

endlocal
