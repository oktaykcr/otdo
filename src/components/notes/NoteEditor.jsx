import { useEffect, useCallback } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Save, Download, Cloud, CloudOff, X } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import useSettingsStore from '../../store/settingsStore'
import ColorTag from '../common/ColorTag'

export default function NoteEditor({ onExport }) {
  const activeNoteId = useNoteStore(s => s.activeNoteId)
  const activeContent = useNoteStore(s => s.activeContent)
  const isDirty = useNoteStore(s => s.isDirty)
  const openTabs = useNoteStore(s => s.openTabs)
  const notes = useNoteStore(s => s.notes)
  const setContent = useNoteStore(s => s.setContent)
  const saveNote = useNoteStore(s => s.saveNote)
  const openNote = useNoteStore(s => s.openNote)
  const closeTab = useNoteStore(s => s.closeTab)
  const updateNoteMeta = useNoteStore(s => s.updateNoteMeta)
  const gdConnected = useSettingsStore(s => s.gdConnected)

  // Keyboard shortcut: Ctrl/Cmd+S
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveNote()
    }
  }, [saveNote])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const activeNote = notes.find(n => n.id === activeNoteId)

  if (!activeNoteId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-faint gap-4">
        <div className="text-6xl opacity-20">📝</div>
        <div className="text-center">
          <p className="text-body-md mb-1">No note selected</p>
          <p className="text-body-sm">Create a note or select one from the sidebar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      {openTabs.length > 0 && (
        <div className="flex items-center gap-0 border-b border-border overflow-x-auto flex-none">
          {openTabs.map(tabId => {
            const note = notes.find(n => n.id === tabId)
            if (!note) return null
            const isActive = tabId === activeNoteId
            return (
              <div
                key={tabId}
                onClick={() => openNote(tabId)}
                className={`flex items-center gap-2 px-4 py-2.5 border-r border-border cursor-pointer transition-all flex-none max-w-48 ${
                  isActive
                    ? 'bg-primary text-text border-b-2 border-b-accent'
                    : 'bg-surface text-text-muted hover:bg-surface2 hover:text-text'
                }`}
              >
                <span className="text-body-sm truncate">{note.name}</span>
                {isDirty && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-none" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tabId) }}
                  className="text-text-faint hover:text-text flex-none ml-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface flex-none">
        <div className="flex items-center gap-3">
          <span className="text-body-sm font-medium text-text">{activeNote?.name}</span>
          {activeNote?.tag && <ColorTag tag={activeNote.tag} size="sm" />}
          {isDirty && <span className="text-label text-text-faint italic">Unsaved</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud sync toggle */}
          {gdConnected && (
            <button
              onClick={() => updateNoteMeta(activeNoteId, { cloudSync: !activeNote?.cloudSync })}
              title={activeNote?.cloudSync ? 'Syncing to Drive' : 'Not syncing'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm transition-all ${
                activeNote?.cloudSync
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-surface2 text-text-muted hover:bg-border'
              }`}
            >
              {activeNote?.cloudSync ? <Cloud size={14} /> : <CloudOff size={14} />}
              {activeNote?.cloudSync ? 'Synced' : 'Local'}
            </button>
          )}

          <button onClick={onExport} className="btn-ghost btn-sm">
            <Download size={14} />
            Export
          </button>

          <button
            onClick={saveNote}
            disabled={!isDirty}
            className={`btn-sm flex items-center gap-1.5 ${isDirty ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="dark">
        <MDEditor
          value={activeContent}
          onChange={setContent}
          preview="live"
          height="100%"
          style={{ height: '100%' }}
          visibleDragbar={false}
        />
      </div>
    </div>
  )
}
