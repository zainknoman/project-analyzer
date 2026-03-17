// Simple syntax highlighter – returns array of {text, class} tokens per line

const PYTHON_KW = /\b(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|True|False|None|try|except|finally|with|as|pass|raise|lambda|yield|global|nonlocal|async|await|break|continue)\b/g
const JS_KW = /\b(const|let|var|function|return|if|else|for|while|import|export|default|class|extends|new|this|typeof|instanceof|async|await|try|catch|finally|throw|break|continue|switch|case|of|in|from|true|false|null|undefined)\b/g
const STRINGS = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g
const NUMBERS = /\b\d+\.?\d*\b/g
const COMMENTS_PY = /#.*/g
const COMMENTS_JS = /\/\/.*/g
const FUNC_CALL = /\b([a-zA-Z_]\w*)\s*(?=\()/g

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

export function highlight(code, language) {
  if (!code) return ''
  const lines = code.split('\n')
  return lines.map(line => highlightLine(line, language)).join('\n')
}

function highlightLine(line, language) {
  const lang = (language || '').toLowerCase()
  let result = escHtml(line)

  const wrap = (regex, cls, src) => {
    return src.replace(regex, m => `<span class="hl-${cls}">${escHtml(m)}</span>`)
  }

  // We apply patterns directly on safe HTML
  if (lang === 'python') {
    result = result.replace(STRINGS, m => `<span class="hl-str">${m}</span>`)
    result = result.replace(PYTHON_KW, m => `<span class="hl-kw">${m}</span>`)
    result = result.replace(NUMBERS, m => `<span class="hl-num">${m}</span>`)
    result = result.replace(COMMENTS_PY, m => `<span class="hl-cm">${m}</span>`)
  } else if (['javascript','typescript','react jsx','react tsx','vue'].includes(lang)) {
    result = result.replace(STRINGS, m => `<span class="hl-str">${m}</span>`)
    result = result.replace(JS_KW, m => `<span class="hl-kw">${m}</span>`)
    result = result.replace(NUMBERS, m => `<span class="hl-num">${m}</span>`)
    result = result.replace(COMMENTS_JS, m => `<span class="hl-cm">${m}</span>`)
  } else if (lang === 'json') {
    result = result.replace(/"([^"]+)"(\s*:)/g, '<span class="hl-key">"$1"</span>$2')
    result = result.replace(/:\s*"([^"]*)"/g, ': <span class="hl-str">"$1"</span>')
    result = result.replace(/:\s*(\d+\.?\d*)/g, ': <span class="hl-num">$1</span>')
    result = result.replace(/\b(true|false|null)\b/g, '<span class="hl-kw">$1</span>')
  } else if (lang === 'html') {
    result = result.replace(/(&lt;\/?[a-zA-Z][a-zA-Z0-9-]*)/g, '<span class="hl-tag">$1</span>')
    result = result.replace(/([a-zA-Z-]+)=/g, '<span class="hl-attr">$1</span>=')
    result = result.replace(/"([^"]*)"/g, '<span class="hl-str">"$1"</span>')
  }

  return result
}
