/** Inline markdown: **bold** *italic* ~~strike~~ [color:HEX]text[/color] (nestable) */

export const TEXT_FORMAT_COLORS = [
  { id: 'default', label: 'Default', hex: null },
  { id: 'important', label: 'Red', hex: 'EF4444' },
  { id: 'warning', label: 'Amber', hex: 'F59E0B' },
  { id: 'info', label: 'Blue', hex: '3B82F6' },
  { id: 'accent', label: 'Indigo', hex: '6366F1' },
  { id: 'success', label: 'Green', hex: '10B981' },
  { id: 'muted', label: 'Muted', hex: '94A3B8' },
]

const WRAP_ORDER = { color: 0, bold: 1, italic: 2, strike: 3, code: 4 }
const MAX_PARSE_DEPTH = 12
const MAX_PARSE_LENGTH = 50_000

const FORMAT_MARKERS = {
  bold: { open: '**', close: '**' },
  italic: { open: '*', close: '*' },
  strike: { open: '~~', close: '~~' },
  code: { open: '`', close: '`' },
}

function parseWrapped(text) {
  const formats = []
  let inner = text

  while (true) {
    const colorM = inner.match(/^\[color:([A-Fa-f0-9]{6})\]([\s\S]*)\[\/color\]$/)
    if (colorM) {
      formats.push({ type: 'color', color: colorM[1] })
      inner = colorM[2]
      continue
    }
    if (inner.startsWith('**') && inner.endsWith('**') && inner.length >= 4) {
      formats.push({ type: 'bold' })
      inner = inner.slice(2, -2)
      continue
    }
    if (inner.startsWith('~~') && inner.endsWith('~~') && inner.length >= 4) {
      formats.push({ type: 'strike' })
      inner = inner.slice(2, -2)
      continue
    }
    if (
      inner.startsWith('*') && inner.endsWith('*') && inner.length >= 2 &&
      !inner.startsWith('**') && !inner.endsWith('**')
    ) {
      formats.push({ type: 'italic' })
      inner = inner.slice(1, -1)
      continue
    }
    if (inner.startsWith('`') && inner.endsWith('`') && inner.length >= 2) {
      formats.push({ type: 'code' })
      inner = inner.slice(1, -1)
      continue
    }
    break
  }

  return { inner, formats }
}

function rebuild(inner, formats) {
  let acc = inner
  for (let i = formats.length - 1; i >= 0; i--) {
    const f = formats[i]
    switch (f.type) {
      case 'color': acc = `[color:${f.color}]${acc}[/color]`; break
      case 'bold': acc = `**${acc}**`; break
      case 'italic': acc = `*${acc}*`; break
      case 'strike': acc = `~~${acc}~~`; break
      case 'code': acc = `\`${acc}\``; break
      default: break
    }
  }
  return acc
}

function sortFormats(formats) {
  return [...formats].sort((a, b) => WRAP_ORDER[a.type] - WRAP_ORDER[b.type])
}

export function applyInlineFormat(text, start, end, format, colorHex) {
  const selected = text.slice(start, end)

  if (start === end && format !== 'color') {
    const { open, close } = FORMAT_MARKERS[format] || FORMAT_MARKERS.bold
    const wrapped = `${open}${close}`
    const caret = start + open.length
    return {
      text: text.slice(0, start) + wrapped + text.slice(end),
      start: caret,
      end: caret,
    }
  }

  const { inner, formats } = parseWrapped(selected)
  let nextFormats = formats
  let wrapped

  if (format === 'color') {
    nextFormats = formats.filter(f => f.type !== 'color')
    if (colorHex) {
      nextFormats = sortFormats([{ type: 'color', color: colorHex }, ...nextFormats])
    }
    wrapped = rebuild(inner, sortFormats(nextFormats))
  } else {
    const idx = formats.findIndex(f => f.type === format)
    if (idx >= 0) {
      nextFormats = formats.filter(f => f.type !== format)
    } else {
      nextFormats = [...formats, { type: format }]
    }
    wrapped = rebuild(inner, sortFormats(nextFormats))
  }

  return {
    text: text.slice(0, start) + wrapped + text.slice(end),
    start,
    end: start + wrapped.length,
  }
}

function tryLink(text, i) {
  if (text[i] !== '[') return null
  const rest = text.slice(i)
  if (rest.startsWith('[color:')) return null

  const labelEnd = rest.indexOf(']')
  if (labelEnd <= 1) return null
  if (rest[labelEnd + 1] !== '(') return null

  const hrefStart = labelEnd + 2
  const closeParen = rest.indexOf(')', hrefStart)
  if (closeParen === -1) return null

  const label = rest.slice(1, labelEnd)
  const href = rest.slice(hrefStart, closeParen)
  if (!label || !href.trim()) return null

  return {
    type: 'link',
    href,
    labelStart: i + 1,
    labelEnd: i + labelEnd,
    end: i + closeParen + 1,
  }
}

function tryColorSpan(text, i) {
  const m = text.slice(i).match(/^\[color:([A-Fa-f0-9]{6})\]/)
  if (!m) return null
  const openLen = m[0].length
  const closeIdx = text.indexOf('[/color]', i + openLen)
  if (closeIdx === -1) return null
  return {
    type: 'color',
    color: m[1],
    innerStart: i + openLen,
    innerEnd: closeIdx,
    end: closeIdx + 8,
  }
}

function tryDelimited(text, i, open, close, type) {
  if (!text.startsWith(open, i)) return null
  const innerStart = i + open.length
  const closeIdx = text.indexOf(close, innerStart)
  if (closeIdx === -1) return null
  return { type, innerStart, innerEnd: closeIdx, end: closeIdx + close.length }
}

function parseLevel(text, depth = 0, baseOffset = 0) {
  if (!text) return [{ type: 'text', value: '' }]
  if (depth > MAX_PARSE_DEPTH || text.length > MAX_PARSE_LENGTH) {
    return [{ type: 'text', value: text }]
  }

  const parts = []
  let i = 0
  let textStart = 0

  const pushText = (end) => {
    if (end > textStart) {
      parts.push({ type: 'text', value: text.slice(textStart, end) })
    }
  }

  while (i < text.length) {
    const color = tryColorSpan(text, i)
    const link = !color && tryLink(text, i)
    const bold = !color && !link && tryDelimited(text, i, '**', '**', 'bold')
    const strike = !color && !link && !bold && tryDelimited(text, i, '~~', '~~', 'strike')
    const italic = !color && !link && !bold && !strike && text[i] === '*' && text[i + 1] !== '*'
      ? tryDelimited(text, i, '*', '*', 'italic')
      : null
    const code = !color && !link && !bold && !strike && !italic && text[i] === '`' && text[i + 1] !== '`'
      ? tryDelimited(text, i, '`', '`', 'code')
      : null

    const hit = color || link || bold || strike || italic || code
    if (!hit) {
      i += 1
      continue
    }

    pushText(i)

    if (hit.type === 'link') {
      const label = text.slice(hit.labelStart, hit.labelEnd)
      parts.push({
        type: 'link',
        href: hit.href,
        sourceStart: baseOffset + i,
        sourceEnd: baseOffset + hit.end,
        children: parseLevel(label, depth + 1, baseOffset + hit.labelStart),
      })
    } else if (hit.type === 'color') {
      const inner = text.slice(hit.innerStart, hit.innerEnd)
      parts.push({ type: 'color', color: hit.color, children: parseLevel(inner, depth + 1, baseOffset + hit.innerStart) })
    } else if (hit.type === 'code') {
      const inner = text.slice(hit.innerStart, hit.innerEnd)
      parts.push({ type: 'code', children: [{ type: 'text', value: inner }] })
    } else {
      const inner = text.slice(hit.innerStart, hit.innerEnd)
      parts.push({ type: hit.type, children: parseLevel(inner, depth + 1, baseOffset + hit.innerStart) })
    }

    i = hit.end
    textStart = i
  }

  pushText(text.length)
  return parts.length ? parts : [{ type: 'text', value: text }]
}

export function parseInlineMarkdown(text) {
  return parseLevel(text || '', 0, 0)
}

export function buildLinkMarkdown(label, href) {
  return `[${label}](${href})`
}

export function findLinksInText(text) {
  if (!text) return []
  const links = []
  let i = 0
  while (i < text.length) {
    const hit = tryLink(text, i)
    if (hit) {
      links.push({
        start: i,
        end: hit.end,
        label: text.slice(hit.labelStart, hit.labelEnd),
        href: hit.href,
      })
      i = hit.end
    } else {
      i += 1
    }
  }
  return links
}

export function getLinkAtSelection(text, start, end) {
  if (!text) return null
  const selStart = Math.min(start, end)
  const selEnd = Math.max(start, end)
  return findLinksInText(text).find(link => {
    if (selStart === selEnd) {
      return selStart >= link.start && selStart <= link.end
    }
    return selStart >= link.start && selEnd <= link.end
  }) || null
}

export function replaceLink(text, start, end, label, href) {
  return text.slice(0, start) + buildLinkMarkdown(label, href) + text.slice(end)
}

export function removeLink(text, start, end) {
  const link = findLinksInText(text).find(l => l.start === start && l.end === end)
  if (!link) return text
  return text.slice(0, start) + link.label + text.slice(end)
}

function collectFormatSpans(text, offset = 0, depth = 0, spans = []) {
  if (!text || depth > MAX_PARSE_DEPTH || text.length > MAX_PARSE_LENGTH) return spans

  let i = 0
  while (i < text.length) {
    const color = tryColorSpan(text, i)
    const link = !color && tryLink(text, i)
    const bold = !color && !link && tryDelimited(text, i, '**', '**', 'bold')
    const strike = !color && !link && !bold && tryDelimited(text, i, '~~', '~~', 'strike')
    const italic = !color && !bold && !strike && !link && text[i] === '*' && text[i + 1] !== '*'
      ? tryDelimited(text, i, '*', '*', 'italic')
      : null
    const code = !color && !link && !bold && !strike && !italic && text[i] === '`' && text[i + 1] !== '`'
      ? tryDelimited(text, i, '`', '`', 'code')
      : null

    const hit = color || link || bold || strike || italic || code
    if (!hit) {
      i += 1
      continue
    }

    if (hit.type === 'link') {
      spans.push({
        type: 'link',
        href: hit.href,
        markerStart: offset + i,
        markerEnd: offset + hit.end,
        innerStart: offset + hit.labelStart,
        innerEnd: offset + hit.labelEnd,
      })
      collectFormatSpans(
        text.slice(hit.labelStart, hit.labelEnd),
        offset + hit.labelStart,
        depth + 1,
        spans,
      )
    } else {
      spans.push({
        type: hit.type,
        color: hit.color?.toUpperCase(),
        markerStart: offset + i,
        markerEnd: offset + hit.end,
        innerStart: offset + hit.innerStart,
        innerEnd: offset + hit.innerEnd,
      })

      if (hit.type !== 'code') {
        collectFormatSpans(
          text.slice(hit.innerStart, hit.innerEnd),
          offset + hit.innerStart,
          depth + 1,
          spans,
        )
      }
    }
    i = hit.end
  }

  return spans
}

function selectionInSpan(start, end, span) {
  const inInner = start >= span.innerStart && end <= span.innerEnd
  const coversMarkers = start <= span.markerStart && end >= span.markerEnd
  return inInner || coversMarkers
}

export function getSelectionFormats(text, start, end) {
  const empty = { bold: false, italic: false, strike: false, code: false, color: null, link: null }
  if (!text) return empty

  const link = getLinkAtSelection(text, start, end)
  if (start === end) {
    if (link) return { ...empty, link }
    for (const span of collectFormatSpans(text)) {
      if (span.type === 'code' && start >= span.innerStart && start <= span.innerEnd) {
        return { ...empty, code: true }
      }
    }
    return empty
  }

  const { formats } = parseWrapped(text.slice(start, end))
  let bold = formats.some(f => f.type === 'bold')
  let italic = formats.some(f => f.type === 'italic')
  let strike = formats.some(f => f.type === 'strike')
  let code = formats.some(f => f.type === 'code')
  let color = formats.find(f => f.type === 'color')?.color?.toUpperCase() || null

  for (const span of collectFormatSpans(text)) {
    if (!selectionInSpan(start, end, span)) continue
    if (span.type === 'bold') bold = true
    else if (span.type === 'italic') italic = true
    else if (span.type === 'strike') strike = true
    else if (span.type === 'code') code = true
    else if (span.type === 'color') color = span.color
  }

  return { bold, italic, strike, code, color, link }
}

export function inlineMarkdownToHtml(text) {
  const parts = parseInlineMarkdown(text)
  return parts.map(renderPartToHtml).join('')
}

function renderPartToHtml(part) {
  const inner = part.children
    ? part.children.map(renderPartToHtml).join('')
    : (part.value || '')

  switch (part.type) {
    case 'bold': return `<strong>${inner}</strong>`
    case 'italic': return `<em>${inner}</em>`
    case 'strike': return `<s>${inner}</s>`
    case 'code': return `<code>${inner.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`
    case 'color': return `<span style="color:#${part.color}">${inner}</span>`
    case 'link': return `<a href="${part.href}">${inner}</a>`
    default: return inner.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

export function hasInlineFormatting(text) {
  return /\*\*|\*(?!\*)|~~|`[^`]+`|\[color:[A-Fa-f0-9]{6}\]|\[[^\]]+\]\([^)]+\)/.test(text || '')
}

function skipInlineMarkers(text, src) {
  while (src < text.length) {
    const rest = text.slice(src)
    const colorOpen = rest.match(/^\[color:([A-Fa-f0-9]{6})\]/)
    if (colorOpen) { src += colorOpen[0].length; continue }
    const linkM = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkM && !rest.startsWith('[color:')) { src += linkM[0].length; continue }
    if (rest.startsWith('[/color]')) { src += 8; continue }
    if (rest.startsWith('**')) { src += 2; continue }
    if (rest.startsWith('~~')) { src += 2; continue }
    if (rest.startsWith('`')) {
      const close = rest.indexOf('`', 1)
      if (close > 0) { src += close + 1; continue }
    }
    if (rest.startsWith('*') && rest[1] !== '*') { src += 1; continue }
    break
  }
  return src
}

export function renderedOffsetToSourceOffset(text, renderedOffset) {
  if (!text || renderedOffset <= 0) return 0

  let src = 0
  let rendered = 0

  while (src < text.length && rendered < renderedOffset) {
    const next = skipInlineMarkers(text, src)
    if (next === src) {
      rendered += 1
      src += 1
    } else {
      src = next
    }
  }

  return src
}

export function getPlainTextLength(text) {
  if (!text) return 0
  let src = 0
  let len = 0

  while (src < text.length) {
    const next = skipInlineMarkers(text, src)
    if (next === src) {
      len += 1
      src += 1
    } else {
      src = next
    }
  }

  return len
}

export function previewCaretToSourceOffset(text, renderedOffset) {
  if (!text) return 0
  const plainLen = getPlainTextLength(text)
  if (renderedOffset == null || renderedOffset <= 0) return text.length
  if (renderedOffset >= plainLen) return text.length
  return renderedOffsetToSourceOffset(text, renderedOffset)
}

export function getRenderedCaretOffset(container, clientX, clientY) {
  if (!container || typeof document === 'undefined') return null

  let range = null
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY)
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY)
    if (pos) {
      range = document.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.collapse(true)
    }
  }

  if (!range || !container.contains(range.startContainer)) return null

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let offset = 0
  let node = walker.nextNode()

  while (node) {
    if (node === range.startContainer) {
      return offset + range.startOffset
    }
    offset += node.textContent.length
    node = walker.nextNode()
  }

  return null
}
