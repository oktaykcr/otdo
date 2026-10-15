import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Block from './blocks/Block'
import SlashMenu from './SlashMenu'
import { newBlock, getNumberedListIndex, createDefaultTable, insertMarkdownPaste, serializeBlocks, matchMarkdownShortcut } from '../../lib/blocks'
import {
  normalizeBlockRange,
  isBlockInRange,
  sliceBlocksByRange,
  removeBlocksByRange,
  blockIndexFromPoint,
} from '../../lib/blockSelection'
import { buildEditorViewportStyle, buildEditorColumnStyle } from '../../lib/editorLayout'
import { getEditorBasePx } from '../../lib/fontScale'
import { buildNoteTodoDisplayPlan } from '../../lib/noteTodoView'
import useTodoStore from '../../store/todoStore'
import useSettingsStore from '../../store/settingsStore'
import { buildTodoFromSlashForm } from '../../lib/todoStatus'
import { getSlashDateTimeInsert } from '../../lib/slashDateTime'

export default function BlockEditor({
  blocks,
  onChange,
  showLineNumbers,
  spellCheck,
  fontSize = 'md',
  paddingTop = 48,
  paddingLeft = 32,
  paddingRight = 32,
  paddingBottom = 128,
  maxWidth = 'md',
  align = 'center',
  showBounds = false,
  activeMatch = null,
  matchBlockIndices = [],
  searchQuery = '',
  onSelectionLengthChange,
  activeNoteId = null,
  onOpenNote,
  embedded = false,
  isActiveEditor = true,
  selectionApiRef = null,
}) {
  const [focusIdx, setFocusIdx] = useState(0)
  const [focusCursorAt, setFocusCursorAt] = useState('end')
  const [slashMenu, setSlashMenu] = useState(null)
  const [lineSelection, setLineSelection] = useState(null)
  const containerRef = useRef(null)
  const dragSelectRef = useRef(null)
  const lineSelectionRef = useRef(null)
  const selectionAnchorRef = useRef(null)
  const blocksRef = useRef(blocks)

  useEffect(() => {
    lineSelectionRef.current = lineSelection
  }, [lineSelection])

  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  useEffect(() => {
    setLineSelection(null)
    dragSelectRef.current = null
    selectionAnchorRef.current = null
  }, [activeNoteId])

  useEffect(() => {
    if (!lineSelection || !isActiveEditor || !containerRef.current) return
    const root = containerRef.current
    if (!root.hasAttribute('tabindex')) root.tabIndex = -1
    root.focus({ preventScroll: true })
  }, [lineSelection, isActiveEditor])
  const addTodo = useTodoStore(s => s.addTodo)
  const todos = useTodoStore(s => s.todos)
  const showDoneTodos = useSettingsStore(s => s.showDoneTodos)
  const showCancelledTodos = useSettingsStore(s => s.showCancelledTodos)
  const noteTodoFilter = useSettingsStore(s => s.noteTodoFilter)
  const noteTodoSort = useSettingsStore(s => s.noteTodoSort)

  const displayPlan = useMemo(
    () => buildNoteTodoDisplayPlan(blocks, todos, {
      filter: noteTodoFilter,
      sortBy: noteTodoSort,
      showDoneTodos,
      showCancelledTodos,
    }),
    [blocks, todos, noteTodoFilter, noteTodoSort, showDoneTodos, showCancelledTodos]
  )

  const focusBlock = useCallback((idx, cursor = 'end') => {
    setLineSelection(null)
    setFocusCursorAt(cursor)
    setFocusIdx(idx)
  }, [])

  const updateBlock = useCallback((idx, updated) => {
    const next = [...blocks]
    const current = blocks[idx]
    if (!current) return

    const shortcut = matchMarkdownShortcut(updated.content, current.type)
    if (shortcut) {
      setSlashMenu(null)
      if (shortcut.type === 'divider') {
        next.splice(idx, 1, { ...current, type: 'divider', content: '' }, newBlock('p'))
        onChange(next)
        focusBlock(idx + 1, 'start')
        return
      }
      next[idx] = {
        ...current,
        ...updated,
        type: shortcut.type,
        content: shortcut.content,
        ...shortcut.extra,
      }
      onChange(next)
      focusBlock(idx, 'start')
      return
    }

    // Detect slash typed at start of empty block
    if (
      updated.type !== 'todo' &&
      updated.type !== 'table' &&
      updated.content?.endsWith('/') &&
      (updated.content === '/' || current.content === '')
    ) {
      // Get approximate position from the block DOM element
      const els = containerRef.current?.querySelectorAll('[data-block]')
      const el  = els?.[idx]
      const rect = el?.getBoundingClientRect()
      const pos  = rect
        ? { top: rect.bottom + 4, left: rect.left }
        : { top: 200, left: 200 }

      // Remove the slash from content
      next[idx] = { ...updated, content: updated.content.slice(0, -1) }
      onChange(next)
      setSlashMenu({ position: pos, query: '', blockIdx: idx })
      return
    }

    // If menu is open and user keeps typing after /
    if (slashMenu && slashMenu.blockIdx === idx) {
      const typed = updated.content.slice(blocks[idx].content.length - (slashMenu.typedBefore?.length || 0))
      // If backspace removes past slash start, close menu
      if (updated.content.length < (slashMenu.originalContent?.length || 0)) {
        setSlashMenu(null)
      } else {
        const q = updated.content.slice(slashMenu.originalContent?.length || updated.content.length)
        setSlashMenu(m => ({ ...m, query: q }))
      }
    }

    next[idx] = updated
    onChange(next)
  }, [blocks, onChange, slashMenu, focusBlock])

  const selectAllLines = useCallback(() => {
    if (!blocksRef.current?.length) return
    selectionAnchorRef.current = 0
    setLineSelection({ start: 0, end: blocksRef.current.length - 1 })
  }, [])

  const copyLineSelection = useCallback(async () => {
    const current = blocksRef.current || []
    const range = lineSelectionRef.current
    const selected = range ? sliceBlocksByRange(current, range) : current
    const text = serializeBlocks(selected)
    await navigator.clipboard.writeText(text)
    return text.length
  }, [])

  const removeLineSelection = useCallback(() => {
    const current = blocksRef.current || []
    const range = lineSelectionRef.current || (current.length
      ? { start: 0, end: current.length - 1 }
      : null)
    const { blocks: next, focusIdx: nextFocus } = removeBlocksByRange(current, range, newBlock)
    onChange(next)
    setLineSelection(null)
    setFocusCursorAt('start')
    setFocusIdx(nextFocus)
  }, [onChange])

  useEffect(() => {
    if (!selectionApiRef || !isActiveEditor) return
    selectionApiRef.current = {
      selectAll: selectAllLines,
      removeAll: removeLineSelection,
      copy: copyLineSelection,
      hasSelection: () => !!lineSelectionRef.current,
    }
    return () => {
      if (selectionApiRef.current?.selectAll === selectAllLines) {
        selectionApiRef.current = null
      }
    }
  }, [selectionApiRef, isActiveEditor, selectAllLines, removeLineSelection, copyLineSelection])

  useEffect(() => {
    if (!isActiveEditor) return

    const onMove = (e) => {
      const drag = dragSelectRef.current
      if (!drag || e.buttons !== 1) return
      const idx = blockIndexFromPoint(e.clientX, e.clientY, containerRef.current)
      if (idx == null) return
      if (idx !== drag.anchorIdx || drag.crossed) {
        if (!drag.crossed) {
          drag.crossed = true
          const active = document.activeElement
          if (active && containerRef.current?.contains(active)) active.blur()
        }
        setLineSelection(normalizeBlockRange(drag.anchorIdx, idx))
      }
    }

    const onUp = () => {
      dragSelectRef.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isActiveEditor])

  useEffect(() => {
    if (!isActiveEditor) return

    const onKeyDown = (e) => {
      const root = containerRef.current
      const active = document.activeElement
      const inside = !!root && (active === root || root.contains(active))
      const range = lineSelectionRef.current

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        if (!inside) return
        e.preventDefault()
        selectAllLines()
        return
      }

      if (!range || !inside) return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copyLineSelection()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        copyLineSelection().then(() => removeLineSelection())
        return
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        removeLineSelection()
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setLineSelection(null)
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [isActiveEditor, selectAllLines, copyLineSelection, removeLineSelection])

  const handleBlockMouseDown = useCallback((sourceIdx, e) => {
    if (e.button !== 0) return
    if (e.target.closest('button, a, input, [data-inline-format-toolbar]')) return

    if (e.shiftKey) {
      const anchor = selectionAnchorRef.current ?? focusIdx
      selectionAnchorRef.current = anchor
      setLineSelection(normalizeBlockRange(anchor, sourceIdx))
      e.preventDefault()
      return
    }

    selectionAnchorRef.current = sourceIdx
    dragSelectRef.current = { anchorIdx: sourceIdx, crossed: false }
    if (lineSelectionRef.current) setLineSelection(null)
  }, [focusIdx])

  const handlePasteMarkdown = useCallback((idx, start, end, text) => {
    const result = insertMarkdownPaste(blocks, idx, start, end, text)
    if (!result) return false
    setLineSelection(null)
    onChange(result.blocks)
    focusBlock(result.focusIdx, result.cursor)
    return true
  }, [blocks, onChange, focusBlock])

  const deleteBlock = useCallback((idx) => {
    setLineSelection(null)
    if (blocks.length === 1) {
      onChange([newBlock('p')])
      focusBlock(0)
      return
    }
    const next = blocks.filter((_, i) => i !== idx)
    onChange(next)
    focusBlock(Math.max(0, idx - 1))
  }, [blocks, onChange, focusBlock])

  const insertAfter = useCallback((idx, type = 'p', cursor = 'start') => {
    const nb   = newBlock(type)
    const next = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
    onChange(next)
    focusBlock(idx + 1, cursor)
  }, [blocks, onChange, focusBlock])

  const handleLineGapClick = useCallback((idx) => {
    const nextIdx = idx + 1
    if (nextIdx < blocks.length) {
      focusBlock(nextIdx, 'start')
      return
    }
    insertAfter(idx, 'p', 'start')
  }, [blocks.length, focusBlock, insertAfter])

  const changeType = useCallback((idx, type) => {
    const next = [...blocks]
    next[idx] = { ...blocks[idx], type }
    onChange(next)
    focusBlock(idx)
  }, [blocks, onChange, focusBlock])

  const handleMenuSelect = useCallback(async ({ type: selType, insert, insertType, data }) => {
    if (!slashMenu) return
    const idx = slashMenu.blockIdx
    setSlashMenu(null)

    if (selType === 'divider') {
      const nb = newBlock('divider')
      const next = [...blocks]
      next.splice(idx, 1, nb, newBlock('p'))
      onChange(next)
      focusBlock(idx + 1, 'start')
      return
    }

    if (selType === 'block') {
      const next = [...blocks]
      next[idx] = newBlock('code', '', { lang: '' })
      onChange(next)
      focusBlock(idx)
      return
    }

    if (selType === 'table') {
      const next = [...blocks]
      next[idx] = newBlock('table', '', { rows: createDefaultTable(2, 2) })
      onChange(next)
      focusBlock(idx)
      return
    }

    if (selType === 'todo-create') {
      const payload = buildTodoFromSlashForm(data)
      const t = await addTodo(payload)
      const nb = newBlock('todo', data.title, { todoId: t.id })
      const next = [...blocks]
      next[idx] = nb
      onChange(next)
      focusBlock(idx)
      return
    }

    if (selType === 'link-create') {
      const { label, href } = data
      const md = `[${label}](${href})`
      const next = [...blocks]
      next[idx] = { ...blocks[idx], type: 'p', content: md }
      onChange(next)
      focusBlock(idx)
      return
    }

    if (selType === 'insert-today' || selType === 'insert-date' || selType === 'insert-time') {
      const kind = selType.replace('insert-', '')
      const text = getSlashDateTimeInsert(kind)
      const next = [...blocks]
      next[idx] = { ...blocks[idx], type: 'p', content: text }
      onChange(next)
      focusBlock(idx)
      return
    }

    // Line / type change
    const targetType = insertType || selType
    const next = [...blocks]
    next[idx] = { ...blocks[idx], type: targetType }
    onChange(next)
    focusBlock(idx)
  }, [slashMenu, blocks, onChange, addTodo, focusBlock])

  useEffect(() => {
    if (!activeMatch || !blocks?.length) return
    const els = containerRef.current?.querySelectorAll('[data-block]')
    els?.[activeMatch.blockIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeMatch, blocks?.length])

  useEffect(() => {
    if (!onSelectionLengthChange) return

    const readSelection = () => {
      const range = lineSelectionRef.current
      if (range) {
        const selected = sliceBlocksByRange(blocksRef.current || [], range)
        onSelectionLengthChange(serializeBlocks(selected).length)
        return
      }
      const root = containerRef.current
      const el = document.activeElement
      if (!root?.contains(el)) {
        onSelectionLengthChange(0)
        return
      }
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        onSelectionLengthChange(Math.abs(el.selectionEnd - el.selectionStart))
        return
      }
      onSelectionLengthChange(0)
    }

    document.addEventListener('selectionchange', readSelection)
    document.addEventListener('mouseup', readSelection)
    document.addEventListener('keyup', readSelection)
    readSelection()

    return () => {
      document.removeEventListener('selectionchange', readSelection)
      document.removeEventListener('mouseup', readSelection)
      document.removeEventListener('keyup', readSelection)
    }
  }, [onSelectionLengthChange, blocks.length, lineSelection])

  const columnRef = useRef(null)
  // Highlight the matched words inside rendered block text (CSS Custom Highlight API).
  useEffect(() => {
    if (!CSS.highlights) return
    const q = searchQuery.trim().toLowerCase()
    const root = columnRef.current
    if (!q || !root) { CSS.highlights.delete('otdo-search'); return }
    const ranges = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.data.toLowerCase()
      for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + q.length)) {
        const r = new Range()
        r.setStart(node, i)
        r.setEnd(node, i + q.length)
        ranges.push(r)
      }
    }
    CSS.highlights.set('otdo-search', new Highlight(...ranges))
    return () => CSS.highlights.delete('otdo-search')
  }, [searchQuery, blocks, focusIdx])

  if (!blocks?.length) return null

  const viewportStyle = embedded ? undefined : buildEditorViewportStyle({
    paddingTop,
    paddingLeft,
    paddingRight,
    paddingBottom,
    align,
  })

  const columnStyle = embedded ? undefined : buildEditorColumnStyle({ maxWidth })

  const matchSet = new Set(matchBlockIndices)
  const editorBasePx = getEditorBasePx(fontSize)

  const blocksColumn = (
    <div
      ref={columnRef}
      className={`space-y-0.5 ${
        showBounds
          ? 'border border-dashed border-accent/40 rounded-xl bg-surface/10 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.06)]'
          : ''
      }`}
      style={embedded ? { fontSize: `${editorBasePx}px` } : { ...columnStyle, fontSize: `${editorBasePx}px` }}
    >
        {displayPlan.map(({ displayBlock, blockIdx, sourceBlockIdx, hidden }, planIdx) => {
          if (hidden) return null

          const isLastVisible = !displayPlan.slice(planIdx + 1).some(item => !item.hidden)

          const lineSelected = isBlockInRange(sourceBlockIdx, lineSelection)

          return (
          <div key={displayBlock.id}>
          <div
            data-block
            data-block-index={sourceBlockIdx}
            onMouseDown={e => handleBlockMouseDown(sourceBlockIdx, e)}
            className={`relative flex items-start gap-0 rounded-lg transition-colors ${
              lineSelected
                ? 'bg-accent/25 ring-1 ring-accent/30'
                : activeMatch?.blockIdx === blockIdx
                  ? 'ring-2 ring-accent/60 bg-accent/10'
                  : matchSet.has(blockIdx)
                    ? 'bg-accent/5'
                    : ''
            }`}
          >
            {showLineNumbers && (
              <span
                className="w-8 flex-none text-right pr-3 pt-0.5 text-[0.75em] text-text-faint/70
                           font-mono tabular-nums select-none leading-relaxed"
                aria-hidden
              >
                {blockIdx + 1}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <Block
                block={displayBlock}
                searchQuery={searchQuery}
                searchHit={!!searchQuery.trim() && matchSet.has(blockIdx)}
                index={sourceBlockIdx}
                listNumber={getNumberedListIndex(blocks, blockIdx)}
                focused={focusIdx === sourceBlockIdx && !lineSelection}
                cursorAt={focusIdx === sourceBlockIdx && !lineSelection ? focusCursorAt : undefined}
                spellCheck={spellCheck}
                onFocus={() => setFocusIdx(sourceBlockIdx)}
                onChange={updated => updateBlock(sourceBlockIdx, updated)}
                onDelete={() => deleteBlock(sourceBlockIdx)}
                onEnter={() => {
                  const cont = ['bullet','numbered'].includes(displayBlock.type) ? displayBlock.type : 'p'
                  insertAfter(sourceBlockIdx, cont)
                }}
                onArrowUp={() => focusBlock(Math.max(0, sourceBlockIdx - 1), 'end')}
                onArrowDown={() => focusBlock(Math.min(blocks.length - 1, sourceBlockIdx + 1), 'start')}
                onTypeChange={type => changeType(sourceBlockIdx, type)}
                onPasteMarkdown={(start, end, text) =>
                  handlePasteMarkdown(sourceBlockIdx, start, end, text)
                }
                activeNoteId={activeNoteId}
                onOpenNote={onOpenNote}
              />
            </div>
          </div>
          {!isLastVisible && (
            <div
              className="min-h-[1.25em] cursor-text"
              aria-hidden
              onMouseDown={(e) => {
                e.preventDefault()
                handleLineGapClick(sourceBlockIdx)
              }}
            />
          )}
          </div>
          )
        })}

        {/* Click-to-add below last block */}
        <div
          className="min-h-[4rem] cursor-text flex-1"
          onMouseDown={(e) => {
            e.preventDefault()
            const lastIdx = blocks.length - 1
            const last = blocks[lastIdx]
            if (last.content.trim()) {
              insertAfter(lastIdx, 'p', 'start')
            } else {
              focusBlock(lastIdx, 'start')
            }
          }}
        />
    </div>
  )

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={embedded ? 'relative outline-none' : 'flex-1 min-h-0 overflow-y-auto relative outline-none'}
    >
      {embedded ? blocksColumn : (
        <div style={viewportStyle}>
          {blocksColumn}
        </div>
      )}

      {slashMenu && (
        <SlashMenu
          position={slashMenu.position}
          query={slashMenu.query}
          onSelect={handleMenuSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </div>
  )
}
