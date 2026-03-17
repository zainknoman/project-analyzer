import { useState } from 'react'
import './FileTree.css'

const EXT_ICONS = {
  '.py': '🐍', '.js': '📜', '.jsx': '⚛', '.ts': '📘', '.tsx': '⚛',
  '.vue': '💚', '.html': '🌐', '.css': '🎨', '.scss': '🎨',
  '.json': '⚙', '.yaml': '⚙', '.yml': '⚙', '.toml': '⚙',
  '.md': '📝', '.txt': '📄', '.sh': '⬛', '.bash': '⬛',
  '.java': '☕', '.go': '🐹', '.rs': '⚙', '.rb': '💎',
  '.sql': '🗃', '.env': '🔒', '.gitignore': '🚫',
  '.png': '🖼', '.jpg': '🖼', '.svg': '🖼',
}

function getIcon(name, ext) {
  if (name === '.env' || name.startsWith('.env')) return '🔒'
  if (name === 'package.json') return '📦'
  if (name === 'requirements.txt') return '📋'
  if (name === 'README.md' || name === 'readme.md') return '📖'
  if (name === 'Dockerfile') return '🐳'
  return EXT_ICONS[ext] || '📄'
}

function getLangColor(lang) {
  const colors = {
    Python: '#3572a5', JavaScript: '#f1e05a', TypeScript: '#2b7489',
    'React JSX': '#61dafb', 'React TSX': '#61dafb', Vue: '#42b883',
    HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
    JSON: '#6e9c35', Markdown: '#083fa1', Go: '#00add8',
    Rust: '#dea584', Java: '#b07219', Ruby: '#701516',
    Shell: '#89e051', SQL: '#e38c00',
  }
  return colors[lang] || '#8b949e'
}

export default function FileTree({ files, activeFile, onSelect, searchQuery }) {
  const [collapsed, setCollapsed] = useState(new Set())

  if (!files || files.length === 0) {
    return (
      <div className="tree-empty">
        <div className="tree-empty-icon">📂</div>
        <div>No project loaded</div>
        <div className="tree-empty-sub">Enter a path above to scan</div>
      </div>
    )
  }

  const toggleFolder = (path, e) => {
    e.stopPropagation()
    setCollapsed(prev => {
      const n = new Set(prev)
      n.has(path) ? n.delete(path) : n.add(path)
      return n
    })
  }

  const isVisible = (item) => {
    if (item.depth === 0) return true
    // Check all ancestor paths
    const parts = item.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join('/')
      if (collapsed.has(ancestor)) return false
    }
    return true
  }

  const matchesSearch = (item) => {
    if (!searchQuery) return true
    return item.name.toLowerCase().includes(searchQuery.toLowerCase())
  }

  return (
    <div className="file-tree">
      {files.filter(f => isVisible(f) && matchesSearch(f)).map(item => {
        const isFolder = item.type === 'folder'
        const isCollapsed = collapsed.has(item.path)
        const isActive = activeFile && activeFile.path === item.path
        const ext = item.extension || ''
        const icon = isFolder ? (isCollapsed ? '📁' : '📂') : getIcon(item.name, ext)

        return (
          <div
            key={item.path}
            className={`tree-item ${isFolder ? 'folder' : 'file'} ${isActive ? 'active' : ''}`}
            style={{ paddingLeft: `${8 + item.depth * 16}px` }}
            onClick={isFolder ? (e) => toggleFolder(item.path, e) : () => onSelect(item)}
          >
            <span className="tree-icon">{icon}</span>
            <span className="tree-name">{item.name}{isFolder ? '/' : ''}</span>
            {!isFolder && (
              <>
                <span className="tree-lang-dot" style={{ background: getLangColor(item.language) }} title={item.language} />
                <span className="tree-size">{item.size_str}</span>
              </>
            )}
            {isFolder && <span className="tree-arrow">{isCollapsed ? '▶' : '▼'}</span>}
          </div>
        )
      })}
    </div>
  )
}
