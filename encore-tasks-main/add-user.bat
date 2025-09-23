@echo off
cd /d "%~dp0"
echo Adding admin user to database...
node database\add-user.js
pause