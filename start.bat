@echo off
echo.
echo ╔══════════════════════════════════════╗
echo ║   Project File Analyzer v1.0         ║
echo ╚══════════════════════════════════════╝
echo.

:: Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found. Install Python 3.11+ from python.org
    pause & exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Install Node.js 18+ from nodejs.org
    pause & exit /b 1
)

echo Setting up backend...
cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo Backend ready.

echo Starting backend on http://localhost:8000 ...
start "Backend" cmd /k "venv\Scripts\activate && uvicorn main:app --reload --port 8000"

cd ..\frontend

if not exist node_modules (
    echo Installing npm packages...
    npm install
)

echo Starting frontend on http://localhost:5173 ...
start "Frontend" cmd /k "npm run dev"

cd ..

echo.
echo ╔══════════════════════════════════════════╗
echo ║  App running!                            ║
echo ║                                          ║
echo ║  Frontend:  http://localhost:5173        ║
echo ║  Backend:   http://localhost:8000        ║
echo ║  API Docs:  http://localhost:8000/docs   ║
echo ╚══════════════════════════════════════════╝
echo.
pause
