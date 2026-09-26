export const TEXT_EXTENSIONS = new Set([
  '.js','.jsx','.ts','.tsx','.vue','.py','.java','.kt','.go','.rs','.php','.cs',
  '.cpp','.c','.h','.html','.css','.scss','.json','.md','.txt','.xml','.yaml',
  '.yml','.sql','.sh','.bat','.ps1','.env','.toml'
])

export const DEFAULT_IGNORE = [
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.env', '*.log', '*.tmp', '*.pyc', '.DS_Store', 'venv', '.venv',
  '.idea', '.vscode', 'coverage', '.next', '.nuxt', '.turbo', '.cache'
]

const LANGUAGE_MAP = {
  '.py':'Python','.js':'JavaScript','.jsx':'React JSX','.ts':'TypeScript','.tsx':'React TSX',
  '.vue':'Vue','.html':'HTML','.css':'CSS','.scss':'SCSS','.json':'JSON','.yaml':'YAML',
  '.yml':'YAML','.toml':'TOML','.md':'Markdown','.txt':'Text','.sh':'Shell','.bat':'Batch',
  '.ps1':'PowerShell','.java':'Java','.go':'Go','.rs':'Rust','.php':'PHP','.cs':'C#',
  '.cpp':'C++','.c':'C','.h':'C/C++ Header','.sql':'SQL','.xml':'XML'
}

export const languageFor = ext => LANGUAGE_MAP[ext] || 'Text'

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + 'GB'
}

function matchesIgnore(path, patterns) {
  const parts = path.split('/')
  return patterns.some(pattern => {
    const p = pattern.trim()
    if (!p || p.startsWith('#') || p.startsWith('!')) return false
    if (p.includes('*')) {
      const re = new RegExp('^' + p.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i')
      return re.test(path) || parts.some(part => re.test(part))
    }
    return parts.includes(p) || path === p || path.startsWith(p + '/')
  })
}

const sensitiveName = /(^|\/)(\.env|.*secret.*|.*credential.*|.*password.*|.*private.*|.*\.pem$|.*\.key$)/i

export async function walkDirectory(rootHandle, options = {}) {
  const ignorePatterns = options.ignorePatterns || DEFAULT_IGNORE
  const includeSensitive = options.includeSensitive === true
  const maxFileSize = options.maxFileSize || 2 * 1024 * 1024
  const files = []
  const folders = new Set()

  async function walk(handle, parentPath = '') {
    for await (const [name, entry] of handle.entries()) {
      const path = parentPath ? parentPath + '/' + name : name
      if (entry.kind === 'directory') {
        if (matchesIgnore(path, ignorePatterns) || ignorePatterns.includes(name)) continue
        folders.add(path)
        await walk(entry, path)
        continue
      }

      const ext = name.includes('.') ? '.' + name.split('.').pop().toLowerCase() : ''
      const text = TEXT_EXTENSIONS.has(ext) || ['Dockerfile','Makefile','.gitignore'].includes(name)
      const sensitive = sensitiveName.test(path)
      let size = 0
      try { size = (await entry.getFile()).size } catch { continue }
      if (!text || size > maxFileSize || matchesIgnore(path, ignorePatterns)) continue
      if (sensitive && !includeSensitive) continue

      files.push({
        name, path, extension: ext, ext, type: 'file', text: true,
        language: languageFor(ext), size, size_str: formatBytes(size), handle: entry,
        depth: path.split('/').length - 1
      })
    }
  }

  await walk(rootHandle)
  files.sort((a,b) => a.path.localeCompare(b.path))
  return { files, folders: [...folders].sort() }
}

export function buildTreeItems(files, folders, rootName) {
  const items = [{ name: rootName, path: '', type: 'folder', depth: 0, extension: '', language: 'Folder' }]
  for (const path of folders) {
    const parts = path.split('/')
    items.push({ name: parts.at(-1), path, type: 'folder', depth: parts.length, extension: '', language: 'Folder' })
  }
  for (const file of files) items.push(file)
  return items
}

export async function readLocalFile(file) {
  return (await file.handle.getFile()).text()
}

export function buildStats(files, folders) {
  const languageBytes = {}
  let totalSize = 0
  for (const file of files) {
    totalSize += file.size
    languageBytes[file.language] = (languageBytes[file.language] || 0) + file.size
  }
  const total = totalSize || 1
  const language_breakdown = Object.fromEntries(
    Object.entries(languageBytes).sort((a,b) => b[1] - a[1])
      .map(([lang, bytes]) => [lang, Math.round(bytes / total * 1000) / 10])
  )
  const largest = [...files].sort((a,b) => b.size - a.size).slice(0, 10)
  return {
    total_files: files.length, total_folders: folders.length,
    total_size: totalSize, total_size_str: formatBytes(totalSize),
    language_breakdown,
    largest_files: largest.map(f => ({ name:f.name, path:f.path, size:f.size, size_str:f.size_str }))
  }
}

export function detectFrameworks(files) {
  const names = new Set(files.map(f => f.name))
  const result = []
  if (names.has('package.json')) result.push('Node.js')
  if (files.some(f => ['.jsx','.tsx'].includes(f.extension))) result.push('React')
  if (files.some(f => f.extension === '.vue')) result.push('Vue')
  if (files.some(f => f.extension === '.py')) result.push('Python')
  if (files.some(f => f.extension === '.java')) result.push('Java')
  if (files.some(f => f.extension === '.kt')) result.push('Kotlin')
  if (files.some(f => f.extension === '.go')) result.push('Go')
  return [...new Set(result)]
}

export async function searchLocalFiles(files, query, options = {}) {
  const { regex = false, caseSensitive = false, fileTypes = [], maxResults = 200 } = options
  const results = []
  let filesSearched = 0
  const flags = caseSensitive ? 'g' : 'gi'
  let pattern
  try {
    const source = regex ? query : query.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
    pattern = new RegExp(source, flags)
  } catch {
    throw new Error('Invalid regular expression')
  }

  for (const file of files) {
    if (fileTypes.length && !fileTypes.includes(file.extension)) continue
    filesSearched++
    let content
    try { content = await readLocalFile(file) } catch { continue }
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      pattern.lastIndex = 0
      if (pattern.test(lines[i])) {
        results.push({ file: file.path, line: i + 1, content: lines[i] })
        if (results.length >= maxResults) {
          return { results, total: results.length, files_searched: filesSearched, truncated: true }
        }
      }
    }
  }
  return { results, total: results.length, files_searched: filesSearched, truncated: false }
}
