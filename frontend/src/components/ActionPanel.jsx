import { useState } from 'react'
import { api, downloadBlob } from '../utils/api'
import './ActionPanel.css'

export default function ActionPanel({ projectPath, stats, frameworks, ignorePatterns }) {
  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [docMd, setDocMd] = useState('')
  const [secResults, setSecResults] = useState(null)
  const [chunks, setChunks] = useState(null)
  const [compileMode, setCompileMode] = useState('single')
  const [maxTokens, setMaxTokens] = useState(4000)
  const [activeSection, setActiveSection] = useState('stats')

  const setL = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  const showToast = (msg, ms = 2500) => {
    setToast(msg)
    setTimeout(() => setToast(''), ms)
  }

  const handleCompile = async () => {
    if (!projectPath) return showToast('⚠ No project loaded')
    setL('compile', true)
    try {
      const { data } = await api.compileDownload({
        path: projectPath, mode: compileMode, ignore_patterns: ignorePatterns,
      })
      downloadBlob(data, `compiled_${compileMode}.zip`)
      showToast('✅ Compiled and downloaded!')
    } catch (e) {
      showToast('❌ Compile failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setL('compile', false)
    }
  }

  const handleExportZip = async () => {
    if (!projectPath) return showToast('⚠ No project loaded')
    setL('zip', true)
    try {
      const { data } = await api.exportZip(projectPath, ignorePatterns)
      downloadBlob(data, `project_export.zip`)
      showToast('✅ Project ZIP downloaded!')
    } catch (e) {
      showToast('❌ Export failed')
    } finally {
      setL('zip', false)
    }
  }

  const handleAiPrompt = async () => {
    if (!projectPath) return showToast('⚠ No project loaded')
    setL('ai', true)
    setActiveSection('ai')
    try {
      const { data } = await api.generateAiPrompt(projectPath, ignorePatterns)
      setAiPrompt(data.prompt)
    } catch (e) {
      showToast('❌ Failed to generate prompt')
    } finally {
      setL('ai', false)
    }
  }

  const handleDocs = async () => {
    if (!projectPath) return showToast('⚠ No project loaded')
    setL('docs', true)
    setActiveSection('docs')
    try {
      const { data } = await api.generateDocs(projectPath, ignorePatterns)
      setDocMd(data.markdown)
    } catch (e) {
      showToast('❌ Failed to generate documentation')
    } finally {
      setL('docs', false)
    }
  }

  const handleSecurity = async () => {
    if (!projectPath) return showToast('⚠ No project loaded')
    setL('sec', true)
    setActiveSection('security')
    try {
      const { data } = await api.securityScan(projectPath, ignorePatterns)
      setSecResults(data)
    } catch (e) {
      showToast('❌ Security scan failed')
    } finally {
      setL('sec', false)
    }
  }

  const handleChunk = async () => {
    if (!projectPath) return showToast('⚠ No project loaded')
    setL('chunk', true)
    setActiveSection('chunks')
    try {
      const { data } = await api.chunkAi(projectPath, maxTokens)
      setChunks(data)
    } catch (e) {
      showToast('❌ Chunking failed')
    } finally {
      setL('chunk', false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast('✅ Copied to clipboard!'))
  }

  const topLangs = stats?.language_breakdown
    ? Object.entries(stats.language_breakdown).slice(0, 6)
    : []

  const langColors = {
    Python: '#3572a5', JavaScript: '#f1e05a', TypeScript: '#2b7489',
    'React JSX': '#61dafb', Vue: '#42b883', HTML: '#e34c26',
    CSS: '#563d7c', JSON: '#6e9c35', Go: '#00add8', Rust: '#dea584',
  }

  return (
    <div className="action-panel">
      {toast && <div className="ap-toast">{toast}</div>}

      <div className="ap-section-tabs">
        {['stats','compile','ai','docs','security','chunks'].map(s => (
          <button
            key={s}
            className={`apt-btn ${activeSection === s ? 'active' : ''}`}
            onClick={() => setActiveSection(s)}
          >
            {s === 'stats' && '📊'}
            {s === 'compile' && '⚡'}
            {s === 'ai' && '✦'}
            {s === 'docs' && '📝'}
            {s === 'security' && '🛡'}
            {s === 'chunks' && '🤖'}
          </button>
        ))}
      </div>

      <div className="ap-body scrollable">

        {/* ── Stats ── */}
        {activeSection === 'stats' && (
          <div className="ap-content">
            <div className="ap-label">Project Stats</div>
            {stats ? (
              <>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="sc-val">{stats.total_files}</div>
                    <div className="sc-lbl">files</div>
                  </div>
                  <div className="stat-card">
                    <div className="sc-val">{stats.total_folders}</div>
                    <div className="sc-lbl">folders</div>
                  </div>
                  <div className="stat-card">
                    <div className="sc-val">{stats.total_size_str}</div>
                    <div className="sc-lbl">total size</div>
                  </div>
                  <div className="stat-card">
                    <div className="sc-val">{Object.keys(stats.language_breakdown).length}</div>
                    <div className="sc-lbl">languages</div>
                  </div>
                </div>

                {topLangs.length > 0 && (
                  <div className="lang-section">
                    <div className="ap-label" style={{marginTop:12}}>Languages</div>
                    {topLangs.map(([lang, pct]) => (
                      <div key={lang} className="lang-row">
                        <span className="lang-dot" style={{ background: langColors[lang] || '#8b949e' }} />
                        <span className="lang-name">{lang}</span>
                        <div className="lang-bar-bg">
                          <div className="lang-bar-fill" style={{ width: `${pct}%`, background: langColors[lang] || '#8b949e' }} />
                        </div>
                        <span className="lang-pct">{pct}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {frameworks && frameworks.length > 0 && (
                  <div className="fw-section">
                    <div className="ap-label" style={{marginTop:12}}>Detected</div>
                    <div className="fw-tags">
                      {frameworks.map(fw => (
                        <span key={fw} className="fw-tag">{fw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {stats.largest_files?.length > 0 && (
                  <div>
                    <div className="ap-label" style={{marginTop:12}}>Largest Files</div>
                    {stats.largest_files.slice(0,5).map(f => (
                      <div key={f.path} className="largest-row">
                        <span className="lr-name">{f.name}</span>
                        <span className="lr-size">{f.size_str}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="ap-empty">Scan a project to see stats</div>
            )}
          </div>
        )}

        {/* ── Compile ── */}
        {activeSection === 'compile' && (
          <div className="ap-content">
            <div className="ap-label">Compile Mode</div>
            <div className="mode-grid">
              <div
                className={`mode-card ${compileMode === 'single' ? 'active' : ''}`}
                onClick={() => setCompileMode('single')}
              >
                <div className="mc-title">Single File</div>
                <div className="mc-sub">→ PROJECT_COMPILED.txt</div>
              </div>
              <div
                className={`mode-card ${compileMode === 'grouped' ? 'active' : ''}`}
                onClick={() => setCompileMode('grouped')}
              >
                <div className="mc-title">Grouped</div>
                <div className="mc-sub">→ backend/frontend/configs</div>
              </div>
            </div>

            {compileMode === 'grouped' && (
              <div className="routing-rules">
                <div className="ap-label" style={{marginTop:10}}>Routing Rules</div>
                <div className="rules-box">
                  {['*.py → backend','*.js,*.jsx → frontend','*.vue → frontend','*.json → configs','*.html → frontend','*.md → docs'].map(r => (
                    <div key={r} className="rule-row">{r}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="ap-actions">
              <button className="btn primary full" onClick={handleCompile} disabled={loading.compile || !projectPath}>
                {loading.compile ? '⏳ Compiling...' : '⚡ Compile & Download'}
              </button>
              <button className="btn full" onClick={handleExportZip} disabled={loading.zip || !projectPath}>
                {loading.zip ? '⏳ Exporting...' : '📦 Export Full ZIP'}
              </button>
            </div>
          </div>
        )}

        {/* ── AI Prompt ── */}
        {activeSection === 'ai' && (
          <div className="ap-content">
            <div className="ap-label">AI Analysis Prompt</div>
            {!aiPrompt && (
              <button className="btn primary full" onClick={handleAiPrompt} disabled={loading.ai || !projectPath}>
                {loading.ai ? '⏳ Generating...' : '✦ Generate AI Prompt'}
              </button>
            )}
            {aiPrompt && (
              <>
                <div className="prompt-box">{aiPrompt}</div>
                <div className="ap-actions">
                  <button className="btn success full" onClick={() => copyToClipboard(aiPrompt)}>📋 Copy to Clipboard</button>
                  <button className="btn full" onClick={handleAiPrompt} disabled={loading.ai}>↺ Regenerate</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Docs ── */}
        {activeSection === 'docs' && (
          <div className="ap-content">
            <div className="ap-label">Project Documentation</div>
            {!docMd && (
              <button className="btn primary full" onClick={handleDocs} disabled={loading.docs || !projectPath}>
                {loading.docs ? '⏳ Generating...' : '📝 Generate PROJECT_SUMMARY.md'}
              </button>
            )}
            {docMd && (
              <>
                <div className="prompt-box mono">{docMd}</div>
                <div className="ap-actions">
                  <button className="btn success full" onClick={() => {
                    const blob = new Blob([docMd], { type: 'text/markdown' })
                    downloadBlob(blob, 'PROJECT_SUMMARY.md')
                  }}>💾 Download .md</button>
                  <button className="btn full" onClick={() => copyToClipboard(docMd)}>📋 Copy</button>
                  <button className="btn full" onClick={handleDocs} disabled={loading.docs}>↺ Regenerate</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Security ── */}
        {activeSection === 'security' && (
          <div className="ap-content">
            <div className="ap-label">Security Scanner</div>
            {!secResults && (
              <button className="btn orange full" onClick={handleSecurity} disabled={loading.sec || !projectPath}>
                {loading.sec ? '⏳ Scanning...' : '🛡 Run Security Scan'}
              </button>
            )}
            {secResults && (
              <>
                <div className={`risk-badge ${secResults.risk_level}`}>
                  {secResults.risk_level === 'low' ? '✅ Low Risk' :
                   secResults.risk_level === 'medium' ? '⚠ Medium Risk' : '🔴 High Risk'}
                  <span className="risk-sub"> · {secResults.files_scanned} files scanned</span>
                </div>
                {secResults.findings.length === 0 ? (
                  <div className="sec-clean">No secrets detected</div>
                ) : (
                  <div className="findings-list">
                    {secResults.findings.map((f, i) => (
                      <div key={i} className={`finding ${f.severity}`}>
                        <div className="finding-header">
                          <span className="finding-type">{f.type}</span>
                          <span className={`sev-badge ${f.severity}`}>{f.severity}</span>
                        </div>
                        <div className="finding-loc">{f.file}:{f.line}</div>
                        <div className="finding-snippet">{f.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn full" style={{marginTop:8}} onClick={handleSecurity} disabled={loading.sec}>↺ Rescan</button>
              </>
            )}
          </div>
        )}

        {/* ── AI Chunks ── */}
        {activeSection === 'chunks' && (
          <div className="ap-content">
            <div className="ap-label">AI Code Chunking</div>
            <div className="chunk-setting">
              <label>Max tokens per chunk</label>
              <input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(Number(e.target.value))}
                min={500}
                max={32000}
                step={500}
                style={{width:'90px'}}
              />
            </div>
            <button className="btn primary full" onClick={handleChunk} disabled={loading.chunk || !projectPath}>
              {loading.chunk ? '⏳ Chunking...' : '🤖 Generate Chunks'}
            </button>
            {chunks && (
              <>
                <div className="chunks-summary">{chunks.total_chunks} chunks generated</div>
                <div className="chunks-list">
                  {chunks.chunks.map(c => (
                    <div key={c.index} className="chunk-item">
                      <span className="ci-name">{c.name}</span>
                      <span className="ci-tokens">~{c.estimated_tokens} tokens</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
