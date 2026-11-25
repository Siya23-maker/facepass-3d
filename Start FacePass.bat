@echo off
title FacePass demo
rem Go to the folder this file is in (your facepass-3d project folder)
cd /d "%~dp0"

if not exist "package.json" (
  echo This file must be inside the facepass-3d folder, next to package.json.
  pause
  exit /b
)

rem First time only: download the libraries
if not exist "node_modules" (
  echo Installing libraries - first time only, please wait...
  call npm install
)

echo.
echo  Starting FacePass... your browser will open automatically.
echo  Keep this window open during the demo. Close it to stop the app.
echo.
call npm run dev
pause
