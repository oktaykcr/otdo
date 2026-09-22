import {
  parseCanvas,
  getCanvasColor,
  getEdgeColor,
  getFontSize,
} from './noteCanvas'

function nodeCenter(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
}

function borderPoint(node, towardX, towardY, pad = 0) {
  const cx = node.x + node.width / 2
  const cy = node.y + node.height / 2
  const dx = towardX - cx
  const dy = towardY - cy
  const dist = Math.hypot(dx, dy)
  if (dist < 0.001) return { x: cx, y: cy }

  const hw = Math.max(1, node.width / 2 - pad)
  const hh = Math.max(1, node.height / 2 - pad)
  const shape = node.shape || 'rounded'
  let t

  if (shape === 'ellipse') {
    t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh))
  } else if (shape === 'diamond') {
    t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh)
  } else {
    const sx = Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity
    const sy = Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity
    t = Math.min(sx, sy)
  }

  return { x: cx + dx * t, y: cy + dy * t }
}

function arrowHead(tipX, tipY, fromX, fromY, size = 14) {
  const dx = tipX - fromX
  const dy = tipY - fromY
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  const px = -uy
  const py = ux
  const baseX = tipX - ux * size
  const baseY = tipY - uy * size
  const half = size * 0.55
  return [
    [tipX, tipY],
    [baseX + px * half, baseY + py * half],
    [baseX - px * half, baseY - py * half],
  ]
}

function shortenToward(fromX, fromY, toX, toY, amount) {
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.hypot(dx, dy) || 1
  const t = Math.max(0, 1 - amount / dist)
  return { x: fromX + dx * t, y: fromY + dy * t }
}

function escapeXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shapePath(node) {
  const { x, y, width: w, height: h } = node
  const shape = node.shape || 'rounded'
  if (shape === 'ellipse') {
    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" />`
  }
  if (shape === 'diamond') {
    return `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" />`
  }
  if (shape === 'parallelogram') {
    const s = w * 0.12
    return `<polygon points="${x + s},${y} ${x + w},${y} ${x + w - s},${y + h} ${x},${y + h}" />`
  }
  const r = shape === 'rect' ? 4 : 12
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" />`
}

function textLines(text, maxChars = 22) {
  const raw = String(text || '').trim()
  if (!raw) return []
  const lines = []
  for (const paragraph of raw.split('\n')) {
    if (!paragraph) {
      lines.push('')
      continue
    }
    let rest = paragraph
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf(' ', maxChars)
      if (cut < 8) cut = maxChars
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut).trimStart()
    }
    if (rest) lines.push(rest)
  }
  return lines.slice(0, 6)
}

export function buildCanvasExportSvg(rawContent, { padding = 48, bg = '#0F172A' } = {}) {
  const data = parseCanvas(rawContent)
  const nodes = data.nodes
  const edges = data.edges

  if (!nodes.length) {
    const w = 480
    const h = 320
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="50%" y="50%" text-anchor="middle" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="14">Empty canvas</text>
</svg>`,
      width: w,
      height: h,
    }
  }

  const minX = Math.min(...nodes.map(n => n.x)) - padding
  const minY = Math.min(...nodes.map(n => n.y)) - padding
  const maxX = Math.max(...nodes.map(n => n.x + n.width)) + padding
  const maxY = Math.max(...nodes.map(n => n.y + n.height)) + padding
  const width = Math.ceil(maxX - minX)
  const height = Math.ceil(maxY - minY)
  const nodesById = new Map(nodes.map(n => [n.id, n]))

  const edgeEls = edges.map(edge => {
    const from = nodesById.get(edge.from)
    const to = nodesById.get(edge.to)
    if (!from || !to) return ''
    const a = nodeCenter(from)
    const b = nodeCenter(to)
    const start = borderPoint(from, b.x, b.y, 1)
    const end = borderPoint(to, a.x, a.y, 2)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.hypot(dx, dy) || 1
    const mx = (start.x + end.x) / 2
    const my = (start.y + end.y) / 2
    const nx = -dy / dist
    const ny = dx / dist
    const curve = Math.min(36, dist * 0.18)
    const cx = mx + nx * curve
    const cy = my + ny * curve
    const arrow = edge.arrow || 'forward'
    const stroke = getEdgeColor(edge.color).stroke
    const arrowSize = 14
    const trim = arrowSize * 0.85
    const showEnd = arrow === 'forward' || arrow === 'both'
    const showStart = arrow === 'both'
    const lineStart = showStart ? shortenToward(cx, cy, start.x, start.y, trim) : start
    const lineEnd = showEnd ? shortenToward(cx, cy, end.x, end.y, trim) : end
    const endPts = showEnd
      ? arrowHead(end.x, end.y, cx, cy, arrowSize).map(p => p.join(',')).join(' ')
      : ''
    const startPts = showStart
      ? arrowHead(start.x, start.y, cx, cy, arrowSize).map(p => p.join(',')).join(' ')
      : ''
    return `
      <path d="M ${lineStart.x} ${lineStart.y} Q ${cx} ${cy} ${lineEnd.x} ${lineEnd.y}" fill="none" stroke="${stroke}" stroke-width="2.25" stroke-linecap="round"/>
      ${showStart ? `<polygon points="${startPts}" fill="${stroke}"/>` : ''}
      ${showEnd ? `<polygon points="${endPts}" fill="${stroke}"/>` : ''}
      ${arrow === 'none' ? `<circle cx="${start.x}" cy="${start.y}" r="3" fill="${stroke}"/><circle cx="${end.x}" cy="${end.y}" r="3" fill="${stroke}"/>` : ''}`
  }).join('')

  const nodeEls = nodes.map(node => {
    const color = getCanvasColor(node.color)
    const font = getFontSize(node.fontSize)
    const shape = shapePath(node)
    const chars = Math.max(10, Math.floor(node.width / (font.px * 0.55)))
    const lines = textLines(node.text, chars)
    const lineH = font.line
    const startY = node.y + node.height / 2 - ((lines.length - 1) * lineH) / 2
    const text = lines.map((line, i) =>
      `<text x="${node.x + node.width / 2}" y="${startY + i * lineH}" text-anchor="middle" dominant-baseline="middle" fill="${color.text}" font-family="Inter, system-ui, sans-serif" font-size="${font.px}">${escapeXml(line)}</text>`
    ).join('')
    return `
      <g>
        <g fill="${color.bg}" stroke="${color.border}" stroke-width="2">${shape}</g>
        ${text}
      </g>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bg}"/>
  ${edgeEls}
  ${nodeEls}
</svg>`

  return { svg, width, height }
}

export async function canvasSvgToBlob(svg, { type = 'image/png', quality = 0.95, scale = 2 } = {}) {
  const { width, height } = (() => {
    const m = svg.match(/width="(\d+)"[^>]*height="(\d+)"/)
    return { width: Number(m?.[1]) || 800, height: Number(m?.[2]) || 600 }
  })()

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Could not export image'))),
        type,
        quality,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
