import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Plus, Minus, Maximize2, MousePointer2, Square, Circle, Diamond,
  ArrowRight, ArrowLeftRight, Trash2,
  RectangleHorizontal, Hexagon, Palette, Type,
} from 'lucide-react'
import {
  parseCanvas,
  serializeCanvas,
  getCanvasColor,
  getEdgeColor,
  getFontSize,
  getShapeStyle,
  nextFontSize,
  CANVAS_COLORS,
  CANVAS_SHAPES,
  EDGE_COLORS,
  EDGE_ARROWS,
  DEFAULT_NODE_W,
  DEFAULT_NODE_H,
  MIN_NODE_W,
  MIN_NODE_H,
  DEFAULT_EDGE_ARROW,
  DEFAULT_EDGE_COLOR,
  DEFAULT_FONT_SIZE,
} from '../../lib/noteCanvas'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.5
const GRID = 24

const TOOLS = {
  select: 'select',
  box: 'box',
  connect: 'connect',
}

const SHAPE_ICONS = {
  rounded: Square,
  rect: RectangleHorizontal,
  ellipse: Circle,
  diamond: Diamond,
  parallelogram: Hexagon,
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function nodeCenter(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
}

function borderPoint(node, towardX, towardY, pad = 0) {
  const cx = node.x + node.width / 2
  const cy = node.y + node.height / 2
  let dx = towardX - cx
  let dy = towardY - cy
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
  } else if (shape === 'parallelogram') {
    const skew = node.width * 0.12
    const ux = dx / dist
    const uy = dy / dist
    let best = Infinity
    const corners = [
      { x: node.x + skew, y: node.y },
      { x: node.x + node.width, y: node.y },
      { x: node.x + node.width - skew, y: node.y + node.height },
      { x: node.x, y: node.y + node.height },
    ]
    for (let i = 0; i < 4; i++) {
      const a = corners[i]
      const b = corners[(i + 1) % 4]
      const hit = raySegmentHit(cx, cy, ux, uy, a.x, a.y, b.x, b.y)
      if (hit != null && hit < best) best = hit
    }
    t = Number.isFinite(best) ? best / dist : Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9))
  } else {
    const sx = Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity
    const sy = Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity
    t = Math.min(sx, sy)
  }

  return { x: cx + dx * t, y: cy + dy * t }
}

function raySegmentHit(ox, oy, ux, uy, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const det = ux * dy - uy * dx
  if (Math.abs(det) < 1e-8) return null
  const t = ((x1 - ox) * dy - (y1 - oy) * dx) / det
  const u = ((x1 - ox) * uy - (y1 - oy) * ux) / det
  if (t > 0.5 && u >= 0 && u <= 1) return t
  return null
}

function arrowHeadPolygon(tipX, tipY, fromX, fromY, size = 14) {
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
    `${tipX},${tipY}`,
    `${baseX + px * half},${baseY + py * half}`,
    `${baseX - px * half},${baseY - py * half}`,
  ].join(' ')
}

function shortenToward(fromX, fromY, toX, toY, amount) {
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.hypot(dx, dy) || 1
  const t = Math.max(0, 1 - amount / dist)
  return { x: fromX + dx * t, y: fromY + dy * t }
}

function edgeGeometry(from, to, { arrow = 'forward', arrowSize = 14 } = {}) {
  const a = nodeCenter(from)
  const b = nodeCenter(to)
  const startRaw = borderPoint(from, b.x, b.y, 1)
  const endRaw = borderPoint(to, a.x, a.y, 2)
  const dx = endRaw.x - startRaw.x
  const dy = endRaw.y - startRaw.y
  const dist = Math.hypot(dx, dy) || 1
  const mx = (startRaw.x + endRaw.x) / 2
  const my = (startRaw.y + endRaw.y) / 2
  const nx = -dy / dist
  const ny = dx / dist
  const curve = Math.min(36, dist * 0.18)
  const cx = mx + nx * curve
  const cy = my + ny * curve

  const showEnd = arrow === 'forward' || arrow === 'both'
  const showStart = arrow === 'both'
  const trim = arrowSize * 0.85

  const lineStart = showStart
    ? shortenToward(cx, cy, startRaw.x, startRaw.y, trim)
    : startRaw
  const lineEnd = showEnd
    ? shortenToward(cx, cy, endRaw.x, endRaw.y, trim)
    : endRaw

  return {
    x1: startRaw.x,
    y1: startRaw.y,
    x2: endRaw.x,
    y2: endRaw.y,
    cx,
    cy,
    path: `M ${lineStart.x} ${lineStart.y} Q ${cx} ${cy} ${lineEnd.x} ${lineEnd.y}`,
    endArrow: showEnd ? arrowHeadPolygon(endRaw.x, endRaw.y, cx, cy, arrowSize) : null,
    startArrow: showStart ? arrowHeadPolygon(startRaw.x, startRaw.y, cx, cy, arrowSize) : null,
  }
}

function hitTestNode(nodes, wx, wy) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
      return n
    }
  }
  return null
}

function pointNearQuad(x1, y1, cx, cy, x2, y2, px, py, threshold) {
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const u = 1 - t
    const x = u * u * x1 + 2 * u * t * cx + t * t * x2
    const y = u * u * y1 + 2 * u * t * cy + t * t * y2
    if (Math.hypot(px - x, py - y) <= threshold) return true
  }
  return false
}

function hitTestEdge(edges, nodesById, wx, wy, threshold = 8) {
  for (const edge of edges) {
    const from = nodesById.get(edge.from)
    const to = nodesById.get(edge.to)
    if (!from || !to) continue
    const g = edgeGeometry(from, to, { arrow: edge.arrow || 'forward' })
    if (pointNearQuad(g.x1, g.y1, g.cx, g.cy, g.x2, g.y2, wx, wy, threshold)) return edge
  }
  return null
}

function snap(v) {
  return Math.round(v / GRID) * GRID
}

export default function CanvasEditor({ content, onChange }) {
  const [canvas, setCanvas] = useState(() => parseCanvas(content))
  const [tool, setTool] = useState(TOOLS.select)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [connectFrom, setConnectFrom] = useState(null)
  const [cursorWorld, setCursorWorld] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [defaultShape, setDefaultShape] = useState('rounded')
  const [defaultColor, setDefaultColor] = useState('slate')
  const [defaultFontSize, setDefaultFontSize] = useState(DEFAULT_FONT_SIZE)
  const [defaultEdgeArrow, setDefaultEdgeArrow] = useState(DEFAULT_EDGE_ARROW)
  const [defaultEdgeColor, setDefaultEdgeColor] = useState(DEFAULT_EDGE_COLOR)
  const [colorOpen, setColorOpen] = useState(false)
  const [edgeColorOpen, setEdgeColorOpen] = useState(false)

  const viewportRef = useRef(null)
  const colorBtnRef = useRef(null)
  const edgeColorBtnRef = useRef(null)
  const dragRef = useRef(null)
  const canvasRef = useRef(canvas)
  const contentRef = useRef(content)
  const onChangeRef = useRef(onChange)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { canvasRef.current = canvas }, [canvas])

  useEffect(() => {
    if (content === contentRef.current) return
    contentRef.current = content
    const next = parseCanvas(content)
    canvasRef.current = next
    setCanvas(next)
  }, [content])

  const commit = useCallback((next) => {
    canvasRef.current = next
    setCanvas(next)
    const raw = serializeCanvas(next)
    contentRef.current = raw
    onChangeRef.current?.(raw)
  }, [])

  const patchCanvas = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(canvasRef.current) : updater
    commit(next)
  }, [commit])

  const nodesById = useMemo(
    () => new Map(canvas.nodes.map(n => [n.id, n])),
    [canvas.nodes]
  )

  const selectedNode = selectedId ? nodesById.get(selectedId) : null
  const selectedEdge = selectedEdgeId
    ? canvas.edges.find(e => e.id === selectedEdgeId)
    : null

  const screenToWorld = useCallback((clientX, clientY) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    }
  }, [pan, zoom])

  const updateNode = useCallback((id, patch) => {
    if (patch.shape) setDefaultShape(patch.shape)
    if (patch.color) setDefaultColor(patch.color)
    if (patch.fontSize) setDefaultFontSize(patch.fontSize)
    patchCanvas(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => (n.id === id ? { ...n, ...patch } : n)),
    }))
  }, [patchCanvas])

  const updateEdge = useCallback((id, patch) => {
    if (patch.arrow) setDefaultEdgeArrow(patch.arrow)
    if (patch.color) setDefaultEdgeColor(patch.color)
    patchCanvas(prev => ({
      ...prev,
      edges: prev.edges.map(e => (e.id === id ? { ...e, ...patch } : e)),
    }))
  }, [patchCanvas])

  const addNodeAt = useCallback((wx, wy) => {
    const node = {
      id: crypto.randomUUID(),
      x: snap(wx - DEFAULT_NODE_W / 2),
      y: snap(wy - DEFAULT_NODE_H / 2),
      width: DEFAULT_NODE_W,
      height: DEFAULT_NODE_H,
      text: '',
      color: defaultColor,
      shape: defaultShape,
      fontSize: defaultFontSize,
    }
    patchCanvas(prev => ({ ...prev, nodes: [...prev.nodes, node] }))
    setSelectedId(node.id)
    setSelectedEdgeId(null)
    setEditingId(node.id)
    setTool(TOOLS.select)
  }, [patchCanvas, defaultColor, defaultShape, defaultFontSize])

  const deleteSelected = useCallback(() => {
    if (selectedEdgeId) {
      patchCanvas(prev => ({
        ...prev,
        edges: prev.edges.filter(e => e.id !== selectedEdgeId),
      }))
      setSelectedEdgeId(null)
      return
    }
    if (!selectedId) return
    patchCanvas(prev => ({
      nodes: prev.nodes.filter(n => n.id !== selectedId),
      edges: prev.edges.filter(e => e.from !== selectedId && e.to !== selectedId),
    }))
    setSelectedId(null)
    setEditingId(null)
  }, [patchCanvas, selectedId, selectedEdgeId])

  const reverseSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return
    patchCanvas(prev => ({
      ...prev,
      edges: prev.edges.map(e =>
        e.id === selectedEdgeId ? { ...e, from: e.to, to: e.from } : e
      ),
    }))
  }, [patchCanvas, selectedEdgeId])

  const fitView = useCallback(() => {
    const el = viewportRef.current
    const nodes = canvasRef.current.nodes
    if (!el || nodes.length === 0) {
      setZoom(1)
      setPan({ x: 40, y: 40 })
      return
    }
    const pad = 64
    const minX = Math.min(...nodes.map(n => n.x))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxX = Math.max(...nodes.map(n => n.x + n.width))
    const maxY = Math.max(...nodes.map(n => n.y + n.height))
    const w = maxX - minX || 1
    const h = maxY - minY || 1
    const nextZoom = clamp(
      Math.min((el.clientWidth - pad * 2) / w, (el.clientHeight - pad * 2) / h),
      MIN_ZOOM,
      MAX_ZOOM,
    )
    setZoom(nextZoom)
    setPan({
      x: (el.clientWidth - w * nextZoom) / 2 - minX * nextZoom,
      y: (el.clientHeight - h * nextZoom) / 2 - minY * nextZoom,
    })
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (editingId) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId || selectedEdgeId) {
          e.preventDefault()
          deleteSelected()
        }
        return
      }
      if (e.key === 'r' && selectedEdgeId) {
        e.preventDefault()
        reverseSelectedEdge()
        return
      }
      if (e.key === 'v' || e.key === 'Escape') {
        setTool(TOOLS.select)
        setConnectFrom(null)
        if (e.key === 'Escape') {
          setSelectedId(null)
          setSelectedEdgeId(null)
        }
      }
      if (e.key === 'b') setTool(TOOLS.box)
      if (e.key === 'c') setTool(TOOLS.connect)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [deleteSelected, editingId, selectedId, selectedEdgeId, reverseSelectedEdge])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08
    const nextZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM)
    const ax = e.clientX - rect.left
    const ay = e.clientY - rect.top
    const wx = (ax - pan.x) / zoom
    const wy = (ay - pan.y) / zoom
    setZoom(nextZoom)
    setPan({ x: ax - wx * nextZoom, y: ay - wy * nextZoom })
  }, [zoom, pan])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onPointerDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      dragRef.current = {
        kind: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0) return

    const world = screenToWorld(e.clientX, e.clientY)
    setCursorWorld(world)
    const current = canvasRef.current

    if (tool === TOOLS.box) {
      addNodeAt(world.x, world.y)
      return
    }

    const node = hitTestNode(current.nodes, world.x, world.y)

    if (tool === TOOLS.connect) {
      if (!node) {
        setConnectFrom(null)
        return
      }
      if (!connectFrom) {
        setConnectFrom(node.id)
        setSelectedId(node.id)
        setSelectedEdgeId(null)
        return
      }
      if (connectFrom === node.id) {
        setConnectFrom(null)
        return
      }
      const exists = current.edges.some(
        ed => ed.from === connectFrom && ed.to === node.id
      )
      if (!exists) {
        patchCanvas(prev => ({
          ...prev,
          edges: [
            ...prev.edges,
            {
              id: crypto.randomUUID(),
              from: connectFrom,
              to: node.id,
              arrow: defaultEdgeArrow,
              color: defaultEdgeColor,
            },
          ],
        }))
      }
      setConnectFrom(null)
      setSelectedId(node.id)
      setSelectedEdgeId(null)
      setTool(TOOLS.select)
      return
    }

    if (node) {
      setSelectedId(node.id)
      setSelectedEdgeId(null)
      dragRef.current = {
        kind: 'node',
        id: node.id,
        offsetX: world.x - node.x,
        offsetY: world.y - node.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    const map = new Map(current.nodes.map(n => [n.id, n]))
    const edge = hitTestEdge(current.edges, map, world.x, world.y, 10 / zoom)
    if (edge) {
      setSelectedEdgeId(edge.id)
      setSelectedId(null)
      return
    }

    setSelectedId(null)
    setSelectedEdgeId(null)
    setConnectFrom(null)
    dragRef.current = {
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    const world = screenToWorld(e.clientX, e.clientY)
    setCursorWorld(world)

    const drag = dragRef.current
    if (!drag) return

    if (drag.kind === 'pan') {
      setPan({
        x: drag.panX + (e.clientX - drag.startX),
        y: drag.panY + (e.clientY - drag.startY),
      })
      return
    }

    if (drag.kind === 'node') {
      const x = snap(world.x - drag.offsetX)
      const y = snap(world.y - drag.offsetY)
      const next = {
        ...canvasRef.current,
        nodes: canvasRef.current.nodes.map(n =>
          n.id === drag.id ? { ...n, x, y } : n
        ),
      }
      canvasRef.current = next
      setCanvas(next)
    }

    if (drag.kind === 'resize') {
      const dw = (e.clientX - drag.startX) / zoom
      const dh = (e.clientY - drag.startY) / zoom
      const next = {
        ...canvasRef.current,
        nodes: canvasRef.current.nodes.map(n =>
          n.id === drag.id
            ? {
                ...n,
                width: Math.max(MIN_NODE_W, drag.startW + dw),
                height: Math.max(MIN_NODE_H, drag.startH + dh),
              }
            : n
        ),
      }
      canvasRef.current = next
      setCanvas(next)
    }
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.kind === 'node' || drag?.kind === 'resize') {
      commit(canvasRef.current)
    }
  }

  const onDoubleClick = (e) => {
    const world = screenToWorld(e.clientX, e.clientY)
    const node = hitTestNode(canvasRef.current.nodes, world.x, world.y)
    if (node) {
      setSelectedId(node.id)
      setEditingId(node.id)
      return
    }
    if (tool === TOOLS.select) addNodeAt(world.x, world.y)
  }

  const finishEditing = useCallback(() => {
    setEditingId(null)
    commit(canvasRef.current)
  }, [commit])

  const connectPreview = connectFrom && cursorWorld
    ? (() => {
        const from = nodesById.get(connectFrom)
        if (!from) return null
        const start = borderPoint(from, cursorWorld.x, cursorWorld.y, 1)
        return { x1: start.x, y1: start.y, x2: cursorWorld.x, y2: cursorWorld.y }
      })()
    : null

  const activeShape = selectedNode?.shape || defaultShape
  const activeColor = selectedNode?.color || defaultColor
  const activeColorMeta = getCanvasColor(activeColor)
  const activeFontSize = selectedNode?.fontSize || defaultFontSize
  const activeEdgeArrow = selectedEdge?.arrow || defaultEdgeArrow
  const activeEdgeColor = selectedEdge?.color || defaultEdgeColor
  const activeEdgeColorMeta = getEdgeColor(activeEdgeColor)

  useEffect(() => {
    if (!colorOpen && !edgeColorOpen) return
    const onDown = (e) => {
      if (colorBtnRef.current?.contains(e.target)) return
      if (edgeColorBtnRef.current?.contains(e.target)) return
      if (e.target.closest?.('[data-canvas-color-panel]')) return
      setColorOpen(false)
      setEdgeColorOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setColorOpen(false)
        setEdgeColorOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [colorOpen, edgeColorOpen])

  const pickNodeColor = (colorId) => {
    if (selectedNode) updateNode(selectedNode.id, { color: colorId })
    else setDefaultColor(colorId)
    setColorOpen(false)
  }

  const pickEdgeColor = (colorId) => {
    if (selectedEdge) updateEdge(selectedEdge.id, { color: colorId })
    else setDefaultEdgeColor(colorId)
    setEdgeColorOpen(false)
  }

  const changeFontSize = (delta) => {
    const next = nextFontSize(activeFontSize, delta)
    if (selectedNode) updateNode(selectedNode.id, { fontSize: next })
    else setDefaultFontSize(next)
  }

  const changeEdgeArrow = (arrow) => {
    if (selectedEdge) updateEdge(selectedEdge.id, { arrow })
    else setDefaultEdgeArrow(arrow)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-primary relative">
      <div className="flex-none flex items-center gap-1 px-3 py-2 border-b border-border bg-surface/60 flex-wrap">
        <ToolButton
          active={tool === TOOLS.select}
          onClick={() => { setTool(TOOLS.select); setConnectFrom(null) }}
          title="Select (V)"
          icon={MousePointer2}
        />
        <ToolButton
          active={tool === TOOLS.box}
          onClick={() => { setTool(TOOLS.box); setConnectFrom(null) }}
          title="Add shape (B)"
          icon={Square}
        />
        <ToolButton
          active={tool === TOOLS.connect}
          onClick={() => setTool(TOOLS.connect)}
          title="Connect A → B (C)"
          icon={ArrowRight}
        />

        <div className="w-px h-5 bg-border mx-1" />

        <div className="flex items-center gap-0.5">
          {CANVAS_SHAPES.map(s => {
            const Icon = SHAPE_ICONS[s.id] || Square
            const selected = activeShape === s.id
            return (
              <button
                key={s.id}
                type="button"
                title={s.label}
                onClick={() => {
                  if (selectedNode) updateNode(selectedNode.id, { shape: s.id })
                  else setDefaultShape(s.id)
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  selected
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-faint hover:bg-surface2 hover:text-text'
                }`}
              >
                <Icon size={14} strokeWidth={1.75} />
              </button>
            )
          })}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="relative" ref={colorBtnRef}>
          <button
            type="button"
            title="Shape color"
            onClick={() => { setColorOpen(o => !o); setEdgeColorOpen(false) }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
              colorOpen
                ? 'bg-accent/20 text-accent'
                : 'text-text-faint hover:bg-surface2 hover:text-text'
            }`}
          >
            <span
              className="w-3.5 h-3.5 rounded border border-border"
              style={{ backgroundColor: activeColorMeta.bg }}
            />
            <Palette size={14} strokeWidth={1.75} />
          </button>

          {colorOpen && (
            <div
              data-canvas-color-panel
              className="absolute left-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-border bg-surface shadow-lg p-2.5"
            >
              <p className="text-label text-text-faint mb-2 px-0.5">Shape color</p>
              <div className="grid grid-cols-5 gap-1.5">
                {CANVAS_COLORS.map(c => {
                  const selected = activeColor === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.id}
                      onClick={() => pickNodeColor(c.id)}
                      className={`aspect-square rounded-lg border transition-all ${
                        selected
                          ? 'ring-2 ring-accent border-accent scale-105'
                          : 'border-border hover:scale-105 hover:border-text-faint'
                      }`}
                      style={{ backgroundColor: c.bg }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 ml-0.5">
          <ToolButton
            onClick={() => changeFontSize(-1)}
            title="Smaller text"
            icon={Minus}
            disabled={activeFontSize === 'sm'}
          />
          <span className="flex items-center gap-1 px-1.5 text-label text-text-faint tabular-nums min-w-[2.5rem] justify-center" title="Text size">
            <Type size={12} />
            {activeFontSize.toUpperCase()}
          </span>
          <ToolButton
            onClick={() => changeFontSize(1)}
            title="Larger text"
            icon={Plus}
            disabled={activeFontSize === 'xl'}
          />
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="flex items-center gap-0.5">
          {EDGE_ARROWS.map(a => {
            const Icon = a.id === 'forward' ? ArrowRight : a.id === 'both' ? ArrowLeftRight : Minus
            const selected = activeEdgeArrow === a.id
            return (
              <button
                key={a.id}
                type="button"
                title={a.label}
                onClick={() => changeEdgeArrow(a.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  selected
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-faint hover:bg-surface2 hover:text-text'
                }`}
              >
                <Icon size={14} strokeWidth={1.75} />
              </button>
            )
          })}
        </div>

        <div className="relative" ref={edgeColorBtnRef}>
          <button
            type="button"
            title="Connection color"
            onClick={() => { setEdgeColorOpen(o => !o); setColorOpen(false) }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
              edgeColorOpen
                ? 'bg-accent/20 text-accent'
                : 'text-text-faint hover:bg-surface2 hover:text-text'
            }`}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-border"
              style={{ backgroundColor: activeEdgeColorMeta.stroke }}
            />
          </button>

          {edgeColorOpen && (
            <div
              data-canvas-color-panel
              className="absolute left-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-border bg-surface shadow-lg p-2.5"
            >
              <p className="text-label text-text-faint mb-2 px-0.5">Connection color</p>
              <div className="grid grid-cols-5 gap-1.5">
                {EDGE_COLORS.map(c => {
                  const selected = activeEdgeColor === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => pickEdgeColor(c.id)}
                      className={`aspect-square rounded-lg border transition-all ${
                        selected
                          ? 'ring-2 ring-accent border-accent scale-105'
                          : 'border-border hover:scale-105 hover:border-text-faint'
                      }`}
                      style={{ backgroundColor: c.stroke }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {selectedEdgeId && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              type="button"
              title="Reverse direction (R)"
              onClick={reverseSelectedEdge}
              className="px-2 py-1 rounded-lg text-label text-text-faint hover:bg-surface2 hover:text-text transition-colors"
            >
              Reverse
            </button>
          </>
        )}

        <div className="flex-1" />

        <ToolButton onClick={() => setZoom(z => clamp(z / 1.15, MIN_ZOOM, MAX_ZOOM))} title="Zoom out" icon={Minus} />
        <span className="text-label text-text-faint tabular-nums w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton onClick={() => setZoom(z => clamp(z * 1.15, MIN_ZOOM, MAX_ZOOM))} title="Zoom in" icon={Plus} />
        <ToolButton onClick={fitView} title="Fit view" icon={Maximize2} />

        <div className="w-px h-5 bg-border mx-1" />

        <ToolButton
          onClick={deleteSelected}
          title="Delete"
          icon={Trash2}
          disabled={!selectedId && !selectedEdgeId}
          danger
        />
      </div>

      <div
        ref={viewportRef}
        className="flex-1 min-h-0 relative overflow-hidden select-none"
        style={{
          cursor: tool === TOOLS.box
            ? 'crosshair'
            : tool === TOOLS.connect
              ? 'cell'
              : 'default',
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: `${GRID * zoom}px ${GRID * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={e => e.preventDefault()}
      >
        {canvas.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-1 opacity-50">
              <p className="text-body-sm text-text-muted">Empty canvas</p>
              <p className="text-label text-text-faint">
                Pick a shape & color, then double-click to add
              </p>
            </div>
          </div>
        )}

        {tool === TOOLS.connect && connectFrom && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="text-label px-2.5 py-1 rounded-lg bg-accent/20 text-accent border border-accent/30">
              Click target shape →
            </span>
          </div>
        )}

        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {canvas.edges.map(edge => {
              const from = nodesById.get(edge.from)
              const to = nodesById.get(edge.to)
              if (!from || !to) return null
              const arrowSize = Math.max(12, 16 / zoom)
              const arrow = edge.arrow || 'forward'
              const g = edgeGeometry(from, to, { arrow, arrowSize })
              const active = edge.id === selectedEdgeId
              const base = getEdgeColor(edge.color).stroke
              const stroke = active ? '#6366F1' : base
              return (
                <g key={edge.id}>
                  <path
                    d={g.path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={active ? 2.75 / zoom : 2.25 / zoom}
                    strokeLinecap="round"
                  />
                  {g.startArrow && (
                    <polygon
                      points={g.startArrow}
                      fill={stroke}
                      stroke={stroke}
                      strokeWidth={1 / zoom}
                      strokeLinejoin="round"
                    />
                  )}
                  {g.endArrow && (
                    <polygon
                      points={g.endArrow}
                      fill={stroke}
                      stroke={stroke}
                      strokeWidth={1 / zoom}
                      strokeLinejoin="round"
                    />
                  )}
                  {arrow === 'none' && (
                    <>
                      <circle cx={g.x1} cy={g.y1} r={Math.max(2.5, 3 / zoom)} fill={stroke} />
                      <circle cx={g.x2} cy={g.y2} r={Math.max(2.5, 3 / zoom)} fill={stroke} />
                    </>
                  )}
                </g>
              )
            })}
            {connectPreview && (() => {
              const tip = { x: connectPreview.x2, y: connectPreview.y2 }
              const from = { x: connectPreview.x1, y: connectPreview.y1 }
              const size = Math.max(12, 16 / zoom)
              const showEnd = defaultEdgeArrow === 'forward' || defaultEdgeArrow === 'both'
              const shortened = showEnd
                ? shortenToward(from.x, from.y, tip.x, tip.y, size * 0.85)
                : tip
              const previewColor = getEdgeColor(defaultEdgeColor).stroke
              return (
                <g>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={shortened.x}
                    y2={shortened.y}
                    stroke={previewColor}
                    strokeWidth={2.25 / zoom}
                    strokeDasharray={`${7 / zoom} ${5 / zoom}`}
                    strokeLinecap="round"
                  />
                  {showEnd && (
                    <polygon
                      points={arrowHeadPolygon(tip.x, tip.y, from.x, from.y, size)}
                      fill={previewColor}
                    />
                  )}
                </g>
              )
            })()}
          </g>
        </svg>

        <div
          className="absolute origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {canvas.nodes.map(node => {
            const color = getCanvasColor(node.color)
            const font = getFontSize(node.fontSize)
            const shapeStyle = getShapeStyle(node.shape)
            const selected = node.id === selectedId || node.id === connectFrom
            const editing = node.id === editingId
            const isDiamond = node.shape === 'diamond'
            const isPara = node.shape === 'parallelogram'
            const usesClip = shapeStyle.clipPath && shapeStyle.clipPath !== 'none'
            const textPad = isDiamond || isPara ? '22% 18%' : '10px'
            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
                onDoubleClick={e => {
                  e.stopPropagation()
                  setEditingId(node.id)
                  setSelectedId(node.id)
                }}
              >
                {selected && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: usesClip ? 0 : shapeStyle.borderRadius,
                      boxShadow: '0 0 0 2px #6366F1',
                      clipPath: shapeStyle.clipPath,
                    }}
                  />
                )}
                <div
                  className="absolute inset-0 border shadow-sm overflow-hidden"
                  style={{
                    backgroundColor: color.bg,
                    borderColor: selected ? '#6366F1' : color.border,
                    borderWidth: usesClip ? 0 : 1,
                    color: color.text,
                    borderRadius: shapeStyle.borderRadius,
                    clipPath: shapeStyle.clipPath,
                    boxShadow: usesClip
                      ? `inset 0 0 0 2px ${selected ? '#6366F1' : color.border}`
                      : undefined,
                  }}
                >
                  {editing ? (
                    <textarea
                      autoFocus
                      className="w-full h-full resize-none bg-transparent leading-snug outline-none text-center"
                      style={{
                        color: color.text,
                        padding: textPad,
                        fontSize: font.px,
                        lineHeight: `${font.line}px`,
                      }}
                      value={node.text}
                      onChange={e => {
                        const text = e.target.value
                        const next = {
                          ...canvasRef.current,
                          nodes: canvasRef.current.nodes.map(n =>
                            n.id === node.id ? { ...n, text } : n
                          ),
                        }
                        canvasRef.current = next
                        setCanvas(next)
                      }}
                      onBlur={finishEditing}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          e.stopPropagation()
                          finishEditing()
                        }
                        e.stopPropagation()
                      }}
                      onPointerDown={e => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="w-full h-full leading-snug whitespace-pre-wrap break-words overflow-hidden flex items-center justify-center text-center"
                      style={{
                        padding: textPad,
                        fontSize: font.px,
                        lineHeight: `${font.line}px`,
                      }}
                    >
                      {node.text || (
                        <span className="opacity-40" style={{ fontSize: 12 }}>Double-click to edit</span>
                      )}
                    </div>
                  )}
                </div>

                {selected && !editing && (
                  <div
                    className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-se-resize z-10"
                    onPointerDown={e => {
                      e.stopPropagation()
                      e.preventDefault()
                      dragRef.current = {
                        kind: 'resize',
                        id: node.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        startW: node.width,
                        startH: node.height,
                      }
                      viewportRef.current?.setPointerCapture(e.pointerId)
                    }}
                  >
                    <div className="absolute right-1 bottom-1 w-2 h-2 border-r-2 border-b-2 border-accent/70 rounded-sm" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ToolButton({ active, onClick, title, icon: Icon, disabled, danger }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        active
          ? 'bg-accent/20 text-accent'
          : danger
            ? 'text-text-faint hover:text-tag-important hover:bg-tag-important/10'
            : 'text-text-faint hover:bg-surface2 hover:text-text'
      }`}
    >
      <Icon size={15} strokeWidth={1.75} />
    </button>
  )
}
