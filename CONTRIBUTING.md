# Contributing to Project Analyzer

Thank you for your interest! 🎉

## 🤝 How to Contribute

1. **Fork** the repo & clone locally
2. Create **feature branch**: `git checkout -b feat/amazing-feature`
3. **Commit changes**: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feat/amazing-feature`
5. **Open PR** to `main`

## 🏗️ Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/project-analyzer.git
cd project-analyzer
./start.sh  # Installs deps + starts dev servers
```

**Hot Reload**: Backend (`--reload`), Frontend (Vite).

### Code Style
- **Python**: Black (`pip install black`), `black .`
- **JS**: Prettier/ESLint (runs on `npm run dev`)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  ```
  feat: add security scanner
  fix: resolve CORS issue
  docs: update README badges
  ```

## 🧪 Testing

**Backend** (add tests):
```bash
cd backend
pip install pytest
pytest
```

**Frontend**:
```bash
cd frontend
npm test  # Add tests first :)
```

**E2E**: Scan real projects, test exports/scans.

## 📋 Before You Submit PR

- □ Code runs: `./start.sh`
- □ No lint errors
- □ Docs updated
- □ Tests pass (if added)
- □ No breaking changes

## 🔬 Issues / Feature Requests

- [🐛 Bug Report](https://github.com/YOUR_USERNAME/project-analyzer/issues/new?template=bug)
- [✨ Feature Request](https://github.com/YOUR_USERNAME/project-analyzer/issues/new?template=feature)

## 🤖 Scripts

```bash
# Install deps only
./start.sh --deps-only  # Add to start.sh

# Build production
cd frontend && npm run build
cd ../backend && uvicorn main:app --port 8000
```

## 📄 License

Free license.

---
z.Kamali! 🚀

