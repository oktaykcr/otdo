export const NOTE_TYPE_MARKDOWN = 'markdown'
export const NOTE_TYPE_CANVAS = 'canvas'

export const CANVAS_COLORS = [
  { id: 'slate', bg: '#1E293B', border: '#64748B', text: '#F1F5F9' },
  { id: 'indigo', bg: '#312E81', border: '#818CF8', text: '#E0E7FF' },
  { id: 'sky', bg: '#0C4A6E', border: '#38BDF8', text: '#E0F2FE' },
  { id: 'teal', bg: '#134E4A', border: '#2DD4BF', text: '#CCFBF1' },
  { id: 'green', bg: '#14532D', border: '#4ADE80', text: '#DCFCE7' },
  { id: 'amber', bg: '#78350F', border: '#FBBF24', text: '#FEF3C7' },
  { id: 'orange', bg: '#7C2D12', border: '#FB923C', text: '#FFEDD5' },
  { id: 'rose', bg: '#881337', border: '#FB7185', text: '#FFE4E6' },
  { id: 'red', bg: '#7F1D1D', border: '#F87171', text: '#FEE2E2' },
  { id: 'violet', bg: '#4C1D95', border: '#A78BFA', text: '#EDE9FE' },
]

export const EDGE_COLORS = [
  { id: 'gray', stroke: '#94A3B8', label: 'Gray' },
  { id: 'indigo', stroke: '#818CF8', label: 'Indigo' },
  { id: 'sky', stroke: '#38BDF8', label: 'Sky' },
  { id: 'teal', stroke: '#2DD4BF', label: 'Teal' },
  { id: 'green', stroke: '#4ADE80', label: 'Green' },
  { id: 'amber', stroke: '#FBBF24', label: 'Amber' },
  { id: 'orange', stroke: '#FB923C', label: 'Orange' },
  { id: 'rose', stroke: '#FB7185', label: 'Rose' },
  { id: 'red', stroke: '#F87171', label: 'Red' },
  { id: 'violet', stroke: '#A78BFA', label: 'Violet' },
]

// legacy id → current id
const COLOR_ALIASES = {
  default: 'slate',
  accent: 'indigo',
  important: 'red',
  warning: 'amber',
  info: 'sky',
}

export const CANVAS_SHAPES = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'parallelogram', label: 'Parallelogram' },
]

export const EDGE_ARROWS = [
  { id: 'forward', label: 'One-way' },
  { id: 'both', label: 'Two-way' },
  { id: 'none', label: 'No arrow' },
]

export const FONT_SIZES = [
  { id: 'sm', label: 'S', px: 12, line: 15 },
  { id: 'md', label: 'M', px: 14, line: 18 },
  { id: 'lg', label: 'L', px: 18, line: 22 },
  { id: 'xl', label: 'XL', px: 22, line: 26 },
]

export const DEFAULT_NODE_W = 180
export const DEFAULT_NODE_H = 100
export const MIN_NODE_W = 120
export const MIN_NODE_H = 64
export const DEFAULT_EDGE_ARROW = 'forward'
export const DEFAULT_EDGE_COLOR = 'gray'
export const DEFAULT_FONT_SIZE = 'md'

export function isCanvasNote(note) {
  return note?.type === NOTE_TYPE_CANVAS
}

export function noteFileExtension(noteOrType) {
  const type = typeof noteOrType === 'string' ? noteOrType : noteOrType?.type
  return type === NOTE_TYPE_CANVAS ? '.canvas.json' : '.md'
}

export function noteFileName(note) {
  if (!note?.name) return null
  return `${note.name}${noteFileExtension(note)}`
}

export function parseDriveNoteFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return null
  if (/\.canvas\.json$/i.test(fileName)) {
    return {
      name: fileName.replace(/\.canvas\.json$/i, ''),
      type: NOTE_TYPE_CANVAS,
    }
  }
  if (/\.md$/i.test(fileName)) {
    return {
      name: fileName.replace(/\.md$/i, ''),
      type: NOTE_TYPE_MARKDOWN,
    }
  }
  return null
}

export function createEmptyCanvas(name = '') {
  return {
    version: 1,
    nodes: name
      ? [{
          id: crypto.randomUUID(),
          x: 120,
          y: 100,
          width: DEFAULT_NODE_W,
          height: DEFAULT_NODE_H,
          text: name,
          color: 'slate',
          shape: 'rounded',
          fontSize: DEFAULT_FONT_SIZE,
        }]
      : [],
    edges: [],
  }
}

export function serializeCanvas(canvas) {
  return JSON.stringify(canvas ?? createEmptyCanvas(), null, 2)
}

export function parseCanvas(raw) {
  if (!raw || !String(raw).trim()) return createEmptyCanvas()
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return createEmptyCanvas()
    return {
      version: 1,
      nodes: Array.isArray(data.nodes) ? data.nodes.map(normalizeNode).filter(Boolean) : [],
      edges: Array.isArray(data.edges) ? data.edges.map(normalizeEdge).filter(Boolean) : [],
    }
  } catch {
    return createEmptyCanvas()
  }
}

function resolveColorId(color) {
  const id = COLOR_ALIASES[color] || color
  return CANVAS_COLORS.some(c => c.id === id) ? id : 'slate'
}

function resolveShapeId(shape) {
  return CANVAS_SHAPES.some(s => s.id === shape) ? shape : 'rounded'
}

function resolveFontSize(fontSize) {
  return FONT_SIZES.some(s => s.id === fontSize) ? fontSize : DEFAULT_FONT_SIZE
}

function resolveEdgeArrow(arrow) {
  return EDGE_ARROWS.some(a => a.id === arrow) ? arrow : DEFAULT_EDGE_ARROW
}

function resolveEdgeColor(color) {
  return EDGE_COLORS.some(c => c.id === color) ? color : DEFAULT_EDGE_COLOR
}

function normalizeNode(node) {
  if (!node || typeof node !== 'object' || !node.id) return null
  return {
    id: String(node.id),
    x: Number.isFinite(node.x) ? node.x : 0,
    y: Number.isFinite(node.y) ? node.y : 0,
    width: Math.max(MIN_NODE_W, Number(node.width) || DEFAULT_NODE_W),
    height: Math.max(MIN_NODE_H, Number(node.height) || DEFAULT_NODE_H),
    text: typeof node.text === 'string' ? node.text : '',
    color: resolveColorId(node.color),
    shape: resolveShapeId(node.shape),
    fontSize: resolveFontSize(node.fontSize),
  }
}

function normalizeEdge(edge) {
  if (!edge || typeof edge !== 'object' || !edge.id || !edge.from || !edge.to) return null
  if (edge.from === edge.to) return null
  return {
    id: String(edge.id),
    from: String(edge.from),
    to: String(edge.to),
    arrow: resolveEdgeArrow(edge.arrow),
    color: resolveEdgeColor(edge.color),
  }
}

export function getCanvasColor(colorId) {
  return CANVAS_COLORS.find(c => c.id === resolveColorId(colorId)) || CANVAS_COLORS[0]
}

export function getEdgeColor(colorId) {
  return EDGE_COLORS.find(c => c.id === resolveEdgeColor(colorId)) || EDGE_COLORS[0]
}

export function getFontSize(fontSizeId) {
  return FONT_SIZES.find(s => s.id === resolveFontSize(fontSizeId)) || FONT_SIZES[1]
}

export function nextFontSize(fontSizeId, delta) {
  const idx = FONT_SIZES.findIndex(s => s.id === resolveFontSize(fontSizeId))
  const next = clampIndex(idx + delta, 0, FONT_SIZES.length - 1)
  return FONT_SIZES[next].id
}

function clampIndex(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export function defaultNoteContent(note) {
  if (isCanvasNote(note)) return serializeCanvas(createEmptyCanvas(note.name))
  return `# ${note?.name || 'Untitled'}\n\n`
}

export function getShapeStyle(shape) {
  switch (shape) {
    case 'rect':
      return { borderRadius: '4px', clipPath: 'none' }
    case 'ellipse':
      return { borderRadius: '50%', clipPath: 'none' }
    case 'diamond':
      return { borderRadius: '0', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }
    case 'parallelogram':
      return { borderRadius: '0', clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)' }
    case 'rounded':
    default:
      return { borderRadius: '12px', clipPath: 'none' }
  }
}
