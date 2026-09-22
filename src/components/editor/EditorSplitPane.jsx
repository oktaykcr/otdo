import { useRef, useState, useEffect, useCallback } from 'react'

export default function EditorSplitPane({ direction, first, second, ratio = 0.5, onRatioChange }) {
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const isHorizontal = direction === 'horizontal'
  const minSize = 160

  const startDrag = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }, [isHorizontal])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      let next = ratio
      if (isHorizontal) {
        const x = e.clientX - rect.left
        next = clamp(x / rect.width, 0.15, 0.85)
      } else {
        const y = e.clientY - rect.top
        next = clamp(y / rect.height, 0.15, 0.85)
      }
      onRatioChange?.(next)
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
  }, [isHorizontal, onRatioChange, ratio])

  const firstStyle = isHorizontal
    ? { width: `${ratio * 100}%`, minWidth: minSize }
    : { height: `${ratio * 100}%`, minHeight: minSize }

  const secondStyle = isHorizontal
    ? { width: `${(1 - ratio) * 100}%`, minWidth: minSize }
    : { height: `${(1 - ratio) * 100}%`, minHeight: minSize }

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 min-h-0 min-w-0 overflow-hidden ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      <div className="flex flex-col min-h-0 min-w-0 overflow-hidden" style={firstStyle}>
        {first}
      </div>

      <div
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        onMouseDown={startDrag}
        className={`flex-none bg-border/40 hover:bg-accent/50 active:bg-accent transition-colors shrink-0 ${
          isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
        }`}
      />

      <div className="flex flex-col min-h-0 min-w-0 overflow-hidden flex-1" style={secondStyle}>
        {second}
      </div>
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
