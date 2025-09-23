@echo off
cd /d "%~dp0"
echo ===============================================
echo CLEANING UP TEMPORARY FILES
echo ===============================================
echo.
node cleanup.js
echo.
echo ===============================================
echo Cleanup completed!
echo ===============================================
pause