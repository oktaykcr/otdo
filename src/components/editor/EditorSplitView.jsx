import { useRef, useState, useEffect, useCallback } from 'react'

export default function EditorSplitView({ main, side, sideWidth, onSideWidthChange, minMain = 280, minSide = 240 }) {
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const startDrag = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const sidePx = rect.right - e.clientX
      const clamped = Math.min(Math.max(sidePx, minSide), rect.width - minMain)
      onSideWidthChange(clamped)
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [minMain, minSide, onSideWidthChange])

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
        {main}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={startDrag}
        className="w-1 flex-none cursor-col-resize bg-border/40 hover:bg-accent/50 active:bg-accent transition-colors shrink-0"
      />

      <div
        className="flex-none min-h-0 overflow-hidden flex flex-col border-l border-border bg-surface/40"
        style={{ width: sideWidth }}
      >
        {side}
      </div>
    </div>
  )
}

export function useSourcePanelWidth(defaultWidth = 420) {
  const [width, setWidth] = useState(defaultWidth)
  return [width, setWidth]
}
