import { useState, useCallback } from 'react'
import FileTree from './components/FileTree'
import CodeViewer from './components/CodeViewer'
import SearchPanel from './components/SearchPanel'
import ActionPanel from './components/ActionPanel'
import {
  DEFAULT_IGNORE, walkDirectory, buildTreeItems, buildStats,
  detectFrameworks, readLocalFile
} from './utils/localProject'
import './App.css'

export default function App() {
  const [rootHandle, setRootHandle] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [files, setFiles] = useState([])
  const [treeItems, setTreeItems] = useState([])
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
  const [includeSensitive, setIncludeSensitive] = useState(false)
  const [treeSearch, setTreeSearch] = useState('')
  const [openTabs, setOpenTabs] = useState([])

  const openFolder = async () => {
    if (!window.showDirectoryPicker) {
      setScanError('Folder access is not supported by this browser. Use a Chromium-based browser such as Chrome or Edge.')
      return
    }

    try {
      setScanning(true)
      setScanError('')
      const handle = await window.showDirectoryPicker({ mode: 'read' })
      const result = await walkDirectory(handle, { ignorePatterns, includeSensitive })
      setRootHandle(handle)
      setProjectName(handle.name)
      setFiles(result.files)
      setTreeItems(buildTreeItems(result.files, result.folders, handle.name))
      setStats(buildStats(result.files, result.folders))
      setFrameworks(detectFrameworks(result.files))
      setActiveFile(null)
      setFileData(null)
      setOpenTabs([])
      setActiveTab('preview')
    } catch (e) {
      if (e?.name !== 'AbortError') setScanError(e.message || 'Unable to open folder.')
    } finally {
      setScanning(false)
    }
  }

  const handleRescan = async () => {
    if (!rootHandle) return openFolder()
    try {
      setScanning(true)
      setScanError('')
      const result = await walkDirectory(rootHandle, { ignorePatterns, includeSensitive })
      setFiles(result.files)
      setTreeItems(buildTreeItems(result.files, result.folders, projectName))
      setStats(buildStats(result.files, result.folders))
      setFrameworks(detectFrameworks(result.files))
    } catch (e) {
      setScanError(e.message || 'Unable to rescan folder.')
    } finally {
      setScanning(false)
    }
  }

  const handleFileSelect = useCallback(async (item) => {
    if (item.type !== 'file') return
    setActiveFile(item)
    setActiveTab('preview')
    setOpenTabs(prev => prev.find(t => t.path === item.path) ? prev : [...prev.slice(-7), item])
    setFileLoading(true)
    setFileData(null)

    try {
      const content = await readLocalFile(item)
      setFileData({
        name: item.name,
        path: item.path,
        content,
        language: item.language,
        lines: content.split(/\\r?\\n/).length,
        size_str: item.size_str,
        encoding: 'UTF-8'
      })
    } catch (e) {
      setFileData({
        name: item.name,
        path: item.path,
        content: '// Error loading file: ' + e.message,
        language: 'Text',
        lines: 1,
        size_str: '0B',
        encoding: 'UTF-8'
      })
    } finally {
      setFileLoading(false)
    }
  }, [])

  const handleTabClick = tab => handleFileSelect(tab)

  const closeTab = (e, path) => {
    e.stopPropagation()
    setOpenTabs(prev => prev.filter(t => t.path !== path))
    if (activeFile?.path === path) {
      setActiveFile(null)
      setFileData(null)
    }
  }

  const handleIgnoreSave = async () => {
    setIgnorePatterns(ignoreText.split('\\n').map(l => l.trim()).filter(Boolean))
    setShowIgnoreEditor(false)
    if (rootHandle) await handleRescan()
  }

  const loaded = Boolean(rootHandle)

  return (
    <div className="app-shell">
      <div className="titlebar">
        <div className="tb-dots">
          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
        </div>
        <span className="tb-appname">PROJECT ANALYZER</span>

        <div className="tb-path-wrap">
          <span className="tb-local-badge">LOCAL ONLY</span>
          <button className="btn primary tb-scan-btn" onClick={openFolder} disabled={scanning}>
            {scanning ? '⏳ Scanning...' : loaded ? '📂 Open Folder' : '📂 Open Folder'}
          </button>
          <button className="btn tb-ignore-btn" onClick={() => setShowIgnoreEditor(v => !v)} title="Edit ignore patterns">🚫</button>
        </div>

        {loaded && (
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

      <div className="local-toolbar">
        <label className="sensitive-toggle">
          <input type="checkbox" checked={includeSensitive} onChange={e => setIncludeSensitive(e.target.checked)} />
          Include sensitive files
        </label>
        {loaded && <button className="btn" onClick={handleRescan} disabled={scanning}>↻ Rescan</button>}
        <span className="local-note">Your folder stays in this browser tab. No project path is uploaded.</span>
      </div>

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
          <FileTree files={treeItems} activeFile={activeFile} onSelect={handleFileSelect} searchQuery={treeSearch} />
        </div>

        <div className="center-panel">
          <div className="tab-bar">
            <div className={\`tab \${activeTab === 'preview' ? 'active' : ''}\`} onClick={() => setActiveTab('preview')}>
              <span className="tab-dot" />{fileData ? fileData.name : 'Preview'}
            </div>
            <div className={\`tab \${activeTab === 'search' ? 'active' : ''}\`} onClick={() => setActiveTab('search')}>🔍 Search</div>
            <div className="open-tabs-scroll">
              {openTabs.map(tab => (
                <div key={tab.path} className={\`open-tab \${activeFile?.path === tab.path ? 'active' : ''}\`} onClick={() => handleTabClick(tab)}>
                  {tab.name}
                  <span className="close-tab" onClick={(e) => closeTab(e, tab.path)}>✕</span>
                </div>
              ))}
            </div>
          </div>
          <div className="center-content">
            {activeTab === 'preview' && <CodeViewer fileData={fileData} loading={fileLoading} />}
            {activeTab === 'search' && (
              <SearchPanel files={files} onFileOpen={handleFileSelect} />
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="panel-header">Actions</div>
          <ActionPanel
            projectName={projectName}
            files={files}
            stats={stats}
            frameworks={frameworks}
            ignorePatterns={ignorePatterns}
          />
        </div>
      </div>

      <div className="statusbar">
        <span className="sb-item"><span className={\`sb-dot \${loaded ? 'green' : 'gray'}\`} />{loaded ? 'Local ready' : 'No project'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData?.name || 'No file'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData?.language || '—'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData ? fileData.lines + ' lines' : '—'}</span>
        <span className="sb-sep">|</span>
        <span className="sb-item">{fileData?.encoding || 'UTF-8'}</span>
        <div style={{flex:1}} />
        <span className="sb-item">Project Analyzer v1.1 · Local</span>
      </div>
    </div>
  )
}
