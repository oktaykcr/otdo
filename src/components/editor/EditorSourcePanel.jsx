import { X, FileCode2 } from 'lucide-react'
import { getEditorBasePx } from '../../lib/fontScale'

export default function EditorSourcePanel({ value, onClose, editorFontSize = 'md' }) {
  const basePx = getEditorBasePx(editorFontSize)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface/80 flex-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 size={14} className="text-accent flex-none" />
          <span className="text-label font-medium text-text">Source</span>
          <span className="text-label text-text-faint truncate">Markdown · read-only</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-text-faint hover:text-text hover:bg-surface2 transition-colors"
          title="Close source view"
        >
          <X size={14} />
        </button>
      </div>

      <pre
        className="flex-1 min-h-0 overflow-auto m-0 bg-primary/50 px-4 py-3
                   font-mono text-text leading-relaxed whitespace-pre-wrap break-words
                   select-text cursor-default"
        style={{ fontSize: `${basePx}px` }}
      >
        {value || ''}
      </pre>
    </div>
  )
}
