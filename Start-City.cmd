@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org and try again.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo Node.js 20 or newer is required. Please install the current LTS version.
  pause
  exit /b 1
)
echo Starting Focus City. Keep this window open while using the website.
echo After the server starts, open http://localhost:8000 in your browser.
echo.
node scripts\serve.mjs
echo.
echo The server has stopped. If port 8000 is occupied, see the README.
pause
