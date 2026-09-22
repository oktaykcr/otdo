import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Loader, Minus, Plus, Maximize2 } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import { buildNoteGraph, layoutNoteGraph, getGraphNodeRadius } from '../../lib/noteGraph'

const LAYOUT_W = 1400
const LAYOUT_H = 1000
const MIN_ZOOM = 0.12
const MAX_ZOOM = 3.5
const LABEL_MIN_ZOOM = 0.35

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function edgePath(x1, y1, x2, y2, r) {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  const sx = x1 + ux * r
  const sy = y1 + uy * r
  const tx = x2 - ux * (r + 5)
  const ty = y2 - uy * (r + 5)
  return `M ${sx} ${sy} L ${tx} ${ty}`
}

function truncateLabel(name, max = 32) {
  if (!name) return ''
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

function computeFitTransform(layout, viewportW, viewportH, padding = 48) {
  if (!layout.length || viewportW <= 0 || viewportH <= 0) {
    return { zoom: 1, pan: { x: 0, y: 0 } }
  }

  const xs = layout.map(n => n.x)
  const ys = layout.map(n => n.y)
  const minX = Math.min(...xs) - padding
  const maxX = Math.max(...xs) + padding
  const minY = Math.min(...ys) - padding
  const maxY = Math.max(...ys) + padding + 20
  const graphW = maxX - minX
  const graphH = maxY - minY

  const zoom = clamp(
    Math.min((viewportW - padding) / graphW, (viewportH - padding) / graphH),
    MIN_ZOOM,
    MAX_ZOOM,
  )

  return {
    zoom,
    pan: {
      x: (viewportW - graphW * zoom) / 2 - minX * zoom,
      y: (viewportH - graphH * zoom) / 2 - minY * zoom,
    },
  }
}

function computeGraphCenter(layout) {
  if (!layout.length) return { x: LAYOUT_W / 2, y: LAYOUT_H / 2 }
  const cx = layout.reduce((s, n) => s + n.x, 0) / layout.length
  const cy = layout.reduce((s, n) => s + n.y, 0) / layout.length
  return { x: cx, y: cy }
}

function zoomAroundPoint(zoom, pan, anchorX, anchorY, factor) {
  const nextZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const wx = (anchorX - pan.x) / zoom
  const wy = (anchorY - pan.y) / zoom
  return {
    zoom: nextZoom,
    pan: {
      x: anchorX - wx * nextZoom,
      y: anchorY - wy * nextZoom,
    },
  }
}

function labelOpacity(zoom) {
  if (zoom < LABEL_MIN_ZOOM) return 0
  return clamp((zoom - LABEL_MIN_ZOOM) / 0.45, 0, 1)
}

export default function NoteGraphCanvas({ onNodeClick, className = '' }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const dragRef = useRef(null)

  const [size, setSize] = useState({ width: 800, height: 600 })
  const [loading, setLoading] = useState(false)
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [hoverId, setHoverId] = useState(null)
  const [transform, setTransform] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const { zoom, pan } = transform

  const notes = useNoteStore(s => s.notes)
  const activeNoteId = useNoteStore(s => s.activeNoteId)
  const activeContent = useNoteStore(s => s.activeContent)

  const loadSeq = useRef(0)
  const layoutKey = useRef('')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const loadGraph = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoading(true)
    try {
      const data = await buildNoteGraph(notes, activeNoteId, activeContent)
      if (seq !== loadSeq.current) return
      setGraph(data)
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [notes, activeNoteId, activeContent])

  useEffect(() => {
    const timer = setTimeout(() => loadGraph(), 350)
    return () => clearTimeout(timer)
  }, [loadGraph])

  const layout = useMemo(
    () => layoutNoteGraph(graph.nodes, graph.edges, LAYOUT_W, LAYOUT_H),
    [graph.nodes, graph.edges],
  )

  useEffect(() => {
    if (!layout.length) return
    const key = `${layout.length}-${graph.edges.length}`
    if (layoutKey.current === key && layoutKey.current !== '') return
    layoutKey.current = key
    const fit = computeFitTransform(layout, size.width, size.height)
    setTransform({ zoom: fit.zoom, pan: fit.pan })
  }, [layout, graph.edges.length, size.width, size.height])

  const layoutMap = useMemo(
    () => new Map(layout.map(n => [n.id, n])),
    [layout],
  )

  const nodeRadius = getGraphNodeRadius(layout.length)
  const labelsVisible = labelOpacity(zoom)

  const connectedIds = useMemo(() => {
    if (!hoverId) return null
    const set = new Set([hoverId])
    for (const e of graph.edges) {
      if (e.source === hoverId) set.add(e.target)
      if (e.target === hoverId) set.add(e.source)
    }
    return set
  }, [hoverId, graph.edges])

  const hoveredNode = hoverId ? layoutMap.get(hoverId) : null

  const graphCenter = useMemo(() => computeGraphCenter(layout), [layout])

  const applyZoomAtGraphCenter = useCallback((factor) => {
    setTransform(prev => {
      const anchorX = graphCenter.x * prev.zoom + prev.pan.x
      const anchorY = graphCenter.y * prev.zoom + prev.pan.y
      return zoomAroundPoint(prev.zoom, prev.pan, anchorX, anchorY, factor)
    })
  }, [graphCenter])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    applyZoomAtGraphCenter(factor)
  }, [applyZoomAtGraphCenter])

  useEffect(() => {
    const el = svgRef.current
    if (!el || layout.length === 0) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel, layout.length])

  const handleFit = useCallback(() => {
    const fit = computeFitTransform(layout, size.width, size.height)
    setTransform({ zoom: fit.zoom, pan: fit.pan })
  }, [layout, size.width, size.height])

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.closest('[data-graph-node]')) return
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pan.x, pan.y])

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setTransform(prev => ({
      ...prev,
      pan: { x: drag.panX + dx, y: drag.panY + dy },
    }))
  }, [])

  const handlePointerUp = useCallback((e) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  const handleNodeClick = useCallback((id) => {
    if (dragRef.current?.moved) return
    onNodeClick?.(id)
  }, [onNodeClick])

  const zoomIn = () => applyZoomAtGraphCenter(1.2)
  const zoomOut = () => applyZoomAtGraphCenter(1 / 1.2)

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      {loading && layout.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-text-faint">
          <Loader size={18} className="animate-spin" />
          <span className="text-body-sm">Loading graph…</span>
        </div>
      ) : layout.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-text-faint text-body-sm">
          No notes yet
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            width={size.width}
            height={size.height}
            className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
            role="img"
            aria-label="Note link graph"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <rect width="100%" height="100%" fill="transparent" />

            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              <defs>
                <marker
                  id="graph-page-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366F1" fillOpacity="0.6" />
                </marker>
              </defs>

              {graph.edges.map(edge => {
                const s = layoutMap.get(edge.source)
                const t = layoutMap.get(edge.target)
                if (!s || !t) return null
                const dimmed = connectedIds && !connectedIds.has(edge.source) && !connectedIds.has(edge.target)
                return (
                  <path
                    key={`${edge.source}-${edge.target}`}
                    d={edgePath(s.x, s.y, t.x, t.y, nodeRadius)}
                    fill="none"
                    stroke="#6366F1"
                    strokeOpacity={dimmed ? 0.1 : hoverId ? 0.8 : 0.45}
                    strokeWidth={(hoverId && !dimmed ? 2 : 1.5) / zoom}
                    markerEnd="url(#graph-page-arrow)"
                  />
                )
              })}

              {layout.map(node => {
                const isActive = node.id === activeNoteId
                const isHover = node.id === hoverId
                const dimmed = connectedIds && !connectedIds.has(node.id)
                const fill = node.cloudSync ? '#3B82F6' : '#6366F1'
                const showLabel = labelsVisible > 0 || isHover || isActive
                const textOpacity = isHover || isActive ? 1 : labelsVisible

                return (
                  <g
                    key={node.id}
                    data-graph-node
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverId(node.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => handleNodeClick(node.id)}
                  >
                    {isActive && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeRadius + 6}
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth={2.5 / zoom}
                        strokeOpacity="0.5"
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={nodeRadius}
                      fill={fill}
                      fillOpacity={dimmed ? 0.2 : isHover ? 1 : 0.88}
                      stroke={isHover ? '#F1F5F9' : 'transparent'}
                      strokeWidth={2 / zoom}
                    />
                    {showLabel && node.name && (
                      <text
                        x={node.x}
                        y={node.y + nodeRadius + 14}
                        textAnchor="middle"
                        fill="#F1F5F9"
                        opacity={textOpacity}
                        fontSize={12}
                        fontWeight={isActive || isHover ? 600 : 500}
                        className="pointer-events-none select-none"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {truncateLabel(node.name)}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          <div className="absolute bottom-4 right-4 flex items-center gap-1 p-1 rounded-xl
                          bg-surface border border-border shadow-modal">
            <button
              type="button"
              onClick={zoomOut}
              className="p-2 rounded-lg text-text-muted hover:bg-surface2 hover:text-text transition-colors"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>
            <span className="text-label text-text-faint tabular-nums w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="p-2 rounded-lg text-text-muted hover:bg-surface2 hover:text-text transition-colors"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="p-2 rounded-lg text-text-muted hover:bg-surface2 hover:text-text transition-colors"
              title="Fit to view"
              aria-label="Fit to view"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {hoveredNode && (
            <div className="absolute bottom-4 left-4 px-4 py-2 rounded-xl
                            bg-surface border border-border shadow-modal pointer-events-none max-w-sm">
              <p className="text-body-sm text-text font-medium truncate">{hoveredNode.name}</p>
              <p className="text-label text-text-faint">
                {hoveredNode.cloudSync ? 'Google Drive' : 'Local'}
                {' · '}
                {graph.edges.filter(e => e.source === hoverId || e.target === hoverId).length} links
                {' · '}
                Click to open
              </p>
            </div>
          )}

          {graph.edges.length === 0 && !hoverId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg
                            bg-surface/90 border border-border text-label text-text-faint pointer-events-none">
              Use @ in notes to link them · Scroll to zoom · Drag to pan
            </div>
          )}
        </>
      )}
    </div>
  )
}
