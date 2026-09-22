import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Download, Save, Loader, Cloud, FileCode2, CheckSquare, Trash2, Copy } from 'lucide-react'
import EditorWorkspace from './EditorWorkspace'
import EditorSearchBar from './EditorSearchBar'
import EditorTodoControls from './EditorTodoControls'
import EditorNoteStats from './EditorNoteStats'
import EditorSplitView, { useSourcePanelWidth } from './EditorSplitView'
import EditorSourcePanel from './EditorSourcePanel'
import useNoteStore from '../../store/noteStore'
import useSettingsStore from '../../store/settingsStore'
import useTodoStore from '../../store/todoStore'
import ExportModal from '../notes/ExportModal'
import CanvasExportModal from '../canvas/CanvasExportModal'
import { isPersistBusy, editorActionLabel } from '../../lib/notePersistStatus'
import { parseBlocks } from '../../lib/blocks'
import { countNoteTodoBlocks } from '../../lib/noteTodoView'
import { findEditorMatches } from '../../lib/editorSearch'
import { isMac } from '../../lib/platform'
import { getActiveTabNoteId } from '../../lib/editorTabs'
import { EDITOR_TOOLBAR_HEIGHT, MAC_TITLEBAR_HEIGHT } from '../../lib/editorLayout'
import { SidebarOpenButton } from '../layout/SidebarToggle'
import { isCanvasNote } from '../../lib/noteCanvas'

export default function EditorPage() {
  const activePaneId  = useNoteStore(s => s.activePaneId)
  const panes         = useNoteStore(s => s.panes)
  const noteDrafts    = useNoteStore(s => s.noteDrafts)
  const activeNoteId  = useNoteStore(s => s.activeNoteId)
  const activeContent = useNoteStore(s => s.activeContent)
  const ensureNoteDraft = useNoteStore(s => s.ensureNoteDraft)
  const isDirty       = useNoteStore(s => s.isDirty)
  const persistStatus = useNoteStore(s => s.persistStatus)
  const persistError  = useNoteStore(s => s.persistError)
  const notes         = useNoteStore(s => s.notes)
  const saveNoteLocal   = useNoteStore(s => s.saveNoteLocal)
  const syncNote        = useNoteStore(s => s.syncNote)
  const editorLineNumbers = useSettingsStore(s => s.editorLineNumbers)
  const editorSpellCheck  = useSettingsStore(s => s.editorSpellCheck)
  const editorFontSize    = useSettingsStore(s => s.editorFontSize)
  const editorPaddingTop    = useSettingsStore(s => s.editorPaddingTop)
  const editorPaddingLeft   = useSettingsStore(s => s.editorPaddingLeft)
  const editorPaddingRight  = useSettingsStore(s => s.editorPaddingRight)
  const editorPaddingBottom = useSettingsStore(s => s.editorPaddingBottom)
  const editorMaxWidth      = useSettingsStore(s => s.editorMaxWidth)
  const editorAlign         = useSettingsStore(s => s.editorAlign)
  const editorShowBounds    = useSettingsStore(s => s.editorShowBounds)
  const editorAutoSaveMs    = useSettingsStore(s => s.editorAutoSaveMs)
  const gdAutoSyncMs        = useSettingsStore(s => s.gdAutoSyncMs)
  const gdConnected         = useSettingsStore(s => s.gdConnected)
  const sidebarOpen         = useSettingsStore(s => s.sidebarOpen)

  const [showExport,  setShowExport]  = useState(false)
  const [showSource,  setShowSource]  = useState(false)
  const [sourcePanelWidth, setSourcePanelWidth] = useSourcePanelWidth()
  const [selectionLength, setSelectionLength] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [searchNavigate, setSearchNavigate] = useState(false)
  const searchInputRef = useRef(null)
  const selectionApiRef = useRef(null)
  const todos = useTodoStore(s => s.todos)

  const activeTabNoteId = useMemo(
    () => getActiveTabNoteId({ panes, activePaneId }),
    [panes, activePaneId]
  )

  const toolbarNoteContent = useMemo(() => {
    if (!activeTabNoteId) return ''
    const draft = noteDrafts[activeTabNoteId]?.content
    if (draft != null) return draft
    if (activeNoteId === activeTabNoteId && activeContent) return activeContent
    return ''
  }, [activeTabNoteId, noteDrafts, activeNoteId, activeContent])

  const activeNote = useMemo(
    () => notes.find(n => n.id === activeTabNoteId) || null,
    [notes, activeTabNoteId]
  )
  const isCanvas = isCanvasNote(activeNote)

  useEffect(() => {
    if (activeTabNoteId) ensureNoteDraft(activeTabNoteId)
  }, [activeTabNoteId, ensureNoteDraft])

  useEffect(() => {
    setSearchQuery('')
    setMatchIndex(0)
    setSearchNavigate(false)
    if (isCanvas) setShowSource(false)
  }, [activeTabNoteId, isCanvas])

  useEffect(() => {
    setMatchIndex(0)
    setSearchNavigate(false)
  }, [searchQuery])

  const searchBlocks = useMemo(
    () => (!isCanvas && toolbarNoteContent ? parseBlocks(toolbarNoteContent) : []),
    [toolbarNoteContent, isCanvas]
  )

  const noteTodoCount = useMemo(
    () => (isCanvas ? 0 : countNoteTodoBlocks(searchBlocks)),
    [searchBlocks, isCanvas]
  )

  const matches = useMemo(
    () => (!isCanvas && searchQuery.trim()
      ? findEditorMatches(searchBlocks, searchQuery, todos, activeNote?.tags || [])
      : []),
    [searchBlocks, searchQuery, todos, activeNote?.tags, isCanvas]
  )

  const goNextMatch = useCallback(() => {
    if (!matches.length) return
    setSearchNavigate(prevNav => {
      setMatchIndex(i => (prevNav ? i + 1 : 0))
      return true
    })
  }, [matches.length])

  const goPrevMatch = useCallback(() => {
    if (!matches.length) return
    setSearchNavigate(prevNav => {
      setMatchIndex(i => (prevNav ? i - 1 : matches.length - 1))
      return true
    })
  }, [matches.length])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setMatchIndex(0)
    setSearchNavigate(false)
  }, [])

  const blurSearchInput = useCallback(() => {
    if (document.activeElement === searchInputRef.current) {
      searchInputRef.current.blur()
    }
  }, [])

  useEffect(() => {
    if (!isDirty || !editorAutoSaveMs || !activeTabNoteId) return
    const t = setTimeout(() => {
      const note = useNoteStore.getState().getActiveNote()
      saveNoteLocal({ quiet: !!note?.cloudSync })
    }, editorAutoSaveMs)
    return () => clearTimeout(t)
  }, [toolbarNoteContent, isDirty, saveNoteLocal, editorAutoSaveMs, activeTabNoteId])

  useEffect(() => {
    if (!isDirty || !gdAutoSyncMs || !gdConnected || !activeTabNoteId) return
    const note = useNoteStore.getState().getActiveNote()
    if (!note?.cloudSync) return
    const t = setTimeout(() => syncNote(), gdAutoSyncMs)
    return () => clearTimeout(t)
  }, [toolbarNoteContent, isDirty, syncNote, gdAutoSyncMs, gdConnected, activeTabNoteId])

  useEffect(() => {
    const flush = () => {
      const state = useNoteStore.getState()
      if (!state.isDirty || !state.activeNoteId) return
      const note = state.getActiveNote()
      if (note?.cloudSync) state.syncNote()
      else state.saveNoteLocal()
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const handleManualSave = useCallback(async () => {
    if (!activeTabNoteId) return
    if (activeNote?.cloudSync) await syncNote()
    else await saveNoteLocal()
  }, [activeTabNoteId, activeNote?.cloudSync, syncNote, saveNoteLocal])

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleManualSave() }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [handleManualSave])

  useEffect(() => {
    const h = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'f') return
      e.preventDefault()
      e.stopPropagation()
      if (!activeTabNoteId || isCanvasNote(useNoteStore.getState().notes.find(n => n.id === activeTabNoteId))) return
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
    document.addEventListener('keydown', h, true)
    return () => document.removeEventListener('keydown', h, true)
  }, [activeTabNoteId])

  useEffect(() => {
    const h = (e) => {
      const id = e.detail
      const el = document.querySelector(`[data-todo-id="${id}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    window.addEventListener('otdo:select-todo', h)
    return () => window.removeEventListener('otdo:select-todo', h)
  }, [])

  const persistBusy = isPersistBusy(persistStatus)
  const isCloudNote = !!activeNote?.cloudSync
  const actionLabel = editorActionLabel({
    cloudSync: isCloudNote,
    isDirty,
    persistStatus,
    persistError,
  })

  const editorSettings = {
    lineNumbers: editorLineNumbers,
    spellCheck: editorSpellCheck,
    fontSize: editorFontSize,
    paddingTop: editorPaddingTop,
    paddingLeft: editorPaddingLeft,
    paddingRight: editorPaddingRight,
    paddingBottom: editorPaddingBottom,
    maxWidth: editorMaxWidth,
    align: editorAlign,
    showBounds: editorShowBounds,
  }

  const handleSelectAllLines = useCallback(() => {
    selectionApiRef.current?.selectAll?.()
  }, [])

  const handleRemoveAllLines = useCallback(() => {
    selectionApiRef.current?.removeAll?.()
  }, [])

  const handleCopyLines = useCallback(async () => {
    try {
      await selectionApiRef.current?.copy?.()
    } catch (err) {
      alert(err?.message || 'Could not copy')
    }
  }, [])

  const workspace = (
    <EditorWorkspace
      onSelectionLengthChange={setSelectionLength}
      todos={todos}
      editorSettings={editorSettings}
      searchQuery={searchQuery}
      matchIndex={matchIndex}
      searchNavigate={searchNavigate}
      selectionApiRef={selectionApiRef}
    />
  )

  return (
    <div className="flex flex-col h-full">
      {isMac && (
        <div className="flex-none titlebar" style={{ height: MAC_TITLEBAR_HEIGHT }} />
      )}
      <div className="border-b border-border bg-primary/80 backdrop-blur-sm flex-none">
        <div
          className="no-drag flex items-center gap-4 px-6 flex-none"
          style={{ height: EDITOR_TOOLBAR_HEIGHT }}
        >
          {!sidebarOpen && (
            <SidebarOpenButton className="flex-none" />
          )}

          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            {!isCanvas && (
              <EditorSearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                matchCount={matches.length}
                matchIndex={matchIndex}
                onNext={goNextMatch}
                onPrev={goPrevMatch}
                onClear={clearSearch}
                inputRef={searchInputRef}
                disabled={!activeTabNoteId}
              />
            )}
            {noteTodoCount > 0 && (
              <EditorTodoControls />
            )}
          </div>

          <div className="flex items-center gap-1 flex-none no-drag">
            {!isCanvas && (
              <>
                <button
                  type="button"
                  onClick={handleSelectAllLines}
                  disabled={!activeTabNoteId}
                  title="Select all lines"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-label text-text-faint
                             hover:bg-surface hover:text-text transition-all disabled:opacity-40"
                >
                  <CheckSquare size={13} />
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAllLines}
                  disabled={!activeTabNoteId}
                  title="Remove selected lines (or all if none selected)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-label text-text-faint
                             hover:bg-surface hover:text-tag-important transition-all disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Remove all
                </button>
                <button
                  type="button"
                  onClick={handleCopyLines}
                  disabled={!activeTabNoteId}
                  title="Copy selected lines (or all if none selected)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-label text-text-faint
                             hover:bg-surface hover:text-text transition-all disabled:opacity-40"
                >
                  <Copy size={13} />
                  Copy
                </button>
                <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
              </>
            )}

            <button
              onClick={handleManualSave}
              disabled={!activeTabNoteId || (isCloudNote ? persistBusy : (!isDirty && !persistBusy)) || persistBusy}
              title={isCloudNote ? 'Sync to Google Drive' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label transition-all ${
                persistBusy
                  ? 'text-accent cursor-wait'
                  : isCloudNote || isDirty
                    ? 'text-accent hover:bg-accent/10'
                    : 'text-text-faint cursor-default'
              }`}
            >
              {persistBusy
                ? <Loader size={13} className="animate-spin" />
                : isCloudNote
                  ? <Cloud size={13} />
                  : <Save size={13} />}
              {actionLabel}
            </button>

            {!isCanvas && (
              <button
                onClick={() => setShowSource(s => !s)}
                disabled={!activeTabNoteId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label transition-all ${
                  showSource
                    ? 'text-accent bg-accent/10'
                    : 'text-text-faint hover:bg-surface hover:text-text disabled:opacity-40'
                }`}
                title={showSource ? 'Close source view' : 'Open source view'}
              >
                <FileCode2 size={13} />
                Source
              </button>
            )}

            <button
              onClick={() => setShowExport(true)}
              disabled={!activeTabNoteId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label text-text-faint
                         hover:bg-surface hover:text-text transition-all disabled:opacity-40"
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        onMouseDownCapture={blurSearchInput}
      >
        {showSource && activeTabNoteId && !isCanvas ? (
          <EditorSplitView
            sideWidth={sourcePanelWidth}
            onSideWidthChange={setSourcePanelWidth}
            main={workspace}
            side={
              <EditorSourcePanel
                value={toolbarNoteContent || ''}
                onClose={() => setShowSource(false)}
                editorFontSize={editorFontSize}
              />
            }
          />
        ) : (
          workspace
        )}

        {!isCanvas && (
          <EditorNoteStats
            content={toolbarNoteContent}
            selectionLength={selectionLength}
            createdAt={activeNote?.createdAt}
            updatedAt={activeNote?.updatedAt}
          />
        )}
      </div>

      {isCanvas ? (
        <CanvasExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          content={toolbarNoteContent}
          title={activeNote?.name || 'canvas'}
        />
      ) : (
        <ExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          content={toolbarNoteContent}
          title={activeNote?.name || 'note'}
        />
      )}
    </div>
  )
}
