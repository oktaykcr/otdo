import { useState } from 'react'
import { Plus, X, Pin } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import { getNoteIcon } from '../../lib/noteIcons'
import { TAG_CONFIG } from '../common/ColorTag'
import EditorTabContextMenu from './EditorTabContextMenu'

export default function EditorTabBar({ paneId, isActivePane, onActivatePane }) {
  const notes = useNoteStore(s => s.notes)
  const noteDrafts = useNoteStore(s => s.noteDrafts)
  const pane = useNoteStore(s => s.panes[paneId])
  const activeTabId = pane?.activeTabId
  const selectTab = useNoteStore(s => s.selectTab)
  const addEditorTab = useNoteStore(s => s.addEditorTab)
  const closeEditorTab = useNoteStore(s => s.closeEditorTab)
  const closeAllEditorTabs = useNoteStore(s => s.closeAllEditorTabs)
  const pinEditorTab = useNoteStore(s => s.pinEditorTab)
  const splitPane = useNoteStore(s => s.splitPane)

  const [ctx, setCtx] = useState(null)

  if (!pane) return null

  const handleTabClick = (tabId) => {
    selectTab(paneId, tabId)
  }

  return (
    <>
      <div
        className={`flex items-center gap-0 border-b border-border overflow-x-auto flex-none min-h-[36px] ${
          isActivePane ? 'bg-primary' : 'bg-surface/80'
        }`}
        onMouseDown={() => onActivatePane?.()}
      >
        {pane.tabs.map(tab => {
          const note = tab.noteId ? notes.find(n => n.id === tab.noteId) : null
          const isActive = tab.id === activeTabId && isActivePane
          const isDirty = tab.noteId && noteDrafts[tab.noteId]?.isDirty
          const label = note?.name || 'Untitled'
          const tagCfg = note?.tag ? TAG_CONFIG[note.tag] : null
          const NoteIcon = note ? getNoteIcon(note.icon) : null
          const iconColor = tagCfg?.color || (isActive ? '#E2E8F0' : '#94A3B8')

          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                setCtx({ tabId: tab.id, x: e.clientX, y: rect.bottom + 2 })
              }}
              className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-2 border-r border-border cursor-pointer
                          transition-all flex-none max-w-[200px] ${
                isActive
                  ? 'bg-primary text-text border-b-2 border-b-accent -mb-px'
                  : 'bg-surface/60 text-text-muted hover:bg-surface2 hover:text-text'
              }`}
            >
              {tab.pinned && <Pin size={10} className="flex-none text-accent rotate-45" />}
              {NoteIcon && (
                <NoteIcon size={12} className="flex-none" style={{ color: iconColor }} strokeWidth={1.75} />
              )}
              <span className="text-body-sm truncate">{label}</span>
              {isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-none" />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeEditorTab(paneId, tab.id) }}
                className="p-0.5 rounded text-text-faint hover:text-text opacity-0 group-hover:opacity-100
                           flex-none transition-opacity"
                aria-label="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => { onActivatePane?.(); addEditorTab(paneId) }}
          className="flex-none p-2 mx-0.5 rounded-lg text-text-faint hover:text-text hover:bg-surface2 transition-colors"
          title="New tab"
          aria-label="New tab"
        >
          <Plus size={15} />
        </button>
      </div>

      {ctx && (
        <EditorTabContextMenu
          position={{ x: ctx.x, y: ctx.y }}
          isPinned={!!pane.tabs.find(t => t.id === ctx.tabId)?.pinned}
          onClose={() => setCtx(null)}
          onSplitRight={() => splitPane(paneId, 'right', ctx.tabId)}
          onSplitDown={() => splitPane(paneId, 'down', ctx.tabId)}
          onCloseTab={() => closeEditorTab(paneId, ctx.tabId)}
          onCloseAll={() => closeAllEditorTabs(paneId)}
          onPin={() => pinEditorTab(paneId, ctx.tabId)}
        />
      )}
    </>
  )
}
