const TAG_COLORS = [
  { color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  { color: '#EC4899', bg: 'rgba(236,72,153,0.15)' },
  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  { color: '#14B8A6', bg: 'rgba(20,184,166,0.15)' },
  { color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
]

export function normalizeTag(raw) {
  if (raw == null) return ''
  return String(raw)
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 32)
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  const seen = new Set()
  const result = []
  for (const t of tags) {
    const n = normalizeTag(t)
    if (!n || seen.has(n)) continue
    seen.add(n)
    result.push(n)
  }
  return result
}

export function getTagStyle(tag) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export function noteMatchesSearchQuery(note, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (note.name?.toLowerCase().includes(q)) return true
  return (note.tags || []).some(tag => tag.includes(q))
}
