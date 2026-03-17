import { useState, useCallback } from 'react'
import FileTree from './components/FileTree'
import CodeViewer from './components/CodeViewer'
import SearchPanel from './components/SearchPanel'
import ActionPanel from './components/ActionPanel'
import { api } from './utils/api'
import './App.css'

const DEFAULT_IGNORE = [
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.env', '*.log', '*.tmp', '*.pyc', '.DS_Store', 'venv', '.venv'
]

export default function App() {
  const [projectPath, setProjectPath] = useState('')
  const [inputPath, setInputPath] = useState('')
  const [files, setFiles] = useState([])
  const [stats, setStats] = useState(null)
  const [frameworks, setFrameworks] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [fileData, setFileData] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [activeTab, setActiveTab] = useState('preview')
  const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE)
  const [showIgnoreEditor, setShowIgnoreEditor] = useState(false)
  const [ignoreText, setIgnoreText] = useState(DEFAULT_IGNORE.join('\n'))
  const [treeSearch, setTreeSearch] = useState('')
  const [openTabs, setOpenTabs] = useState([])

  const handleScan = async () => {
    const path = inputPath.trim()
    if (!path) return
    setScanning(true)
    setScanError('')
    setFiles([])
    setStats(null)
    setActiveFile(null)
    setFileData(null)
    setOpenTabs([])
    try {
      const { data } = await api.scan(path, ignorePatterns)
      setProjectPath(path)
      setFiles(data.files)
      setStats(data.stats)
      setFrameworks(data.frameworks)
    } catch (e) {
      setScanError(e.response?.data?.detail || 'Scan failed. Check the path and try again.')
    } finally {
      setScanning(false)
    }
  }

  const handleFileSelect = useCallback(async (item) => {
    if (item.type !== 'file') return
    setActiveFile(item)
    setActiveTab('preview')
    setOpenTabs(prev => {
      if (prev.find(t => t.path === item.path)) return prev
      return [...prev.slice(-7), item]
    })
    setFileLoading(true)
    setFileData(null)
    try {
      const { data } = await api.getFile(item.path, projectPath)
      setFileData(data)
    } catch (e) {
      setFileData({ name: item.name, content: '// Error loading file: ' + (e.response?.data?.detail || e.message), language: 'Text', lines: 1, size_str: '0B', encoding: 'UTF-8' })
    } finally {
      setFileLoading(false)
    }
  }, [projectPath])

  const handleTabClick = (tab) => { setActiveFile(tab); handleFileSelect(tab) }

  const closeTab = (e, path) => {
    e.stopPropagation()
    setOpenTabs(prev => prev.filter(t => t.path !== path))
    if (activeFile?.path === path) { setActiveFile(null); setFileData(null) }
  }

  const handleIgnoreSave = () => {
    setIgnorePatterns(ignoreText.split('\n').map(l => l.trim()).filter(Boolean))
    setShowIgnoreEditor(false)
  }

  const projectName = projectPath ? projectPath.split(/[/\\]/).filter(Boolean).pop() : null

  return (
    <div className="app-shell">
      <div className="titlebar">
        <div className="tb-dots">
          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
        </div>
        <span className="tb-appname">PROJECT ANALYZER</span>
        <div className="tb-path-wrap">
          <input className="tb-path-input" value={inputPath} onChange={e => setInputPath(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} placeholder="/path/to/your/project" spellCheck={false} />
          <button className="btn primary tb-scan-btn" onClick={handleScan} disabled={scanning}>
            {scanning ? '⏳ Scanning...' : '⚡ Scan'}
          </button>
          <button className="btn tb-ignore-btn" onClick={() => setShowIgnoreEditor(v => !v)} title="Edit ignore patterns">🚫</button>
        </div>
        {projectName && (
          <div className="tb-project-name">
            <span>📁</span> {projectName}
            {stats && <span className="tb-count"> · {stats.total_files} files</span>}
          </div>
        )}
      </div>

      {showIgnoreEditor && (
        <div className="ignore-editor">
          <div className="ie-header">
            <span>Ignore Patterns (one per line)</span>
            <div style={{display:'flex',gap:6}}>
              <button className="btn success" onClick={handleIgnoreSave}>Save</button>
              <button className="btn" onClick={() => setShowIgnoreEditor(false)}>✕</button>
            </div>
          </div>
          <textarea className="ie-textarea mono" value={ignoreText} onChange={e => setIgnoreText(e.target.value)} rows={8} />
        </div>
      )}

      {scanError && <div className="scan-error">⚠ {scanError}</div>}

      <div className="main-layout">
        <div className="left-panel">
          <div className="panel-header">
            <span>Explorer</span>
            {stats && <span className="ph-badge">{stats.total_files}</span>}
          </div>
          <div className="tree-search-wrap">
            <input className="tree-search" value={treeSearch} onChange={e => setTreeSearch(e.target.value)} placeholder="Filter files..." />
          </div>
          <FileTree files={files} activeFile={activeFile} onSelect={handleFileSelect} searchQuery={treeSearch} />
        </div>

        <div className="center-panel">
          <div className="tab-bar">
            <div className={`tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
              <span className="tab-dot" />{fileData ? fileData.name : 'Preview'}
            </div>
            <div className={`tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>🔍 Search</div>
            <div className="open-tabs-scroll">
              {openTabs.map(tab => (
                <div key={tab.path} className={`open-tab ${activeFile?.path === tab.path ? 'active' : ''}`} onClick={() => handleTabClick(tab)}>
                  {tab.name}
                  <span className="close-tab" onClick={(e) => closeTab(e, tab.path)}>✕</span>
                </div>
              ))}
            </div>
          </div>
          <div className="center-content">
            {activeTab === 'preview' && <CodeViewer fileData={fileData} loading={fileLoading} />}
            {activeTab === 'search' && <SearchPanel projectPath={projectPath} ignorePatterns={ignorePatterns} onFileOpen={handleFileSelect} />}
          </div>
        </div>

        <div className="right-panel">
          <div className="panel-header">Actions</div>
          <ActionPanel projectPath={projectPath} stats={stats} frameworks={frameworks} ignorePatterns={ignorePatterns} />
        </div>
      </div>

      <div className="statusbar">
        <span className="sb-item"><span className={`sb-dot ${projectPath ? 'green' : 'gray'}`} />{projectPath ? 'Ready' : 'No project'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData?.name || 'No file'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData?.language || '—'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData ? fileData.lines + ' lines' : '—'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData?.encoding || 'UTF-8'}</span>
        <div style={{flex:1}} />
        <span className="sb-item">Project Analyzer v1.0</span>
      </div>
    </div>
  )
}
