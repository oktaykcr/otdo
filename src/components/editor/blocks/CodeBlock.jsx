import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'
import { CODE_LANGUAGES, normalizeLang } from '../../../lib/codeLanguages'
import { highlightCode } from '../../../lib/codeHighlight'

const CODE_SIZE_CLS = 'text-[0.875em] leading-relaxed'

function syncHeight(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function CodeBlock({
  block,
  onChange,
  onDelete,
  focused,
  onFocus,
  onArrowUp,
  onArrowDown,
  searchSelectRange = null,
}) {
  const taRef = useRef(null)
  const copiedTimer = useRef(null)
  const [copied, setCopied] = useState(false)
  const lang = normalizeLang(block.lang)

  const highlighted = useMemo(
    () => highlightCode(block.content, lang),
    [block.content, lang],
  )

  useEffect(() => {
    if (focused) {
      taRef.current?.focus()
      syncHeight(taRef.current)
    }
  }, [focused])

  useEffect(() => {
    if (!focused) return
    syncHeight(taRef.current)
  }, [block.content, focused])

  useEffect(() => {
    if (!searchSelectRange || searchSelectRange.field !== 'content') return
    const el = taRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(searchSelectRange.start, searchSelectRange.end)
  }, [searchSelectRange])

  const handleKeyDown = (e) => {
    const ta = taRef.current

    if (e.key === 'Backspace' && !block.content) {
      e.preventDefault()
      onDelete()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = block.content.slice(0, start) + '  ' + block.content.slice(end)
      onChange({ ...block, content: next })
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
      return
    }

    if (e.key === 'ArrowUp' && ta?.selectionStart === 0 && ta?.selectionEnd === 0) {
      e.preventDefault()
      onArrowUp()
      return
    }

    if (e.key === 'ArrowDown' && ta?.selectionStart === ta?.value?.length) {
      e.preventDefault()
      onArrowDown()
    }
  }

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
  }, [])

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation()
    const text = block.content
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }

    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [block.content])

  const handleLangChange = (e) => {
    onChange({ ...block, lang: e.target.value })
  }

  return (
    <div
      className="rounded-xl border border-border bg-surface overflow-hidden"
      onClick={onFocus}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-surface2/60">
        <div className="relative">
          <select
            value={lang}
            onChange={handleLangChange}
            onMouseDown={(e) => e.stopPropagation()}
            className="appearance-none bg-transparent text-label text-text-muted font-mono
                       pl-2 pr-7 py-1 rounded-md cursor-pointer
                       hover:bg-surface2 focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Code language"
          >
            {CODE_LANGUAGES.map(({ id, label }) => (
              <option key={id || 'plain'} value={id}>{label}</option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!block.content}
            title={copied ? 'Copied' : 'Copy code'}
            className="flex items-center gap-1 text-label text-text-faint hover:text-text
                       disabled:opacity-40 disabled:pointer-events-none
                       px-1.5 py-0.5 rounded hover:bg-surface2 transition-colors"
          >
            {copied ? <Check size={12} className="text-status-done" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {focused && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-label text-text-faint hover:text-tag-important px-1.5 py-0.5 rounded"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className={`code-block-editor font-mono ${CODE_SIZE_CLS}`}>
        <div className="code-block-scroll">
          {focused ? (
            <textarea
              ref={taRef}
              value={block.content}
              onChange={(e) => {
                onChange({ ...block, content: e.target.value })
                syncHeight(e.target)
              }}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              spellCheck={false}
              wrap="off"
              placeholder="Paste or type code…"
              className="code-block-input-editing m-0 w-full min-h-[2.75rem] resize-none
                         px-4 py-3 outline-none bg-transparent"
            />
          ) : (
            <pre
              className="code-block-highlight hljs m-0 min-h-[2.75rem] px-4 py-3 cursor-text"
              dangerouslySetInnerHTML={{
                __html: highlighted || '<span class="code-block-empty">Empty code block</span>',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
