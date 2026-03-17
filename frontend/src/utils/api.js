import axios from 'axios'

const BASE = '/api'

export const api = {
  scan: (path, ignorePatterns) =>
    axios.post(`${BASE}/scan`, { path, ignore_patterns: ignorePatterns }),

  getFile: (path, base) =>
    axios.get(`${BASE}/file`, { params: { path, base } }),

  search: (payload) =>
    axios.post(`${BASE}/search`, payload),

  compileDownload: (payload) =>
    axios.post(`${BASE}/compile/download`, payload, { responseType: 'blob' }),

  exportZip: (path, ignorePatterns) =>
    axios.post(`${BASE}/export/zip`, { path, ignore_patterns: ignorePatterns }, { responseType: 'blob' }),

  securityScan: (path, ignorePatterns) =>
    axios.post(`${BASE}/security/scan`, { path, ignore_patterns: ignorePatterns }),

  generateAiPrompt: (path, ignorePatterns) =>
    axios.post(`${BASE}/generate/ai-prompt`, { path, ignore_patterns: ignorePatterns }),

  generateDocs: (path, ignorePatterns) =>
    axios.post(`${BASE}/generate/documentation`, { path, ignore_patterns: ignorePatterns }),

  chunkAi: (path, maxTokens) =>
    axios.post(`${BASE}/chunk/ai`, { path, max_tokens_per_chunk: maxTokens }),
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  a.remove()
}
