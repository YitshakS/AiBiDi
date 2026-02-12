@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is missing and is required to run AiBiDi.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b
)

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if server is already running
set PORT_FILE=tmp\.port
set SERVER_RUNNING=0
set PORT=

if exist "%PORT_FILE%" (
    set /p PORT=<"%PORT_FILE%"
    REM Test if port is actually listening
    powershell -Command "try { $null = Test-NetConnection -ComputerName localhost -Port !PORT! -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 (
        set SERVER_RUNNING=1
        echo Server already running on port !PORT!
    )
)

if !SERVER_RUNNING!==0 (
    REM Start new server
    echo Starting AiBiDi server...
    powershell -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'src/server.js','--auto-shutdown' -WindowStyle Hidden"

    REM Wait for port file to be created (max 5 seconds)
    set /a counter=0
    :wait_loop
    if exist "%PORT_FILE%" goto port_ready
    timeout /t 1 /nobreak >nul
    set /a counter+=1
    if !counter! lss 5 goto wait_loop

    echo Error: Server failed to start
    pause
    exit /b

    :port_ready
    set /p PORT=<"%PORT_FILE%"
    echo Server started on port !PORT!
)

REM Open browser
echo Opening browser at http://localhost:!PORT!
start http://localhost:!PORT!
