@echo off
cd /d "%~dp0"
npm.cmd run dev -- -p 3000 > next-dev-current-run.log 2>&1
