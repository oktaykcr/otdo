import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GitBranch } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import useSettingsStore from '../../store/settingsStore'
import { SidebarOpenButton } from '../layout/SidebarToggle'
import { isMac } from '../../lib/platform'
import { MAC_TITLEBAR_HEIGHT, APP_HEADER_HEIGHT } from '../../lib/editorLayout'
import NoteGraphCanvas from './NoteGraphCanvas'

export default function GraphPage() {
  const navigate = useNavigate()
  const openNote = useNoteStore(s => s.openNote)
  const notes = useNoteStore(s => s.notes)
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

  const handleNodeClick = async (noteId) => {
    await openNote(noteId)
    navigate('/')
  }

  return (
    <div className="h-full flex flex-col bg-primary">
      {isMac && (
        <div className="flex-none titlebar" style={{ height: MAC_TITLEBAR_HEIGHT }} />
      )}

      <div
        className="flex-none flex items-center gap-3 px-4 border-b border-border bg-surface/50"
        style={{ height: APP_HEADER_HEIGHT }}
      >
        {!sidebarOpen && <SidebarOpenButton className={isMac ? 'ml-12' : ''} />}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm
                     text-text-muted hover:bg-surface2 hover:text-text transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={18} className="text-accent flex-none" />
          <h1 className="text-body-md font-semibold text-text truncate">Graph</h1>
        </div>
        <span className="ml-auto text-label text-text-faint tabular-nums">
          {notes.length} notes
        </span>
      </div>

      <div className="flex-1 min-h-0 bg-surface2/20">
        <NoteGraphCanvas onNodeClick={handleNodeClick} />
      </div>
    </div>
  )
}
