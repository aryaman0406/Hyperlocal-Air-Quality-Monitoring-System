@echo off
cd /d "%~dp0"
set PYTHONPATH=%CD%
"C:\Program Files\Python313\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
