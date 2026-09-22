import { useRef } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'

export default function EditorSearchBar({
  query,
  onQueryChange,
  matchCount,
  matchIndex,
  onNext,
  onPrev,
  onClear,
  inputRef,
  disabled = false,
}) {
  const localRef = useRef(null)
  const ref = inputRef || localRef

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.shiftKey ? onPrev() : onNext()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onClear()
      ref.current?.blur()
    }
  }

  const label = matchCount === 0
    ? query.trim() ? '0/0' : ''
    : `${matchIndex + 1}/${matchCount}`

  return (
    <div className="no-drag flex items-center gap-1 flex-1 min-w-0 max-w-md">
      <div className="relative flex-1 min-w-0">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
        <input
          ref={ref}
          type="search"
          value={query}
          disabled={disabled}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in note…"
          style={{ WebkitAppRegion: 'no-drag' }}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface2 border border-border
                     text-body-sm text-text placeholder:text-text-faint
                     focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40"
        />
      </div>
      {query.trim() && (
        <>
          <span className="text-label text-text-faint font-mono w-10 text-center flex-none">{label}</span>
          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount === 0 || disabled}
            className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2 disabled:opacity-30"
            title="Previous (Shift+Enter)"
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0 || disabled}
            className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2 disabled:opacity-30"
            title="Next (Enter)"
          >
            <ChevronDown size={15} />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2"
            title="Clear (Esc)"
          >
            <X size={15} />
          </button>
        </>
      )}
    </div>
  )
}
