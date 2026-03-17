import { useState } from 'react'
import { api } from '../utils/api'
import './SearchPanel.css'

export default function SearchPanel({ projectPath, ignorePatterns, onFileOpen }) {
  const [query, setQuery] = useState('')
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [fileTypes, setFileTypes] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const doSearch = async () => {
    if (!query.trim() || !projectPath) return
    setLoading(true)
    setError('')
    try {
      const types = fileTypes ? fileTypes.split(',').map(t => t.trim().startsWith('.') ? t.trim() : '.' + t.trim()) : []
      const { data } = await api.search({
        path: projectPath,
        query: query.trim(),
        regex,
        case_sensitive: caseSensitive,
        file_types: types,
        ignore_patterns: ignorePatterns,
        max_results: 200,
      })
      setResults(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') doSearch()
  }

  const grouped = results?.results ? results.results.reduce((acc, r) => {
    acc[r.file] = acc[r.file] || []
    acc[r.file].push(r)
    return acc
  }, {}) : {}

  return (
    <div className="search-panel">
      <div className="search-controls">
        <div className="search-row">
          <input
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search across all files... (Enter to search)"
          />
          <button className="btn primary" onClick={doSearch} disabled={loading || !projectPath}>
            {loading ? '⏳' : '🔍'} Search
          </button>
        </div>
        <div className="search-opts">
          <label className="opt-toggle">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
            Case sensitive
          </label>
          <label className="opt-toggle">
            <input type="checkbox" checked={regex} onChange={e => setRegex(e.target.checked)} />
            Regex
          </label>
          <input
            className="type-filter"
            value={fileTypes}
            onChange={e => setFileTypes(e.target.value)}
            placeholder="Filter: .py, .js, ..."
          />
        </div>
      </div>

      {error && <div className="search-error">{error}</div>}

      {results && (
        <div className="search-summary">
          {results.total} result{results.total !== 1 ? 's' : ''} in {Object.keys(grouped).length} file{Object.keys(grouped).length !== 1 ? 's' : ''}
          {' '}— searched {results.files_searched} files
          {results.truncated && <span className="truncated-note"> (truncated at 200)</span>}
        </div>
      )}

      <div className="search-results scrollable">
        {!results && !loading && (
          <div className="search-hint">
            <div className="hint-icon">🔍</div>
            <div>Search across all project files</div>
            <div className="hint-sub">Supports plain text and regex patterns</div>
          </div>
        )}
        {loading && (
          <div className="search-hint">
            <div className="spin-sm" />
            <div>Searching...</div>
          </div>
        )}
        {Object.entries(grouped).map(([file, matches]) => (
          <div key={file} className="result-group">
            <div className="result-file" onClick={() => onFileOpen && onFileOpen({ path: file, type: 'file' })}>
              <span className="rf-icon">📄</span>
              <span className="rf-path">{file}</span>
              <span className="rf-count">{matches.length}</span>
            </div>
            {matches.map((m, i) => (
              <div
                key={i}
                className="result-line"
                onClick={() => onFileOpen && onFileOpen({ path: file, type: 'file' })}
              >
                <span className="rl-num">{m.line}</span>
                <span className="rl-content">{m.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
