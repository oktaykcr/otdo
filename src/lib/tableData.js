export function isTableSeparator(line) {
  const t = line.trim()
  if (!t.startsWith('|')) return false
  return t.replace(/[|\s:\-]/g, '') === ''
}

export function parseTableRow(line) {
  const t = line.trim()
  if (!t.startsWith('|')) return []
  const inner = t.endsWith('|') ? t.slice(1, -1) : t.slice(1)
  return inner.split('|').map(c => c.trim())
}

export function normalizeTableRows(rows) {
  if (!rows?.length) return [['', '']]
  const cols = Math.max(1, ...rows.map(r => r.length))
  return rows.map(r => {
    const padded = [...r]
    while (padded.length < cols) padded.push('')
    return padded
  })
}

export function parseMarkdownTableLines(lines) {
  const rows = []
  for (const line of lines) {
    if (isTableSeparator(line)) continue
    const cells = parseTableRow(line)
    if (cells.length) rows.push(cells)
  }
  return normalizeTableRows(rows)
}

export function createDefaultTable(rowCount = 2, colCount = 2) {
  return Array.from({ length: rowCount }, (_, ri) =>
    Array.from({ length: colCount }, (_, ci) => (ri === 0 ? `Column ${ci + 1}` : ''))
  )
}

export function serializeTable(rows) {
  const normalized = normalizeTableRows(rows)
  if (!normalized.length) return '| |'

  const body = normalized.map(row => `| ${row.join(' | ')} |`)
  if (normalized.length === 1) {
    const sep = `| ${normalized[0].map(() => '---').join(' | ')} |`
    return `${body[0]}\n${sep}`
  }

  const sep = `| ${normalized[0].map(() => '---').join(' | ')} |`
  return [body[0], sep, ...body.slice(1)].join('\n')
}
