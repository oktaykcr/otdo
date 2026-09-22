/**
 * Block data model ↔ Markdown serialization
 *
 * Block: { id, type, content, todoId?, indent?, lang? }
 * Types: p | h1 | h2 | h3 | bullet | numbered | quote | code | divider | todo | table
 */

import { normalizeLang } from './codeLanguages'
import {
  parseMarkdownTableLines,
  serializeTable,
  createDefaultTable,
} from './tableData'

export { createDefaultTable }

export function newBlock(type = 'p', content = '', extra = {}) {
  return { id: crypto.randomUUID(), type, content, ...extra }
}

const MARKDOWN_SHORTCUT_TYPES = new Set(['p', 'h1', 'h2', 'h3', 'quote'])

/**
 * Detect Notion-style markdown prefixes typed at the start of a block
 * (e.g. "- " → bullet). Returns null when no conversion should happen.
 */
export function matchMarkdownShortcut(content, currentType) {
  if (!MARKDOWN_SHORTCUT_TYPES.has(currentType)) return null
  if (content == null) return null

  const rules = [
    { re: /^### $/, type: 'h3' },
    { re: /^## $/, type: 'h2' },
    { re: /^# $/, type: 'h1' },
    { re: /^> $/, type: 'quote' },
    { re: /^```$/, type: 'code', extra: { lang: '' } },
    { re: /^---$/, type: 'divider' },
    { re: /^\[\] $/, type: 'todo' },
    { re: /^[-*] $/, type: 'bullet' },
    { re: /^\d+\. $/, type: 'numbered' },
  ]

  for (const rule of rules) {
    if (!rule.re.test(content)) continue
    if (rule.type === currentType) return null
    return { type: rule.type, content: '', extra: rule.extra || {} }
  }
  return null
}

export function getNumberedListIndex(blocks, idx) {
  const block = blocks[idx]
  if (!block || block.type !== 'numbered') return 1
  const indent = block.indent || 0
  let num = 1
  for (let i = idx - 1; i >= 0; i--) {
    const b = blocks[i]
    if (b.type !== 'numbered' || (b.indent || 0) !== indent) break
    num++
  }
  return num
}

// ─── Markdown → Blocks ───────────────────────────────────────────────────────

const BLOCK_PASTE_LINE_RE = /^(#{1,3} .+|[-*] .+|\d+\. .+|> .+|```|---+|- \[[ x]\] .+|\|.+\|)\s*$/

export function shouldParsePasteAsBlocks(text) {
  if (text == null || text === '') return false
  const normalized = String(text).replace(/\r\n/g, '\n')
  if (!normalized.trim()) return false
  if (normalized.includes('\n')) return true
  return BLOCK_PASTE_LINE_RE.test(normalized.trim())
}

/**
 * Insert clipboard markdown into a text block, splitting into structured blocks.
 * Returns null when the paste should use the browser default.
 */
export function insertMarkdownPaste(blocks, idx, start, end, text) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n')
  if (!shouldParsePasteAsBlocks(normalized)) return null

  const current = blocks[idx]
  if (!current) return null
  if (['code', 'table', 'todo', 'divider'].includes(current.type)) return null

  const before = current.content.slice(0, start)
  const after = current.content.slice(end)
  const parsed = parseBlocks(normalized)
  if (!parsed.length) return null

  const replaceWhole = start === 0 && end >= current.content.length && !before && !after

  if (replaceWhole) {
    const next = [...blocks.slice(0, idx), ...parsed, ...blocks.slice(idx + 1)]
    const focusIdx = idx + parsed.length - 1
    return {
      blocks: next,
      focusIdx,
      cursor: next[focusIdx]?.content?.length ?? 0,
    }
  }

  if (parsed.length === 1) {
    const p = parsed[0]
    const adoptType = !before && !after
    if (adoptType && (p.type === 'divider' || p.type === 'table' || p.type === 'code' || p.type === 'todo')) {
      const next = [...blocks]
      next[idx] = { ...p, id: current.id }
      if (p.type === 'divider') {
        next.splice(idx + 1, 0, newBlock('p'))
        return { blocks: next, focusIdx: idx + 1, cursor: 0 }
      }
      return { blocks: next, focusIdx: idx, cursor: p.content?.length ?? 0 }
    }

    const next = [...blocks]
    next[idx] = {
      ...current,
      type: adoptType ? p.type : current.type,
      content: before + p.content + after,
      ...(adoptType && p.indent != null ? { indent: p.indent } : {}),
    }
    return {
      blocks: next,
      focusIdx: idx,
      cursor: before.length + p.content.length,
    }
  }

  const [first, ...rest] = parsed
  const last = rest[rest.length - 1]
  const middle = rest.slice(0, -1)

  const head = before
    ? { ...current, content: before + first.content }
    : { ...first, id: current.id }

  const tail = {
    ...last,
    content: last.content + after,
  }

  const inserted = [head, ...middle, tail]
  const next = [...blocks.slice(0, idx), ...inserted, ...blocks.slice(idx + 1)]
  const focusIdx = idx + inserted.length - 1

  return {
    blocks: next,
    focusIdx,
    cursor: last.content.length,
  }
}

export function parseBlocks(markdown) {
  if (!markdown?.trim()) return [newBlock('p')]

  const lines   = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks  = []
  let i         = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.trimStart().startsWith('```')) {
      const lang  = normalizeLang(line.slice(line.indexOf('```') + 3).trim())
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push(newBlock('code', codeLines.join('\n'), { lang }))
      i++
      continue
    }

    // Markdown table
    if (line.trim().startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = parseMarkdownTableLines(tableLines)
      if (rows.length) {
        blocks.push(newBlock('table', '', { rows }))
        continue
      }
    }

    // Divider
    if (/^---+$/.test(line.trim())) {
      blocks.push(newBlock('divider', ''))
      i++; continue
    }

    // Headings
    const h3 = line.match(/^### (.+)$/)
    const h2 = line.match(/^## (.+)$/)
    const h1 = line.match(/^# (.+)$/)
    if (h1) { blocks.push(newBlock('h1', h1[1])); i++; continue }
    if (h2) { blocks.push(newBlock('h2', h2[1])); i++; continue }
    if (h3) { blocks.push(newBlock('h3', h3[1])); i++; continue }

    // Todo checkbox
    const todoMatch = line.match(/^- \[( |x)\] (.+?)(?:\s*<!--todo:([^>]+)-->)?$/)
    if (todoMatch) {
      const content = todoMatch[2].trim()
      const todoId  = todoMatch[3] || null
      blocks.push(newBlock('todo', content, { todoId }))
      i++; continue
    }

    // Bullet
    const bullet = line.match(/^(\s*)[-*] (.+)$/)
    if (bullet) {
      blocks.push(newBlock('bullet', bullet[2], { indent: bullet[1].length / 2 | 0 }))
      i++; continue
    }

    // Numbered
    const numbered = line.match(/^(\s*)\d+\. (.+)$/)
    if (numbered) {
      blocks.push(newBlock('numbered', numbered[2], { indent: numbered[1].length / 2 | 0 }))
      i++; continue
    }

    // Quote
    const quote = line.match(/^> (.+)$/)
    if (quote) {
      blocks.push(newBlock('quote', quote[1]))
      i++; continue
    }

    // Empty line → skip (not a block)
    if (line.trim() === '') {
      // Only add paragraph separator if needed
      i++; continue
    }

    // Paragraph
    blocks.push(newBlock('p', line))
    i++
  }

  return blocks.length ? blocks : [newBlock('p')]
}

// ─── Blocks → Markdown ───────────────────────────────────────────────────────

export function serializeBlocks(blocks) {
  return blocks.map(b => {
    switch (b.type) {
      case 'h1':      return `# ${b.content}`
      case 'h2':      return `## ${b.content}`
      case 'h3':      return `### ${b.content}`
      case 'bullet':  return `${'  '.repeat(b.indent || 0)}- ${b.content}`
      case 'numbered':return `${'  '.repeat(b.indent || 0)}1. ${b.content}`
      case 'quote':   return `> ${b.content}`
      case 'divider': return '---'
      case 'code':    return `\`\`\`${b.lang || ''}\n${b.content}\n\`\`\``
      case 'todo': {
        const id = b.todoId ? ` <!--todo:${b.todoId}-->` : ''
        return `- [ ] ${b.content}${id}`
      }
      case 'table': return serializeTable(b.rows)
      default:        return b.content
    }
  }).join('\n')
}
