import { useEffect, useRef } from 'react'
import { highlight } from '../utils/highlight'
import './CodeViewer.css'

export default function CodeViewer({ fileData, loading }) {
  const viewerRef = useRef(null)

  useEffect(() => {
    if (viewerRef.current) viewerRef.current.scrollTop = 0
  }, [fileData])

  if (loading) {
    return (
      <div className="cv-center">
        <div className="cv-spinner" />
        <div className="cv-msg">Loading file...</div>
      </div>
    )
  }

  if (!fileData) {
    return (
      <div className="cv-center">
        <div className="cv-welcome-icon">{'</>'}</div>
        <div className="cv-welcome-title">Project File Analyzer</div>
        <div className="cv-welcome-sub">Select a file from the explorer to preview it with syntax highlighting</div>
      </div>
    )
  }

  const lines = fileData.content ? fileData.content.split('\n') : []
  const highlighted = highlight(fileData.content, fileData.language)
  const hlLines = highlighted.split('\n')

  return (
    <div className="code-viewer" ref={viewerRef}>
      <div className="cv-topbar">
        <span className="cv-filename">{fileData.name}</span>
        <span className="cv-meta">{fileData.language}</span>
        <span className="cv-meta">{lines.length} lines</span>
        <span className="cv-meta">{fileData.size_str}</span>
        <span className="cv-meta">{fileData.encoding || 'UTF-8'}</span>
      </div>
      <div className="cv-code-wrap">
        <div className="cv-gutter">
          {lines.map((_, i) => (
            <div key={i} className="cv-lineno">{i + 1}</div>
          ))}
        </div>
        <div className="cv-code">
          {hlLines.map((line, i) => (
            <div
              key={i}
              className="cv-line"
              dangerouslySetInnerHTML={{ __html: line || ' ' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
