# Usage Guide

## 🎓 Welcome

Project Analyzer helps you **understand any codebase** quickly. Scan → Explore → Analyze → Export.

## 📂 Step 1: Scanning a Project

```
1. Enter path: /Users/you/myproject  or  C:\Projects\app
2. (Optional) Edit ignores: 🚫 button → add patterns
3. Click ⚡ Scan
```

**Results**:
- Left: File tree (filtered search)
- Stats: Languages, size, frameworks detected
- Ready for actions

**Large Projects** (~10k+ files): Add ignores like `*.min.js` `coverage/`

## 🔍 Step 2: Exploring Files

**File Tree**:
- Click folders/files → syntax-highlighted preview
- Tabs persist open files (closes LRU)
- Filter: Search box filters tree

**Preview**:
- Line numbers, language detection
- Resize panels with drag

## 🛠 Step 3: Core Actions (Right Panel)

### 📊 Stats
Language pie chart, largest files, framework detection.

### 🔍 Search
```
Query: useState → shows files/line snippets
Regex: ✓ true → re.search(query)
Max results: 100
```

**Open in Preview**: Click result → new tab.

### ⚡ Compile
**Modes**:
- `single`: All files → `PROJECT_COMPILED.txt`
- `grouped`: py→backend.txt, js→frontend.txt

**Download**: ZIP with manifest.json (groups/sizes).

**Use Cases**:
- Code review docs
- LLM context (paste compiled text)

### 📦 Export ZIP
Raw project ZIP (ignores excluded).

### 🛡 Security Scan
**Detects**:
- API keys (`api_key=abc123`)
- Passwords/secrets
- Private keys (`-----BEGIN`)
- AWS/OpenAI tokens

**Severity**: High/Medium → review immediately.

### ✦ AI Prompt
Generates **copilot-ready prompt**:
```
Analyze project X: 150 files, 60% JS...
Structure tree...
Tasks: arch/security/perf...
```

**Copy-paste** to ChatGPT/Claude.

### 📝 Documentation
Generates `PROJECT_SUMMARY.md`:
```
# MyApp Summary
Files: 250 | Size: 2.3MB
Languages: JS 55%, Python 30%...
Tree: src/ → ...
```

### 🤖 AI Chunking
**For LLMs** (token limits):
```
Chunk 1: backend (4200 tokens)
Chunk 2: frontend (3800 tokens)
...
```

## 🎛 Advanced

**Custom Ignores** (🚫):
```
node_modules
.git
dist
build/
*.log
coverage/
.nyc_output/
```

**API Integration**:
```bash
# From curl/other apps
curl -X POST http://localhost:8000/scan -d '{"path":"/my/project"}'
```

## 💡 Tips

- **VSCode Integration**: `localhost:5173` tab while coding
- **CI/CD**: Dockerize → scan repos automatically
- **Monorepos**: Handles 100k+ files (with ignores)
- **Teams**: Share compiled ZIPs for reviews

## ❓ FAQs

**Q: Slow scan?** → More ignores, fewer files.

**Q: Binary files?** → Auto-skipped (images/fonts).

**Q: Custom langs?** → Edit `main.py` LANGUAGE_MAP.

**Q: Production?** → `uvicorn --no-reload`, `npm run build`.

---
*Pro Tip: Always scan with `./start.sh`*

