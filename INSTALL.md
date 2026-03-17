# Installation Guide

## 🎯 System Requirements

| Requirement | Minimum | Verify |
|-------------|---------|--------|
| [Python](https://python.org) | 3.11+ | `python --version` or `py --version` |
| [Node.js](https://nodejs.org) | 18+ | `node --version` |
| [npm](https://npmjs.com) | 9+ | `npm --version` |

---

## 🚀 macOS / Linux

### 1-Click Start
```bash
chmod +x start.sh
./start.sh
```
```for windows run below command
.\start.bat


### Manual
**Terminal 1 — Backend**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**:
```bash
cd frontend
npm install
npm run dev
```

### ✅ Verify
```bash
curl http://localhost:8000/
# Should return: {\"status\":\"ok\",\"app\":\"Project Analyzer API\"}

# Open browser: http://localhost:5173
```

---

## 🪟 Windows (Updated for CMD & PowerShell)

### 🎯 1-Click Start
1. Double-click `start.bat` **OR**
2. PowerShell: `.\start.bat`

Uses `venv\Scripts\activate.bat` automatically.

### 🔧 Manual Setup

#### Option A: **CMD** (Recommended - matches start.bat)
**CMD Window 1 — Backend**:
```cmd
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**CMD Window 2 — Frontend**:
```cmd
cd frontend
npm install
npm run dev
```

#### Option B: **PowerShell**
**PowerShell 1 — Backend**:
```powershell
cd backend
py -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**PowerShell 2 — Frontend**:
```powershell
cd frontend
npm install
npm run dev
```

**Note**: If `Activate.ps1` blocked: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### ✅ Verify (All Methods)
```
Frontend: http://localhost:5173
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

**CMD Test**:
```cmd
curl http://localhost:8000/
```

---

## 🐳 Docker (Optional)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ['8000:8000']
    volumes: ['/:/host:ro']
  frontend:
    build: ./frontend
    ports: ['5173:5173']
    depends_on: [backend]
```

```bash
docker compose up --build
```

---

## 🔧 Troubleshooting (Windows Focus)

| Issue | Windows Solution |
|-------|------------------|
| **Port busy** | `netstat -ano \| findstr :8000` → Task Manager End Task |
| **venv activate fails** | Use `call venv\Scripts\activate.bat` (CMD) |
| **Python not found** | Add to PATH or use `py` launcher |
| **npm install slow** | `npm config set registry https://registry.npmmirror.com` |
| **ExecutionPolicy** | `Set-ExecutionPolicy RemoteSigned` (PowerShell) |
| **start.bat flashes** | Right-click → \"Run as Administrator\" or check antivirus |

**Full Reset**:
```cmd
rmdir /s backend\venv
rmdir /s frontend\node_modules
start.bat
```

**Check Services**:
```cmd
tasklist | findstr uvicorn
tasklist | findstr node
```

---

## 🌐 API Access

```cmd
curl -X POST http://localhost:8000/scan -H \"Content-Type: application/json\" -d \"{\\\"path\\\":\\\"C:\\\\Projects\\\\myapp\\\"}\"
```

Swagger: http://localhost:8000/docs

---
*Updated: October 2024 — Windows Optimized*

