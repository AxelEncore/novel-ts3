@echo off
cd /d "%~dp0"
echo Starting SQLite migration...
node database\simple-migrate.js
pause
