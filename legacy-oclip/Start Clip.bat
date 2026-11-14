@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Oclip Free by coding180
if not defined PORT set "PORT=4571"

call :refreshpath
call :nodecheck
if errorlevel 1 (
  echo Clip needs Node.js ^(free^). Installing it...
  where winget >nul 2>nul && winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  call :refreshpath
  call :nodecheck
  if errorlevel 1 (
    echo.
    echo Please install Node.js yourself: the page that just opened has a big green button.
    echo Install it, then double-click "Start Clip.bat" again.
    start "" "https://nodejs.org/en/download"
    pause
    exit /b 1
  )
)

rem One-time offer: video tools for clipping real videos ^(demo mode works without them^).
if not exist "data\.tools-asked" (
  if not exist data mkdir data
  where ffmpeg >nul 2>nul || goto :askTools
  where yt-dlp >nul 2>nul || goto :askTools
  goto :toolsDone
)
goto :start

:askTools
echo.
echo Optional: to clip your own videos, Clip needs two free video tools ^(ffmpeg and yt-dlp^).
where winget >nul 2>nul
if errorlevel 1 (
  echo Windows could not install them automatically. See INSTALL.md, "Real videos". Starting in demo mode.
  goto :toolsDone
)
set /p ANS=Install them now? It can take a few minutes. (y/n) 
if /i "%ANS%"=="y" (
  winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
  winget install -e --id yt-dlp.yt-dlp --accept-source-agreements --accept-package-agreements
  call :refreshpath
)
:toolsDone
echo asked> "data\.tools-asked"

:start
rem Speaker tracking (automatic, needs Python 3 and internet the first time): lets clips follow the speaker.
if not exist ".venv\Scripts\python.exe" (
  echo.
  echo Setting up speaker tracking ^(one time, about a minute^)...
  call tools\setup-tracking.bat || echo Speaker tracking could not be set up. Clips will be centre-cropped.
)
echo.
echo Starting Clip... keep this window open while you use it.
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:%PORT%"
node server\server.mjs
pause
exit /b 0

:nodecheck
where node >nul 2>nul || exit /b 1
for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set "NV=%%v"
if %NV% LSS 20 exit /b 1
exit /b 0

:refreshpath
rem Pick up programs installed a moment ago, without restarting.
set "SYSP="
set "USRP="
for /f "skip=2 tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSP=%%b"
for /f "skip=2 tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USRP=%%b"
if defined SYSP set "PATH=%SYSP%;%USRP%;%PATH%"
exit /b 0
