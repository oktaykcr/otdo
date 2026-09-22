export const CODE_LANGUAGES = [
  { id: '', label: 'Plain Text' },
  { id: 'json', label: 'JSON' },
  { id: 'bash', label: 'Bash' },
  { id: 'go', label: 'Go' },
  { id: 'java', label: 'Java' },
  { id: 'csharp', label: 'C#' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'sql', label: 'SQL' },
  { id: 'yaml', label: 'YAML' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
]

const ALIASES = {
  golang: 'go',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
  cs: 'csharp',
  'c#': 'csharp',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  yml: 'yaml',
  xml: 'html',
  markup: 'html',
}

const VALID = new Set(CODE_LANGUAGES.map(l => l.id).filter(Boolean))

export function normalizeLang(raw) {
  if (!raw) return ''
  const key = raw.trim().toLowerCase()
  const mapped = ALIASES[key] || key
  return VALID.has(mapped) ? mapped : ''
}

export function languageLabel(id) {
  return CODE_LANGUAGES.find(l => l.id === normalizeLang(id))?.label || 'Plain Text'
}
