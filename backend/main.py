"""
Project File Analyzer & Compiler - FastAPI Backend
"""
import os, re, io, json, zipfile, mimetypes
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Project Analyzer API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Models ────────────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    path: str
    ignore_patterns: list[str] = ["node_modules",".git","dist","build","__pycache__",".env","*.log","*.tmp","*.pyc",".DS_Store","venv",".venv"]

class CompileRequest(BaseModel):
    path: str
    mode: str = "single"
    ignore_patterns: list[str] = ["node_modules",".git","dist","__pycache__","*.log"]
    routing_rules: dict = {".py":"backend",".js":"frontend",".jsx":"frontend",".ts":"frontend",".tsx":"frontend",".vue":"frontend",".html":"frontend",".css":"frontend",".json":"configs",".yaml":"configs",".yml":"configs",".toml":"configs",".md":"docs",".txt":"docs"}
    max_file_size_kb: int = 500

class SearchRequest(BaseModel):
    path: str
    query: str
    regex: bool = False
    case_sensitive: bool = False
    file_types: list[str] = []
    ignore_patterns: list[str] = ["node_modules",".git","dist","__pycache__"]
    max_results: int = 100

class ChunkRequest(BaseModel):
    path: str
    max_tokens_per_chunk: int = 4000
    ignore_patterns: list[str] = ["node_modules",".git","dist","__pycache__","*.log"]

# ── Helpers ───────────────────────────────────────────────────────────────────
LANGUAGE_MAP = {".py":"Python",".js":"JavaScript",".ts":"TypeScript",".jsx":"React JSX",".tsx":"React TSX",".vue":"Vue",".html":"HTML",".css":"CSS",".scss":"SCSS",".json":"JSON",".yaml":"YAML",".yml":"YAML",".toml":"TOML",".md":"Markdown",".txt":"Text",".sh":"Shell",".java":"Java",".kt":"Kotlin",".go":"Go",".rs":"Rust",".cpp":"C++",".c":"C",".rb":"Ruby",".php":"PHP",".sql":"SQL"}

FRAMEWORK_SIGNATURES = {
    "requirements.txt": ["Flask","Django","FastAPI","SQLAlchemy","Celery","Pytest","Pydantic","Uvicorn"],
    "package.json": ["react","vue","angular","express","next","nuxt","svelte","vite","tailwind"],
    "pom.xml": ["Spring"],"build.gradle": ["Spring"],"Cargo.toml": ["actix","rocket","axum"],"go.mod": ["gin","echo","fiber"],
}

SECRET_PATTERNS = [
    (r'(?i)(api[_-]?key|apikey)\s*[=:]\s*["\']?([A-Za-z0-9_\-]{16,})', "API Key"),
    (r'(?i)(secret|password|passwd|pwd)\s*[=:]\s*["\']([^"\']{6,})["\']', "Password/Secret"),
    (r'(?i)(token|auth[_-]?token)\s*[=:]\s*["\']?([A-Za-z0-9_\-\.]{16,})', "Token"),
    (r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----', "Private Key"),
    (r'(?i)(aws_access_key_id|aws_secret)\s*[=:]\s*([A-Za-z0-9+/]{16,})', "AWS Credential"),
    (r'sk-[A-Za-z0-9]{32,}', "OpenAI Key"),
]

def should_ignore(path_str: str, patterns: list[str]) -> bool:
    name = os.path.basename(path_str)
    for p in patterns:
        if p.startswith("*.") and name.endswith(p[1:]): return True
        if p in path_str or name == p: return True
    return False

def size_str(b: int) -> str:
    if b < 1024: return f"{b}B"
    if b < 1048576: return f"{b/1024:.1f}KB"
    return f"{b/1048576:.1f}MB"

def scan_directory(base_path: str, ignore_patterns: list[str]):
    results = []
    base = Path(base_path)
    if not base.exists(): raise HTTPException(404, f"Path not found: {base_path}")
    if not base.is_dir(): raise HTTPException(400, "Path must be a directory")
    def recurse(p: Path, depth=0):
        try: entries = sorted(p.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
        except PermissionError: return
        for entry in entries:
            rel = str(entry.relative_to(base))
            if should_ignore(rel, ignore_patterns): continue
            if entry.is_dir():
                results.append({"type":"folder","name":entry.name,"path":rel,"depth":depth})
                recurse(entry, depth+1)
            else:
                try: sz = entry.stat().st_size; mt = datetime.fromtimestamp(entry.stat().st_mtime).isoformat()
                except: sz, mt = 0, ""
                ext = entry.suffix.lower()
                results.append({"type":"file","name":entry.name,"path":rel,"depth":depth,"size":sz,"size_str":size_str(sz),"extension":ext,"language":LANGUAGE_MAP.get(ext,"Unknown"),"modified":mt})
    recurse(base)
    return results

def detect_frameworks(base_path: str):
    detected = []
    base = Path(base_path)
    for sig_file, fws in FRAMEWORK_SIGNATURES.items():
        p = base / sig_file
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8", errors="ignore").lower()
                for fw in fws:
                    if fw.lower() in content: detected.append(fw)
            except: pass
    return list(set(detected))

def compute_stats(files):
    lang_counts = {}; total_size = 0; largest = []
    for f in files:
        if f["type"] != "file": continue
        lang = f.get("language","Unknown")
        lang_counts[lang] = lang_counts.get(lang,0)+1
        total_size += f.get("size",0)
        largest.append({"name":f["name"],"path":f["path"],"size":f["size"],"size_str":f["size_str"]})
    largest.sort(key=lambda x: x["size"], reverse=True)
    total_files = sum(1 for f in files if f["type"]=="file")
    total_folders = sum(1 for f in files if f["type"]=="folder")
    lang_pct = {}
    if total_files:
        for lang, cnt in sorted(lang_counts.items(), key=lambda x: -x[1]):
            lang_pct[lang] = round(cnt/total_files*100,1)
    return {"total_files":total_files,"total_folders":total_folders,"total_size":total_size,"total_size_str":size_str(total_size),"language_breakdown":lang_pct,"largest_files":largest[:10],"file_type_count":lang_counts}

def read_file_safe(path: str, max_kb=500) -> str:
    p = Path(path)
    if not p.exists(): return ""
    if p.stat().st_size > max_kb*1024: return f"[File too large: {size_str(p.stat().st_size)}]"
    try: return p.read_text(encoding="utf-8", errors="replace")
    except Exception as e: return f"[Error: {e}]"

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root(): return {"status":"ok","app":"Project Analyzer API","version":"1.0.0"}

@app.post("/scan")
def scan_project(req: ScanRequest):
    files = scan_directory(req.path, req.ignore_patterns)
    stats = compute_stats(files)
    frameworks = detect_frameworks(req.path)
    return {"path":req.path,"files":files,"stats":stats,"frameworks":frameworks,"scanned_at":datetime.now().isoformat()}

@app.get("/file")
def get_file_content(path: str = Query(...), base: str = Query(...)):
    full_path = os.path.normpath(os.path.join(base, path))
    if not full_path.startswith(os.path.normpath(base)): raise HTTPException(403, "Access denied")
    if not os.path.exists(full_path): raise HTTPException(404, "File not found")
    if not os.path.isfile(full_path): raise HTTPException(400, "Not a file")
    sz = os.path.getsize(full_path)
    if sz > 2*1024*1024: raise HTTPException(413, "File too large")
    content = read_file_safe(full_path)
    ext = Path(full_path).suffix.lower()
    return {"path":path,"name":os.path.basename(full_path),"content":content,"lines":len(content.splitlines()),"size":sz,"size_str":size_str(sz),"language":LANGUAGE_MAP.get(ext,"Unknown"),"extension":ext,"encoding":"utf-8"}

@app.post("/search")
def search_files(req: SearchRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    results = []; files_searched = 0
    query = req.query if req.case_sensitive else req.query.lower()
    for root, dirs, files in os.walk(req.path):
        dirs[:] = [d for d in dirs if not should_ignore(d, req.ignore_patterns)]
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, req.path)
            if should_ignore(rel, req.ignore_patterns): continue
            ext = Path(fname).suffix.lower()
            if req.file_types and ext not in req.file_types: continue
            if os.path.getsize(fpath) > 500*1024: continue
            try: content = Path(fpath).read_text(encoding="utf-8", errors="ignore")
            except: continue
            files_searched += 1
            for i, line in enumerate(content.splitlines(), 1):
                check = line if req.case_sensitive else line.lower()
                try:
                    hit = bool(re.search(query, line, 0 if req.case_sensitive else re.IGNORECASE)) if req.regex else query in check
                except: hit = query in check
                if hit:
                    results.append({"file":rel,"line":i,"content":line.strip()[:200],"language":LANGUAGE_MAP.get(ext,"Unknown")})
                    if len(results) >= req.max_results:
                        return {"results":results,"total":len(results),"files_searched":files_searched,"truncated":True}
    return {"results":results,"total":len(results),"files_searched":files_searched,"truncated":False}

@app.post("/compile/download")
def compile_download(req: CompileRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    compiled = {}
    for root, dirs, files in os.walk(req.path):
        dirs[:] = [d for d in dirs if not should_ignore(d, req.ignore_patterns)]
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, req.path)
            if should_ignore(rel, req.ignore_patterns): continue
            ext = Path(fname).suffix.lower()
            if os.path.getsize(fpath)/1024 > req.max_file_size_kb: continue
            content = read_file_safe(fpath, req.max_file_size_kb)
            block = f"\n{'='*60}\nFILE: {rel}\n{'='*60}\n\n{content}\n"
            group = "PROJECT_COMPILED" if req.mode=="single" else req.routing_rules.get(ext,"other")
            compiled.setdefault(group,[]).append(block)
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf,"w",zipfile.ZIP_DEFLATED) as zf:
        for group, blocks in compiled.items():
            text = f"# Project: {base.name}\n# Group: {group}\n# Generated: {datetime.now().isoformat()}\n"+"".join(blocks)
            zf.writestr(f"compiled/{group}.txt", text)
        zf.writestr("manifest.json", json.dumps({"project":base.name,"mode":req.mode,"groups":{g:len(b) for g,b in compiled.items()},"generated":datetime.now().isoformat()},indent=2))
    zip_buf.seek(0)
    return StreamingResponse(zip_buf, media_type="application/zip", headers={"Content-Disposition":f"attachment; filename=compiled_{base.name}.zip"})

@app.post("/export/zip")
def export_zip(req: ScanRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf,"w",zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(req.path):
            dirs[:] = [d for d in dirs if not should_ignore(d, req.ignore_patterns)]
            for fname in files:
                fpath = os.path.join(root, fname)
                rel = os.path.relpath(fpath, req.path)
                if should_ignore(rel, req.ignore_patterns): continue
                if os.path.getsize(fpath) > 10*1024*1024: continue
                try: zf.write(fpath, rel)
                except: pass
    zip_buf.seek(0)
    return StreamingResponse(zip_buf, media_type="application/zip", headers={"Content-Disposition":f"attachment; filename={base.name}_export.zip"})

@app.post("/security/scan")
def security_scan(req: ScanRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    findings = []; files_scanned = 0
    skip_exts = {".png",".jpg",".jpeg",".gif",".ico",".woff",".ttf",".eot",".svg"}
    for root, dirs, files in os.walk(req.path):
        dirs[:] = [d for d in dirs if not should_ignore(d, req.ignore_patterns)]
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, req.path)
            if should_ignore(rel, req.ignore_patterns): continue
            if Path(fname).suffix.lower() in skip_exts: continue
            if os.path.getsize(fpath) > 200*1024: continue
            try: content = Path(fpath).read_text(encoding="utf-8", errors="ignore")
            except: continue
            files_scanned += 1
            for i, line in enumerate(content.splitlines(), 1):
                for pattern, label in SECRET_PATTERNS:
                    if re.search(pattern, line):
                        findings.append({"file":rel,"line":i,"type":label,"severity":"high" if "Key" in label or "Private" in label else "medium","snippet":line.strip()[:100]})
    findings.sort(key=lambda x: 0 if x["severity"]=="high" else 1)
    return {"findings":findings[:50],"total_findings":len(findings),"files_scanned":files_scanned,"risk_level":"high" if any(f["severity"]=="high" for f in findings) else ("medium" if findings else "low")}

@app.post("/generate/ai-prompt")
def generate_ai_prompt(req: ScanRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    files = scan_directory(req.path, req.ignore_patterns)
    stats = compute_stats(files)
    frameworks = detect_frameworks(req.path)
    tree_lines = []
    for f in files[:80]:
        indent = "  "*f["depth"]
        tree_lines.append(f"{indent}{f['name']}/" if f["type"]=="folder" else f"{indent}{f['name']}  ({f['size_str']})")
    lang_str = ", ".join(f"{l}: {p}%" for l,p in list(stats["language_breakdown"].items())[:5])
    prompt = f"""Analyze the following software project and provide a comprehensive technical review.

## Project: {base.name}
- Total files: {stats['total_files']}
- Total size: {stats['total_size_str']}
- Languages: {lang_str}
- Frameworks detected: {', '.join(frameworks) if frameworks else 'None'}

## Project Structure:
```
{chr(10).join(tree_lines)}
```

## Analysis Tasks:
1. Architecture Overview — explain structure and component interactions
2. Code Quality — identify bugs, anti-patterns, concerns
3. Security Review — highlight vulnerabilities
4. Performance — suggest improvements
5. Dependencies — review choices and suggest updates
6. Refactoring Opportunities
7. Testing Strategy
8. Documentation Gaps

Be specific with file names and line references where possible.
"""
    return {"prompt":prompt,"project":base.name,"stats":stats,"frameworks":frameworks}

@app.post("/generate/documentation")
def generate_documentation(req: ScanRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    files = scan_directory(req.path, req.ignore_patterns)
    stats = compute_stats(files)
    frameworks = detect_frameworks(req.path)
    tree_lines = []
    for f in files[:60]:
        indent="  "*f["depth"]
        tree_lines.append(f"{indent}**{f['name']}/**" if f["type"]=="folder" else f"{indent}`{f['name']}` ({f['size_str']})")
    lang_table = "\n".join(f"| {lang} | {pct}% | {stats['file_type_count'].get(lang,0)} |" for lang,pct in list(stats["language_breakdown"].items())[:8])
    doc = f"""# {base.name} — Project Summary

> Auto-generated by Project Analyzer · {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Stats
| Property | Value |
|----------|-------|
| Files | {stats['total_files']} |
| Size | {stats['total_size_str']} |
| Languages | {len(stats['language_breakdown'])} |
| Frameworks | {', '.join(frameworks) if frameworks else 'None'} |

## Languages
| Language | % | Files |
|----------|---|-------|
{lang_table}

## Structure
{chr(10).join(tree_lines)}

## Largest Files
{chr(10).join(f"- `{f['path']}` ({f['size_str']})" for f in stats['largest_files'][:5])}

---
*Generated by Project File Analyzer*
"""
    return {"markdown":doc,"project":base.name}

@app.post("/chunk/ai")
def chunk_for_ai(req: ChunkRequest):
    base = Path(req.path)
    if not base.exists(): raise HTTPException(404, "Path not found")
    CHARS_PER_TOKEN = 4; max_chars = req.max_tokens_per_chunk*CHARS_PER_TOKEN
    chunks = []; current = []; current_size = 0; idx = 1; grp = "general"
    for root, dirs, files in os.walk(req.path):
        dirs[:] = [d for d in dirs if not should_ignore(d, req.ignore_patterns)]
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, req.path)
            if should_ignore(rel, req.ignore_patterns): continue
            ext = Path(fname).suffix.lower()
            if os.path.getsize(fpath) > 200*1024: continue
            content = read_file_safe(fpath, 200)
            block = f"\n{'='*50}\nFILE: {rel}\n{'='*50}\n{content}\n"
            if current_size+len(block) > max_chars and current:
                chunks.append({"index":idx,"name":f"chunk_{idx}_{grp}.txt","estimated_tokens":round(current_size/CHARS_PER_TOKEN)})
                idx+=1; current=[]; current_size=0
            current.append(block); current_size+=len(block)
            if ext in [".py",".go",".java",".rs",".rb"]: grp="backend"
            elif ext in [".js",".jsx",".ts",".tsx",".vue",".html",".css"]: grp="frontend"
            else: grp="other"
    if current: chunks.append({"index":idx,"name":f"chunk_{idx}_{grp}.txt","estimated_tokens":round(current_size/CHARS_PER_TOKEN)})
    return {"chunks":chunks,"total_chunks":len(chunks),"max_tokens_per_chunk":req.max_tokens_per_chunk}
