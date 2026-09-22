import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import TodoBlock from './TodoBlock'
import CodeBlock from './CodeBlock'
import TableBlock from './TableBlock'
import InlineMarkdown from '../InlineMarkdown'
import InlineFormatToolbar from '../InlineFormatToolbar'
import LinkEditPopover from '../LinkEditPopover'
import NoteMentionMenu from '../NoteMentionMenu'
import { applyInlineFormat, getSelectionFormats, hasInlineFormatting, replaceLink, removeLink, getLinkAtSelection } from '../../../lib/inlineFormat'
import { normalizeLinkUrl } from '../../../lib/openExternalLink'
import { findActiveMentionTrigger, buildNoteMentionMarkdown } from '../../../lib/noteMentions'
import { getTextareaCaretClientRect } from '../../../lib/caretPosition'

const BLOCK_TYPE_STYLES = {
  p:        'text-[1em] text-text leading-relaxed',
  h1:       'text-[2.25em] font-bold text-text leading-tight',
  h2:       'text-[1.5em] font-semibold text-text leading-snug mt-[0.5em]',
  h3:       'text-[1.125em] font-semibold text-text-muted leading-snug mt-[0.25em]',
  bullet:   'text-[1em] text-text leading-relaxed',
  numbered: 'text-[1em] text-text leading-relaxed',
  quote:    'text-[1em] text-text-muted italic leading-relaxed',
  code:     'text-[0.875em] font-mono text-text leading-relaxed',
}

const TYPE_PLACEHOLDERS = {
  p:        'Type / for blocks, @ to link a note…',
  h1:       'Heading 1',
  h2:       'Heading 2',
  h3:       'Heading 3',
  bullet:   'List item',
  numbered: 'List item',
  quote:    'Quote',
  code:     'Code…',
}

export default function Block({
  block,
  onChange,
  onDelete,
  onEnter,
  onArrowUp,
  onArrowDown,
  onTypeChange,
  onPasteMarkdown,
  focused,
  onFocus,
  cursorAt = 'end',
  index,
  listNumber = 1,
  spellCheck = false,
  searchSelectRange = null,
  activeNoteId = null,
  onOpenNote,
}) {
  const ref = useRef(null)
  const [selection, setSelection] = useState(null)
  const [toolbarPos, setToolbarPos] = useState(null)
  const [linkEdit, setLinkEdit] = useState(null)
  const [mentionMenu, setMentionMenu] = useState(null)

  const syncSelection = useCallback(() => {
    const ta = ref.current
    if (!ta || !focused) {
      setSelection(null)
      setToolbarPos(null)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd

    if (start !== end) {
      setSelection({ start, end })
      const rect = ta.getBoundingClientRect()
      setToolbarPos({ top: rect.top - 44, left: rect.left + rect.width / 2 })
    } else {
      setSelection(null)
      setToolbarPos(null)
    }
  }, [focused])

  const clearTextSelection = useCallback(() => {
    const ta = ref.current
    if (ta) {
      const pos = ta.selectionStart
      ta.setSelectionRange(pos, pos)
    }
    setSelection(null)
    setToolbarPos(null)
  }, [])

  const applyFormat = useCallback((format, colorHex) => {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const result = applyInlineFormat(block.content, start, end, format, colorHex)
    onChange({ ...block, content: result.text })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.start, result.end)
      syncSelection()
    })
  }, [block, onChange, syncSelection])

  const activeFormats = useMemo(() => {
    if (!selection) return null
    return getSelectionFormats(block.content, selection.start, selection.end)
  }, [selection, block.content])

  useEffect(() => {
    if (!focused) {
      setSelection(null)
      setToolbarPos(null)
      setLinkEdit(null)
      setMentionMenu(null)
      return
    }

    document.addEventListener('selectionchange', syncSelection)
    return () => document.removeEventListener('selectionchange', syncSelection)
  }, [focused, syncSelection])

  useEffect(() => {
    if (!selection || linkEdit || mentionMenu) return

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      clearTextSelection()
    }

    const onMouseDown = (e) => {
      const ta = ref.current
      if (ta?.contains(e.target)) return
      if (e.target.closest('[data-inline-format-toolbar]')) return
      clearTextSelection()
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onMouseDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [selection, linkEdit, mentionMenu, clearTextSelection])

  const syncMentionMenu = useCallback((content, caret) => {
    const trigger = findActiveMentionTrigger(content, caret)
    if (!trigger) {
      setMentionMenu(null)
      return
    }
    const ta = ref.current
    const position = ta
      ? getTextareaCaretClientRect(ta, caret)
      : { top: 200, left: 200 }
    setMentionMenu({ ...trigger, position })
  }, [])

  const handleContentChange = useCallback((value) => {
    onChange({ ...block, content: value })
    const ta = ref.current
    const caret = ta?.selectionStart ?? value.length
    requestAnimationFrame(() => syncMentionMenu(value, caret))
  }, [block, onChange, syncMentionMenu])

  const handleMentionSelect = useCallback((note) => {
    if (!mentionMenu) return
    const md = buildNoteMentionMarkdown(note.name, note.id)
    const before = block.content.slice(0, mentionMenu.atIndex)
    const after = block.content.slice(mentionMenu.replaceEnd)
    const next = before + md + after
    const caret = before.length + md.length

    onChange({ ...block, content: next })
    setMentionMenu(null)

    requestAnimationFrame(() => {
      const ta = ref.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(caret, caret)
    })
  }, [mentionMenu, block, onChange])

  const handleNoteMentionClick = useCallback((noteId) => {
    if (noteId && noteId !== activeNoteId) onOpenNote?.(noteId)
  }, [activeNoteId, onOpenNote])

  const openLinkEdit = useCallback((link, position) => {
    setLinkEdit({
      start: link.start,
      end: link.end,
      label: link.label,
      href: link.href,
      top: position?.top ?? window.innerHeight / 2 - 100,
      left: position?.left ?? window.innerWidth / 2 - 140,
    })
  }, [])

  const handleLinkEditFromPreview = useCallback((info) => {
    openLinkEdit(info, { top: info.top, left: info.left })
  }, [openLinkEdit])

  const handleSaveLink = useCallback((label, href) => {
    if (!linkEdit) return
    const normalized = normalizeLinkUrl(href)
    const next = replaceLink(block.content, linkEdit.start, linkEdit.end, label, normalized)
    onChange({ ...block, content: next })
    setLinkEdit(null)
  }, [linkEdit, block, onChange])

  const handleRemoveLink = useCallback(() => {
    if (!linkEdit) return
    const next = removeLink(block.content, linkEdit.start, linkEdit.end)
    onChange({ ...block, content: next })
    setLinkEdit(null)
  }, [linkEdit, block, onChange])

  const handleTextareaContextMenu = useCallback((e) => {
    const ta = ref.current
    if (!ta) return
    const link = getLinkAtSelection(block.content, ta.selectionStart, ta.selectionEnd)
    if (!link) return
    e.preventDefault()
    openLinkEdit(link, { top: e.clientY, left: e.clientX })
  }, [block.content, openLinkEdit])

  const handleLinkFromToolbar = useCallback(() => {
    const ta = ref.current
    const start = selection?.start ?? ta?.selectionStart
    const end = selection?.end ?? ta?.selectionEnd
    if (start == null || end == null) return

    const existing = getLinkAtSelection(block.content, start, end)
    const popoverPos = {
      top: (toolbarPos?.top ?? 200) + 52,
      left: toolbarPos?.left ?? window.innerWidth / 2,
    }

    if (existing) {
      openLinkEdit(existing, popoverPos)
      return
    }

    if (start === end) return

    setLinkEdit({
      start,
      end,
      label: block.content.slice(start, end),
      href: '',
      isNew: true,
      top: popoverPos.top,
      left: popoverPos.left,
    })
  }, [selection, block.content, toolbarPos, openLinkEdit])

  const handlePreviewActivate = useCallback((e) => {
    e.preventDefault()
    onFocus()
  }, [onFocus])

  const handlePaste = useCallback((e) => {
    if (!onPasteMarkdown) return
    const text = e.clipboardData?.getData('text/plain')
    if (text == null) return
    const ta = ref.current
    const start = ta?.selectionStart ?? 0
    const end = ta?.selectionEnd ?? start
    const handled = onPasteMarkdown(start, end, text)
    if (handled) e.preventDefault()
  }, [onPasteMarkdown])

  const showFormattedPreview = !focused && block.content && hasInlineFormatting(block.content)

  useEffect(() => {
    if (!focused) return
    if (block.type === 'divider' || block.type === 'todo' || block.type === 'code' || block.type === 'table') return

    requestAnimationFrame(() => {
      const ta = ref.current
      if (!ta) return

      if (document.activeElement !== ta) {
        ta.focus()
      }

      const pos = typeof cursorAt === 'number'
        ? Math.max(0, Math.min(cursorAt, ta.value.length))
        : cursorAt === 'start' ? 0 : ta.value.length
      ta.setSelectionRange(pos, pos)

      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    })
  }, [focused, block.id, block.type, cursorAt])

  useEffect(() => {
    if (!searchSelectRange || searchSelectRange.field !== 'content') return
    if (block.type === 'divider' || block.type === 'todo' || block.type === 'code' || block.type === 'table') return
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(searchSelectRange.start, searchSelectRange.end)
  }, [searchSelectRange, block.type])

  if (block.type === 'todo') {
    return (
      <TodoBlock
        block={block}
        onChange={onChange}
        onDelete={onDelete}
        focused={focused}
        onFocus={onFocus}
        onEnter={onEnter}
        searchSelectRange={searchSelectRange}
      />
    )
  }

  if (block.type === 'code') {
    return (
      <CodeBlock
        block={block}
        onChange={onChange}
        onDelete={onDelete}
        focused={focused}
        onFocus={onFocus}
        onArrowUp={onArrowUp}
        onArrowDown={onArrowDown}
        searchSelectRange={searchSelectRange}
      />
    )
  }

  if (block.type === 'table') {
    return (
      <TableBlock
        block={block}
        onChange={onChange}
        onDelete={onDelete}
        focused={focused}
        onFocus={onFocus}
        onEnter={onEnter}
        onArrowUp={onArrowUp}
        onArrowDown={onArrowDown}
      />
    )
  }

  if (block.type === 'divider') {
    return (
      <div
        className="group relative py-3 cursor-pointer"
        onClick={onFocus}
      >
        <hr className="border-border group-hover:border-text-faint transition-colors" />
        {focused && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded bg-surface text-text-faint hover:text-tag-important"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  const handleKeyDown = (e) => {
    const ta = ref.current

    // Inline formatting shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'b') {
      e.preventDefault()
      applyFormat('bold')
      return
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'i') {
      e.preventDefault()
      applyFormat('italic')
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
      e.preventDefault()
      applyFormat('strike')
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault()
      applyFormat('code')
      return
    }

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      handleLinkFromToolbar()
      return
    }

    if (e.key === 'Escape') {
      if (mentionMenu) {
        e.preventDefault()
        setMentionMenu(null)
        return
      }
      if (selection) {
        e.preventDefault()
        clearTextSelection()
        return
      }
    }

    // Enter → new block, or exit list when empty
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mentionMenu) return
      e.preventDefault()
      if ((block.type === 'bullet' || block.type === 'numbered') && !block.content.trim()) {
        onTypeChange('p')
        return
      }
      onEnter()
      return
    }

    // Backspace at start of empty block → delete
    if (e.key === 'Backspace' && !block.content) {
      e.preventDefault()
      onDelete()
      return
    }

    // Backspace at start: demote heading types
    if (e.key === 'Backspace' && ta?.selectionStart === 0 && ta?.selectionEnd === 0) {
      if (block.type === 'h1') { e.preventDefault(); onTypeChange('h2'); return }
      if (block.type === 'h2') { e.preventDefault(); onTypeChange('h3'); return }
      if (block.type === 'h3') { e.preventDefault(); onTypeChange('p'); return }
      if (block.type === 'bullet' || block.type === 'numbered' || block.type === 'quote') {
        e.preventDefault(); onTypeChange('p'); return
      }
    }

    // Arrow navigation
    if (e.key === 'ArrowUp'   && ta?.selectionStart === 0) { e.preventDefault(); onArrowUp(); return }
    if (e.key === 'ArrowDown' && ta?.selectionStart === ta?.value?.length) { e.preventDefault(); onArrowDown(); return }

    // Tab: indent bullets
    if (e.key === 'Tab' && (block.type === 'bullet' || block.type === 'numbered')) {
      e.preventDefault()
      const delta = e.shiftKey ? -1 : 1
      const newIndent = Math.max(0, Math.min(3, (block.indent || 0) + delta))
      onChange({ ...block, indent: newIndent })
    }
  }

  const isCode  = block.type === 'code'
  const isQuote = block.type === 'quote'

  const wrapperCls = [
    isCode  ? 'bg-surface rounded-xl p-4 border border-border font-mono' : '',
    isQuote ? 'border-l-4 border-accent pl-4 bg-accent/5 rounded-r-xl py-2' : '',
    block.type === 'bullet' || block.type === 'numbered' ? `pl-${((block.indent || 0) * 4) + 2}` : '',
  ].filter(Boolean).join(' ')

  const styles = BLOCK_TYPE_STYLES

  return (
    <div className={`group relative flex items-start gap-2 ${wrapperCls}`}>
      {/* Bullet / numbered prefix */}
      {block.type === 'bullet' && (
        <span className="text-text-faint mt-1 text-sm select-none flex-none">•</span>
      )}
      {block.type === 'numbered' && (
        <span className="text-text-faint mt-0.5 text-sm select-none flex-none w-5 text-right tabular-nums">
          {listNumber}.
        </span>
      )}

      <div
        className="relative flex-1 min-w-0 min-h-[1.5em] cursor-text"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return
          e.preventDefault()
          onFocus()
        }}
      >
        <textarea
          ref={ref}
          value={block.content}
          onChange={e => handleContentChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onClick={syncSelection}
          onSelect={() => {
            syncSelection()
            const ta = ref.current
            if (ta) syncMentionMenu(block.content, ta.selectionStart)
          }}
          onMouseUp={syncSelection}
          onKeyUp={(e) => {
            syncSelection()
            const ta = ref.current
            if (ta) syncMentionMenu(block.content, ta.selectionStart)
          }}
          onContextMenu={handleTextareaContextMenu}
          rows={1}
          placeholder={focused ? (TYPE_PLACEHOLDERS[block.type] || '') : ''}
          spellCheck={spellCheck}
          tabIndex={showFormattedPreview ? -1 : 0}
          aria-hidden={showFormattedPreview}
          className={`
            flex-1 bg-transparent resize-none overflow-hidden
            outline-none w-full min-h-[1.5em]
            placeholder:text-text-faint/30
            ${styles[block.type] || styles.p}
            ${showFormattedPreview ? 'absolute inset-0 opacity-0 pointer-events-none h-full' : ''}
          `}
          style={{ height: showFormattedPreview ? '100%' : 'auto' }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
        />

        {showFormattedPreview && (
          <div
            role="button"
            tabIndex={0}
            onMouseDown={(e) => {
              e.stopPropagation()
              handlePreviewActivate(e)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handlePreviewActivate(e)
              }
            }}
            className={`
              relative w-full min-h-[1.5em] cursor-text whitespace-pre-wrap break-words
              ${styles[block.type] || styles.p}
            `}
          >
            <InlineMarkdown
              text={block.content}
              onLinkEdit={handleLinkEditFromPreview}
              onNoteMention={handleNoteMentionClick}
            />
          </div>
        )}
      </div>

      {focused && selection && selection.start !== selection.end && (
        <InlineFormatToolbar
          position={toolbarPos}
          onFormat={applyFormat}
          onLink={handleLinkFromToolbar}
          onTypeChange={onTypeChange}
          blockType={block.type}
          activeFormats={activeFormats}
          hasTextSelection
        />
      )}

      {mentionMenu && (
        <NoteMentionMenu
          position={mentionMenu.position}
          query={mentionMenu.query}
          excludeNoteId={activeNoteId}
          onSelect={handleMentionSelect}
          onClose={() => setMentionMenu(null)}
        />
      )}

      {linkEdit && (
        <LinkEditPopover
          position={{ top: linkEdit.top, left: linkEdit.left }}
          link={linkEdit}
          onSave={handleSaveLink}
          onRemove={handleRemoveLink}
          onClose={() => setLinkEdit(null)}
        />
      )}
    </div>
  )
}
