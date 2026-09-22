import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGS = [
  ['bash', bash],
  ['csharp', csharp],
  ['css', css],
  ['go', go],
  ['html', xml],
  ['java', java],
  ['javascript', javascript],
  ['json', json],
  ['python', python],
  ['sql', sql],
  ['typescript', typescript],
  ['yaml', yaml],
]

let ready = false

function ensureRegistered() {
  if (ready) return
  for (const [id, mod] of LANGS) hljs.registerLanguage(id, mod)
  ready = true
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function highlightCode(content, lang) {
  ensureRegistered()
  const text = content ?? ''
  if (!text) return ''

  if (!lang) {
    return escapeHtml(text)
  }

  try {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
    }
  } catch { /* fall through */ }

  return escapeHtml(text)
}
