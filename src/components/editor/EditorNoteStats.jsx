import { useMemo } from 'react'
import { computeNoteStats, formatNoteSize } from '../../lib/noteStats'
import { formatNoteDateTime } from './EditorStatusBar'
import { EDITOR_META_HEIGHT } from '../../lib/editorLayout'

export default function EditorNoteStats({ content, selectionLength = 0, createdAt, updatedAt }) {
  const stats = useMemo(() => computeNoteStats(content), [content])
  const hasDates = createdAt || updatedAt

  return (
    <div
      className="flex-none border-t border-border bg-surface/40 px-6 flex items-center justify-between gap-4 text-label text-text-faint font-mono tabular-nums select-none"
      style={{ height: EDITOR_META_HEIGHT }}
    >
      <div className="flex items-center gap-3 min-w-0 truncate">
        {hasDates && (
          <>
            <span className="truncate">
              Created <span className="text-text-faint/70">{formatNoteDateTime(createdAt)}</span>
            </span>
            <span className="text-border/50">·</span>
            <span className="truncate">
              Updated <span className="text-text-faint/70">{formatNoteDateTime(updatedAt)}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 flex-none">
        <span title="File size">{formatNoteSize(stats.bytes)}</span>
        <span className="text-border/50">·</span>
        <span title="Character count">{stats.chars.toLocaleString()} chars</span>
        <span className="text-border/50">·</span>
        <span title="Line count">{stats.lines.toLocaleString()} lines</span>
        {selectionLength > 0 && (
          <>
            <span className="text-border/50">·</span>
            <span className="text-text-muted" title="Selected text length">
              {selectionLength.toLocaleString()} selected
            </span>
          </>
        )}
      </div>
    </div>
  )
}
