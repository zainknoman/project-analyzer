#!/bin/bash
# Project File Analyzer — One-command startup script

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Project File Analyzer v1.0         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Check requirements ────────────────────────────────────────────────────────
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
  echo "❌ Python 3 not found. Please install Python 3.11+"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found. Please install npm 9+"
  exit 1
fi

PYTHON=python3
if ! command -v python3 &> /dev/null; then
  PYTHON=python
fi

echo "✅ Python: $($PYTHON --version)"
echo "✅ Node:   $(node --version)"
echo ""

# ── Backend setup ─────────────────────────────────────────────────────────────
echo "🔧 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
  echo "   Creating virtual environment..."
  $PYTHON -m venv venv
fi

echo "   Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  source venv/bin/activate
fi

echo "   Installing Python dependencies..."
pip install -r requirements.txt -q

echo "✅ Backend ready"
echo ""

# ── Start backend ─────────────────────────────────────────────────────────────
echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

cd ..

# ── Frontend setup ────────────────────────────────────────────────────────────
echo ""
echo "🔧 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
  echo "   Installing npm packages (this may take a minute)..."
  npm install
fi

echo "✅ Frontend ready"
echo ""

# ── Start frontend ────────────────────────────────────────────────────────────
echo "🚀 Starting React frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ App running!                          ║"
echo "║                                           ║"
echo "║  Frontend:  http://localhost:5173         ║"
echo "║  Backend:   http://localhost:8000         ║"
echo "║  API Docs:  http://localhost:8000/docs    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop both servers."

# ── Cleanup on exit ───────────────────────────────────────────────────────────
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
