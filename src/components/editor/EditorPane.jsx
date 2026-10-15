import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import BlockEditor from './BlockEditor'
import EditorTabBar from './EditorTabBar'
import NoteTagsBar from './NoteTagsBar'
import CanvasEditor from '../canvas/CanvasEditor'
import useNoteStore from '../../store/noteStore'
import { parseBlocks, serializeBlocks } from '../../lib/blocks'
import { findEditorMatches } from '../../lib/editorSearch'
import { useEditorHistory } from '../../lib/useEditorHistory'
import AppLogo from '../common/AppLogo'
import { buildEditorViewportStyle, buildEditorColumnStyle } from '../../lib/editorLayout'
import { EMPTY_TAB_SHORTCUTS, shortcutLabel } from '../../lib/keyboardShortcuts'
import { isCanvasNote } from '../../lib/noteCanvas'

export default function EditorPane({
  paneId,
  isActivePane,
  onActivatePane,
  onSelectionLengthChange,
  todos = [],
  editorSettings = {},
  searchQuery = '',
  matchIndex = 0,
  searchNavigate = false,
  selectionApiRef = null,
}) {
  const pane = useNoteStore(s => s.panes[paneId])
  const notes = useNoteStore(s => s.notes)
  const noteDrafts = useNoteStore(s => s.noteDrafts)
  const setNoteDraft = useNoteStore(s => s.setNoteDraft)
  const ensureNoteDraft = useNoteStore(s => s.ensureNoteDraft)
  const openNote = useNoteStore(s => s.openNote)
  const addNoteTag = useNoteStore(s => s.addNoteTag)
  const removeNoteTag = useNoteStore(s => s.removeNoteTag)
  const renameNoteTag = useNoteStore(s => s.renameNoteTag)
  const updateNoteMeta = useNoteStore(s => s.updateNoteMeta)

  const activeTab = pane?.tabs.find(t => t.id === pane.activeTabId)
  const noteId = activeTab?.noteId || null
  const activeNote = noteId ? notes.find(n => n.id === noteId) : null
  const noteTags = activeNote?.tags || []
  const isCanvas = isCanvasNote(activeNote)

  const [blocks, setBlocks] = useState([])
  const editingNoteId = useRef(null)

  const applyDraft = useCallback((newBlocks) => {
    setBlocks(newBlocks)
    if (noteId) setNoteDraft(noteId, serializeBlocks(newBlocks))
  }, [noteId, setNoteDraft])

  const { setBlocksWithHistory, undo, redo, reset: resetHistory } = useEditorHistory(blocks, applyDraft)

  const handleCanvasChange = useCallback((raw) => {
    if (noteId) setNoteDraft(noteId, raw)
  }, [noteId, setNoteDraft])

  useLayoutEffect(() => {
    if (!noteId || isCanvas) {
      editingNoteId.current = null
      setBlocks([])
      resetHistory()
      return
    }
    if (editingNoteId.current === noteId) return

    editingNoteId.current = noteId
    resetHistory()

    const draftContent = useNoteStore.getState().noteDrafts[noteId]?.content
    if (draftContent == null) {
      setBlocks([])
      return
    }

    const fallback = `# ${notes.find(n => n.id === noteId)?.name || 'Untitled'}\n\n`
    setBlocks(parseBlocks(draftContent || fallback))
  }, [noteId, notes, resetHistory, isCanvas])

  useEffect(() => {
    if (!noteId || isCanvas) return
    const draftContent = noteDrafts[noteId]?.content
    if (draftContent == null) {
      ensureNoteDraft(noteId)
      return
    }
    if (editingNoteId.current !== noteId) return
    setBlocks(prev => (prev.length === 0 ? parseBlocks(draftContent) : prev))
  }, [noteId, noteDrafts, ensureNoteDraft, isCanvas])

  const matches = useMemo(
    () => (isActivePane && searchQuery.trim() && !isCanvas
      ? findEditorMatches(blocks, searchQuery, todos, noteTags)
      : []),
    [blocks, searchQuery, todos, noteTags, isActivePane, isCanvas]
  )

  const activeMatch = isActivePane && searchNavigate && matches.length > 0
    ? matches[((matchIndex % matches.length) + matches.length) % matches.length]
    : null

  const activeTagIdx = activeMatch?.field?.startsWith('tag-')
    ? Number(activeMatch.field.slice(4))
    : null

  const matchBlockIndices = isActivePane && searchQuery.trim() && matches.length
    ? [...new Set(matches.map(m => m.blockIdx).filter(idx => idx >= 0))]
    : []

  useEffect(() => {
    if (!isActivePane || !noteId || isCanvas) return

    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }
      if (e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [isActivePane, noteId, undo, redo, isCanvas])

  if (!pane) return null

  const {
    lineNumbers = false,
    spellCheck = false,
    fontSize = 'md',
    paddingTop = 48,
    paddingLeft = 32,
    paddingRight = 32,
    paddingBottom = 128,
    maxWidth = 'md',
    align = 'center',
    showBounds = false,
  } = editorSettings

  const viewportStyle = buildEditorViewportStyle({
    paddingTop,
    paddingLeft,
    paddingRight,
    paddingBottom,
    align,
  })
  const columnStyle = buildEditorColumnStyle({ maxWidth })

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden" onMouseDown={onActivatePane}>
      <EditorTabBar
        paneId={paneId}
        isActivePane={isActivePane}
        onActivatePane={onActivatePane}
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!noteId ? (
          <div className="h-full flex items-center justify-center text-text-faint select-none p-6">
            <div className="text-center space-y-4 max-w-xs w-full">
              <AppLogo size={40} className="mx-auto opacity-30" />
              <div className="space-y-1">
                <p className="text-body-sm font-medium text-text-muted">Empty tab</p>
                <p className="text-label opacity-60">
                  Select a note from the sidebar to open it here
                </p>
              </div>
              <div className="pt-3 border-t border-border/60 space-y-2 text-left">
                <p className="text-[10px] uppercase tracking-wider text-text-faint text-center mb-2">
                  Shortcuts
                </p>
                {EMPTY_TAB_SHORTCUTS.map(({ description, mac, win }) => (
                  <div
                    key={description}
                    className="flex items-center justify-between gap-3 text-label"
                  >
                    <span className="text-text-faint truncate">{description}</span>
                    <kbd className="flex-none text-[10px] text-text-faint bg-surface2 px-1.5 py-0.5 rounded border border-border font-mono">
                      {shortcutLabel({ mac, win })}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isCanvas ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-none px-4 pt-3">
              <NoteTagsBar
                tags={noteTags}
                searchQuery=""
                activeTagIdx={null}
                onAdd={tag => addNoteTag(noteId, tag)}
                onRemove={tag => removeNoteTag(noteId, tag)}
                onRename={(oldTag, newTag) => renameNoteTag(noteId, oldTag, newTag)}
                reminder={activeNote?.reminder}
                onReminderChange={reminder => updateNoteMeta(noteId, { reminder })}
                pinned={!!activeNote?.pinned}
                onPinToggle={() => updateNoteMeta(noteId, { pinned: !activeNote?.pinned })}
              />
            </div>
            <div className="flex-1 min-h-0">
              <CanvasEditor
                key={`${paneId}-${noteId}`}
                content={noteDrafts[noteId]?.content ?? ''}
                onChange={handleCanvasChange}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div style={viewportStyle}>
              <div style={columnStyle}>
                <NoteTagsBar
                  tags={noteTags}
                  searchQuery={isActivePane ? searchQuery : ''}
                  activeTagIdx={isActivePane ? activeTagIdx : null}
                  onAdd={tag => addNoteTag(noteId, tag)}
                  onRemove={tag => removeNoteTag(noteId, tag)}
                  onRename={(oldTag, newTag) => renameNoteTag(noteId, oldTag, newTag)}
                  reminder={activeNote?.reminder}
                  onReminderChange={reminder => updateNoteMeta(noteId, { reminder })}
                  pinned={!!activeNote?.pinned}
                  onPinToggle={() => updateNoteMeta(noteId, { pinned: !activeNote?.pinned })}
                />
                <BlockEditor
                  key={`${paneId}-${noteId}`}
                  blocks={blocks}
                  onChange={setBlocksWithHistory}
                  showLineNumbers={lineNumbers}
                  spellCheck={spellCheck}
                  fontSize={fontSize}
                  paddingTop={0}
                  paddingLeft={0}
                  paddingRight={0}
                  paddingBottom={paddingBottom}
                  maxWidth={maxWidth}
                  align={align}
                  showBounds={showBounds}
                  activeMatch={activeMatch}
                  matchBlockIndices={matchBlockIndices}
                  searchQuery={isActivePane ? searchQuery : ''}
                  onSelectionLengthChange={isActivePane ? onSelectionLengthChange : undefined}
                  activeNoteId={noteId}
                  onOpenNote={openNote}
                  embedded
                  isActiveEditor={isActivePane}
                  selectionApiRef={isActivePane ? selectionApiRef : null}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
