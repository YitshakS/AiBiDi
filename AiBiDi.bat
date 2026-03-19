@echo off
if not defined IN_SUBPROCESS (cmd /k set IN_SUBPROCESS=1 ^& "%~f0" %* & exit)
setlocal enabledelayedexpansion
cd /d "%~dp0"
for /f %%a in ('echo prompt $E ^| cmd') do set ESC=%%a

where node >nul 2>nul
if %errorlevel% neq 0 goto node_missing
goto node_ok

:node_missing
set /p INSTALL_NODE=Node.js is missing and required to run AiBiDi. Install it now? (y/n): 
if /i "%INSTALL_NODE%"=="y" goto install_node
if /i "%INSTALL_NODE%"=="n" goto node_declined
goto node_missing

:node_declined
echo Node.js is required to run AiBiDi. Exiting.
exit

:install_node
for /f %%v in ('powershell -Command "$ProgressPreference = 'SilentlyContinue'; ((Invoke-WebRequest -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing | ConvertFrom-Json) | Where-Object { $_.lts } | Select-Object -First 1).version"') do set NODE_VERSION=%%v
echo Downloading Node.js !NODE_VERSION!...
if not exist tmp mkdir tmp
set COLUMNS=50
<nul set /p "=%ESC%[32m"
curl -L --progress-bar -o tmp\node_installer.msi "https://nodejs.org/dist/!NODE_VERSION!/node-!NODE_VERSION!-x64.msi"
<nul set /p "=%ESC%[0m"
echo Installing Node.js...
echo To complete the installation, confirm the pop-up window.
powershell -Command "$p = Start-Process msiexec -ArgumentList '/i tmp\node_installer.msi /passive /norestart' -Wait -PassThru; exit $p.ExitCode"
set MSIEXEC_ERROR=%errorlevel%
del tmp\node_installer.msi
for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable('PATH', 'Machine')"') do set PATH=%%i;%PATH%
where node >nul 2>nul
set NODE_FOUND=!errorlevel!
if !NODE_FOUND! neq 0 (
    echo Installation failed (error: %MSIEXEC_ERROR%^).
    echo Please install Node.js manually from https://nodejs.org
)
if !NODE_FOUND! neq 0 goto :eof
echo Node.js installed successfully.
echo.

:node_ok

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
    powershell -Command "if (Test-NetConnection -ComputerName localhost -Port !PORT! -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
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
    exit /b

    :port_ready
    set /p PORT=<"%PORT_FILE%"
    echo Server started on port !PORT!
)

REM Open browser
echo Opening browser at http://localhost:!PORT!
start http://localhost:!PORT!
exit
