@echo off
title AtmosPulse Launcher
echo ========================================================
echo Starting AtmosPulse Hyperlocal Air Quality System...
echo ========================================================

cd /d "%~dp0"

echo [1/2] Launching Backend API on http://localhost:8000 ...
start "AtmosPulse Backend" cmd /k "cd backend && (if exist venv\Scripts\activate (call venv\Scripts\activate) else (echo Using system Python...)) && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching Frontend on http://localhost:5173 ...
start "AtmosPulse Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo AtmosPulse services are starting up!
echo Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo Frontend: http://localhost:5173
echo ========================================================
