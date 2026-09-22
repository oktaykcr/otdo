import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FolderOpen, Folder, Plus, Settings, HardDrive, Cloud, GitBranch, Bell,
  ChevronRight, ChevronDown, Trash2, ArrowRight, ArrowLeft, Loader, Pin,
  LayoutDashboard, CircleHelp, FoldVertical, UnfoldVertical, RotateCcw,
} from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import useSettingsStore from '../../store/settingsStore'
import useNotificationStore from '../../store/notificationStore'
import useGamificationStore from '../../store/gamificationStore'
import { progressInLevel, titleForLevel } from '../../lib/gamification'
import { TAG_CONFIG } from '../common/ColorTag'
import { NoteAppearancePicker, TagColorPicker } from '../common/NoteAppearancePicker'
import { getNoteIcon } from '../../lib/noteIcons'
import Modal from '../common/Modal'
import NewNoteModal from '../notes/NewNoteModal'
import SidebarCalendar from './SidebarCalendar'

import { isMac } from '../../lib/platform'
import { MAC_TITLEBAR_HEIGHT, SIDEBAR_BRAND_HEIGHT, EDITOR_META_HEIGHT } from '../../lib/editorLayout'
import { notesInFolder, foldersInParent, isFolderDescendant, compareNotes } from '../../lib/noteOrder'
import { trashedNotes, daysUntilPurge } from '../../lib/noteTrash'
import { SidebarCloseButton } from './SidebarToggle'
import AppLogo from '../common/AppLogo'
const NOTE_DRAG_TYPE = 'application/x-otdo-note-id'
const FOLDER_DRAG_TYPE = 'application/x-otdo-folder-id'

function isNoteDrag(e) {
  return e.dataTransfer.types.includes(NOTE_DRAG_TYPE)
}

function isFolderDrag(e) {
  return e.dataTransfer.types.includes(FOLDER_DRAG_TYPE)
}

function getFolderDropHint(e, element) {
  const rect = element.getBoundingClientRect()
  const ratio = (e.clientY - rect.top) / rect.height
  if (ratio < 0.25) return 'before'
  if (ratio > 0.75) return 'after'
  return 'inside'
}

function isLocalNote(note) {
  return !note.cloudSync
}

function MoveToFolderSection({ note, onClose }) {
  const folders = useNoteStore(s => s.folders)
  const moveNoteToFolder = useNoteStore(s => s.moveNoteToFolder)
  const [moving, setMoving] = useState(false)

  const handleMove = async (folderId) => {
    setMoving(true)
    await moveNoteToFolder(note.id, folderId)
    setMoving(false)
    onClose()
  }

  const renderFolder = (folder, depth = 0) => {
    const isCurrent = note.folderId === folder.id
    return (
      <div key={folder.id}>
        <button
          type="button"
          disabled={moving || isCurrent}
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleMove(folder.id)}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          className={`w-full flex items-center gap-2 py-1.5 pr-2 rounded-lg text-body-sm text-left transition-colors ${
            isCurrent
              ? 'text-accent bg-accent/10 cursor-default'
              : 'text-text-muted hover:bg-surface2 hover:text-text'
          }`}
        >
          <Folder size={12} className="flex-none" />
          <span className="truncate">{folder.name}</span>
        </button>
        {folders.filter(f => f.parentId === folder.id).map(f => renderFolder(f, depth + 1))}
      </div>
    )
  }

  const rootFolders = folders.filter(f => !f.parentId)
  const hasFolders = rootFolders.length > 0

  if (!hasFolders && note.folderId) {
    return (
      <div className="px-3 py-2 border-t border-border">
        <button
          type="button"
          disabled={moving}
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleMove(null)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm
                     text-text-muted hover:bg-surface2 transition-colors text-left"
        >
          Move to root
        </button>
      </div>
    )
  }

  if (!hasFolders) return null

  return (
    <div className="px-3 py-2 border-t border-border">
      <span className="text-label text-text-faint block mb-1.5 px-1">Move to folder</span>
      <div className="max-h-36 overflow-y-auto space-y-0.5">
        {note.folderId && (
          <button
            type="button"
            disabled={moving}
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleMove(null)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-body-sm
                       text-text-muted hover:bg-surface2 transition-colors text-left"
          >
            <HardDrive size={12} className="flex-none" />
            Root (no folder)
          </button>
        )}
        {rootFolders.map(f => renderFolder(f))}
      </div>
    </div>
  )
}

// ── Context menu ─────────────────────────────────────────────────────────────

function NoteContextMenu({ noteId, position, onClose, gdConnected }) {
  const note = useNoteStore(s => s.notes.find(n => n.id === noteId))
  const updateNoteMeta = useNoteStore(s => s.updateNoteMeta)
  const moveNoteToDrive = useNoteStore(s => s.moveNoteToDrive)
  const syncNoteById = useNoteStore(s => s.syncNoteById)
  const moveNoteToLocal = useNoteStore(s => s.moveNoteToLocal)
  const [name, setName] = useState('')
  const [moving, setMoving] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (note) setName(note.name)
  }, [note?.name, note])

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  if (!note) return null

  const applyName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== note.name) updateNoteMeta(note.id, { name: trimmed })
    onClose()
  }

  const setAppearance = (patch) => updateNoteMeta(note.id, patch)

  const handleTogglePin = () => {
    updateNoteMeta(note.id, { pinned: !note.pinned })
    onClose()
  }

  const handleMoveToDrive = async () => {
    setMoving('drive')
    await moveNoteToDrive(note.id)
    setMoving(null)
    onClose()
  }

  const handleSyncToDrive = async () => {
    setMoving('sync')
    const result = await syncNoteById(note.id)
    setMoving(null)
    if (!result.ok && result.error) alert(result.error)
    onClose()
  }

  const handleMoveToLocal = async () => {
    setMoving('local')
    await moveNoteToLocal(note.id)
    setMoving(null)
    onClose()
  }

  const menuStyle = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 480),
    left: Math.min(position.x, window.innerWidth - 300),
    zIndex: 9999,
    width: 288,
    maxHeight: 460,
    overflowY: 'auto',
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-surface border border-border rounded-xl shadow-modal overflow-hidden animate-scale-in"
      onContextMenu={e => e.preventDefault()}
    >
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <label className="text-label text-text-faint block mb-1">Rename</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') applyName()
            if (e.key === 'Escape') onClose()
          }}
          onBlur={applyName}
          className="w-full bg-surface2 text-body-sm text-text rounded-lg px-2.5 py-1.5
                     border border-border focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="px-3 py-3 border-b border-border">
        <NoteAppearancePicker
          icon={note.icon}
          tag={note.tag}
          onIconChange={icon => setAppearance({ icon: icon === 'file-text' ? null : icon })}
          onTagChange={tag => setAppearance({ tag })}
        />
      </div>

      <div className="px-3 py-2 border-b border-border">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={handleTogglePin}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm
                      transition-colors text-left ${
                        note.pinned
                          ? 'text-accent hover:bg-accent/10'
                          : 'text-text-muted hover:bg-surface2 hover:text-text'
                      }`}
        >
          <Pin size={14} className={note.pinned ? 'rotate-45' : ''} />
          {note.pinned ? 'Unpin note' : 'Pin note'}
        </button>
      </div>

      {isLocalNote(note) && (
        <MoveToFolderSection note={note} onClose={onClose} />
      )}

      {gdConnected && (
        <div className="px-3 py-2 space-y-1">
          {isLocalNote(note) ? (
            <button
              type="button"
              disabled={!!moving}
              onMouseDown={e => e.preventDefault()}
              onClick={handleMoveToDrive}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm
                         text-blue-400 hover:bg-blue-500/10 transition-colors text-left disabled:opacity-60"
            >
              {moving === 'drive'
                ? <Loader size={14} className="animate-spin" />
                : <ArrowRight size={14} />}
              {moving === 'drive' ? 'Syncing to Drive…' : 'Move to Google Drive'}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!!moving}
                onMouseDown={e => e.preventDefault()}
                onClick={handleSyncToDrive}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm
                           text-blue-400 hover:bg-blue-500/10 transition-colors text-left disabled:opacity-60"
              >
                {moving === 'sync'
                  ? <Loader size={14} className="animate-spin" />
                  : <Cloud size={14} />}
                {moving === 'sync' ? 'Syncing to Drive…' : 'Sync to Google Drive'}
              </button>
              <button
                type="button"
                disabled={!!moving}
                onMouseDown={e => e.preventDefault()}
                onClick={handleMoveToLocal}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm
                           text-text-muted hover:bg-surface2 transition-colors text-left disabled:opacity-60"
              >
                {moving === 'local'
                  ? <Loader size={14} className="animate-spin" />
                  : <ArrowLeft size={14} />}
                {moving === 'local' ? 'Moving…' : 'Move to Local'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FolderContextMenu({ folderId, position, onClose }) {
  const folder = useNoteStore(s => s.folders.find(f => f.id === folderId))
  const updateFolder = useNoteStore(s => s.updateFolder)
  const [name, setName] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    if (folder) setName(folder.name)
  }, [folder?.name, folder])

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  if (!folder) return null

  const applyName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== folder.name) updateFolder(folder.id, { name: trimmed })
    onClose()
  }

  const menuStyle = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 320),
    left: Math.min(position.x, window.innerWidth - 300),
    zIndex: 9999,
    width: 288,
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-surface border border-border rounded-xl shadow-modal overflow-hidden animate-scale-in"
      onContextMenu={e => e.preventDefault()}
    >
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <label className="text-label text-text-faint block mb-1">Rename</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') applyName()
            if (e.key === 'Escape') onClose()
          }}
          onBlur={applyName}
          className="w-full bg-surface2 text-body-sm text-text rounded-lg px-2.5 py-1.5
                     border border-border focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="px-3 py-3">
        <TagColorPicker
          tag={folder.tag}
          onChange={tag => updateFolder(folder.id, { tag })}
          Icon={Folder}
        />
      </div>
    </div>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────

function NewFolderModal({ open, onClose, parentId }) {
  const [name, setName] = useState('')
  const [tag, setTag]   = useState(null)
  const addFolder = useNoteStore(s => s.addFolder)

  useEffect(() => {
    if (open) { setName(''); setTag(null) }
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addFolder({ name: name.trim(), parentId, tag })
    setName(''); setTag(null); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Folder" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label block mb-1.5">Folder name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="My folder" autoFocus required />
        </div>
        <TagColorPicker tag={tag} onChange={setTag} Icon={Folder} />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 btn-sm">Cancel</button>
          <button type="submit" className="btn-primary flex-1 btn-sm">Create</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Note / Folder rows ───────────────────────────────────────────────────────

function FolderListEndDropZone({ parentId, depth, onReorderFolder }) {
  const [active, setActive] = useState(false)

  const handleDragOver = (e) => {
    if (!isFolderDrag(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setActive(true)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setActive(false)
    const folderId = e.dataTransfer.getData(FOLDER_DRAG_TYPE)
    if (!folderId) return
    await onReorderFolder(folderId, { parentId, referenceFolderId: null, position: 'end' })
  }

  return (
    <div
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      className={`h-2 transition-colors ${active ? 'bg-accent/20' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    />
  )
}

function NoteListEndDropZone({ folderId, depth, onReorder }) {
  const [active, setActive] = useState(false)

  const handleDragOver = (e) => {
    if (!isNoteDrag(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setActive(true)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setActive(false)
    const noteId = e.dataTransfer.getData(NOTE_DRAG_TYPE)
    if (!noteId) return
    await onReorder(noteId, { folderId, referenceNoteId: null, position: 'end' })
  }

  return (
    <div
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      className={`h-2 transition-colors ${active ? 'bg-accent/20' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    />
  )
}

function NoteRow({
  note, depth, folderId, onContextMenu, onOpenNote, onReorder,
  showMoveToDrive, showMoveToLocal, showSyncDrive, draggable,
}) {
  const activeNoteId = useNoteStore(s => s.activeNoteId)
  const deleteNote   = useNoteStore(s => s.deleteNote)
  const updateNoteMeta = useNoteStore(s => s.updateNoteMeta)
  const moveNoteToDrive = useNoteStore(s => s.moveNoteToDrive)
  const syncNoteById = useNoteStore(s => s.syncNoteById)
  const moveNoteToLocal = useNoteStore(s => s.moveNoteToLocal)
  const [syncing, setSyncing] = useState(false)
  const [dropHint, setDropHint] = useState(null)
  const tagCfg       = note.tag ? TAG_CONFIG[note.tag] : null
  const isActive     = note.id === activeNoteId
  const isPinned     = !!note.pinned
  const iconColor    = tagCfg?.color || '#E2E8F0'
  const NoteIcon     = getNoteIcon(note.icon)

  const handleSync = async (e) => {
    e.stopPropagation()
    setSyncing(true)
    const result = await syncNoteById(note.id)
    setSyncing(false)
    if (!result.ok && result.error) alert(result.error)
  }

  const handleDragOver = (e) => {
    if (!draggable || !e.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    setDropHint(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
  }

  const handleDrop = async (e) => {
    if (!draggable) return
    e.preventDefault()
    e.stopPropagation()
    const noteId = e.dataTransfer.getData(NOTE_DRAG_TYPE)
    const position = dropHint || 'after'
    setDropHint(null)
    if (!noteId || noteId === note.id) return
    await onReorder(noteId, { folderId, referenceNoteId: note.id, position })
  }

  return (
    <div
      draggable={draggable}
      onDragStart={e => {
        if (!draggable) return
        e.dataTransfer.setData(NOTE_DRAG_TYPE, note.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={() => setDropHint(null)}
      onClick={() => onOpenNote(note.id)}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, note) }}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      className={`relative flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer group transition-all ${
        isActive ? 'bg-accent/15' : 'hover:bg-surface2'
      } ${dropHint === 'before' ? 'border-t-2 border-accent' : ''} ${dropHint === 'after' ? 'border-b-2 border-accent' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={() => setDropHint(null)}
      onDrop={handleDrop}
    >
      <NoteIcon size={13} className="flex-none" style={{ color: iconColor }} />
      <span className={`text-body-sm truncate flex-1 leading-tight ${isActive ? 'text-text font-medium' : 'text-text'}`}>
        {note.name}
      </span>
      <button
        type="button"
        title={isPinned ? 'Unpin note' : 'Pin note'}
        onClick={e => {
          e.stopPropagation()
          updateNoteMeta(note.id, { pinned: !isPinned })
        }}
        className={`p-0.5 rounded flex-none transition-colors ${
          isPinned
            ? 'flex text-accent hover:text-accent/80'
            : 'hidden group-hover:flex text-text-faint hover:text-accent'
        }`}
      >
        <Pin size={11} className={isPinned ? 'rotate-45' : ''} />
      </button>
      {showSyncDrive && (
        <button
          type="button"
          title="Sync to Google Drive"
          disabled={syncing}
          onClick={handleSync}
          className="hidden group-hover:flex p-0.5 rounded text-text-faint hover:text-blue-400 flex-none disabled:opacity-60"
        >
          {syncing ? <Loader size={11} className="animate-spin" /> : <Cloud size={11} />}
        </button>
      )}
      {showMoveToDrive && (
        <button
          type="button"
          title="Move to Google Drive"
          onClick={e => { e.stopPropagation(); moveNoteToDrive(note.id) }}
          className="hidden group-hover:flex p-0.5 rounded text-text-faint hover:text-blue-400 flex-none"
        >
          <ArrowRight size={11} />
        </button>
      )}
      {showMoveToLocal && (
        <button
          type="button"
          title="Move to Local"
          onClick={e => { e.stopPropagation(); moveNoteToLocal(note.id) }}
          className="hidden group-hover:flex p-0.5 rounded text-text-faint hover:text-text flex-none"
        >
          <ArrowLeft size={11} />
        </button>
      )}
      <button
        onClick={e => {
          e.stopPropagation()
          if (window.confirm(`Move "${note.name}" to Trash?`)) deleteNote(note.id)
        }}
        className="hidden group-hover:flex p-0.5 rounded text-text-faint hover:text-tag-important flex-none"
        title="Move to Trash"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

function TrashSection() {
  const [open, setOpen] = useState(false)
  const notes = useNoteStore(s => s.notes)
  const restoreNote = useNoteStore(s => s.restoreNote)
  const permanentlyDeleteNote = useNoteStore(s => s.permanentlyDeleteNote)
  const emptyTrash = useNoteStore(s => s.emptyTrash)
  const retentionDays = useSettingsStore(s => s.trashRetentionDays)
  const items = useMemo(() => trashedNotes(notes), [notes])

  if (items.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left rounded-lg hover:bg-surface2 px-0.5 py-0.5"
        >
          <span className="text-text-faint flex-none">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          <Trash2 size={12} className="text-text-faint flex-none" />
          <span className="text-label text-text-faint truncate">Trash</span>
          <span className="text-label text-text-faint tabular-nums">{items.length}</span>
        </button>
        <button
          type="button"
          title="Empty Trash"
          onClick={() => {
            if (window.confirm(`Permanently delete ${items.length} note(s) in Trash?`)) emptyTrash()
          }}
          className="p-0.5 rounded text-text-faint hover:text-tag-important flex-none"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map(note => {
            const daysLeft = daysUntilPurge(note, retentionDays)
            const NoteIcon = getNoteIcon(note.icon)
            return (
              <div
                key={note.id}
                className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg group hover:bg-surface2"
              >
                <NoteIcon size={13} className="flex-none text-text-faint" />
                <div className="min-w-0 flex-1">
                  <div className="text-body-sm text-text-muted truncate leading-tight">{note.name}</div>
                  <div className="text-label text-text-faint tabular-nums">
                    {daysLeft === 0 ? 'Purges soon' : `${daysLeft}d left`}
                  </div>
                </div>
                <button
                  type="button"
                  title="Restore"
                  onClick={() => restoreNote(note.id)}
                  className="hidden group-hover:flex p-0.5 rounded text-text-faint hover:text-accent flex-none"
                >
                  <RotateCcw size={11} />
                </button>
                <button
                  type="button"
                  title="Delete forever"
                  onClick={() => {
                    if (window.confirm(`Permanently delete "${note.name}"?`)) {
                      permanentlyDeleteNote(note.id)
                    }
                  }}
                  className="hidden group-hover:flex p-0.5 rounded text-text-faint hover:text-tag-important flex-none"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FolderNode({
  folder, depth = 0, onNoteContextMenu, onFolderContextMenu, onOpenNote, onNoteCreated,
  onReorder, onReorderFolder, gdConnected, expandSignal = null,
}) {
  const [open, setOpen]           = useState(true)
  const [newNote, setNewNote]     = useState(false)
  const [newFolder, setNewFolder] = useState(false)
  const [noteDragOver, setNoteDragOver] = useState(false)
  const [folderDropHint, setFolderDropHint] = useState(null)
  const folders      = useNoteStore(s => s.folders)
  const notes        = useNoteStore(s => s.notes)
  const deleteFolder = useNoteStore(s => s.deleteFolder)
  const tagCfg       = folder.tag ? TAG_CONFIG[folder.tag] : null
  const children     = foldersInParent(folders, folder.id)
  const childNotes   = notesInFolder(notes, folder.id)

  useEffect(() => {
    if (expandSignal) setOpen(expandSignal.open)
  }, [expandSignal])

  const handleDragOver = (e) => {
    if (isNoteDrag(e)) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      setNoteDragOver(true)
      setFolderDropHint(null)
      return
    }
    if (!isFolderDrag(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setNoteDragOver(false)
    setFolderDropHint(getFolderDropHint(e, e.currentTarget))
  }

  const clearDragState = () => {
    setNoteDragOver(false)
    setFolderDropHint(null)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isNoteDrag(e)) {
      const noteId = e.dataTransfer.getData(NOTE_DRAG_TYPE)
      clearDragState()
      if (!noteId) return
      const note = notes.find(n => n.id === noteId)
      if (!note || !isLocalNote(note)) return
      await onReorder(noteId, { folderId: folder.id, referenceNoteId: null, position: 'end' })
      setOpen(true)
      return
    }

    const draggedFolderId = e.dataTransfer.getData(FOLDER_DRAG_TYPE)
    const hint = folderDropHint
    clearDragState()
    if (!draggedFolderId || draggedFolderId === folder.id) return
    if (isFolderDescendant(folders, draggedFolderId, folder.id)) return

    if (hint === 'inside') {
      await onReorderFolder(draggedFolderId, {
        parentId: folder.id,
        referenceFolderId: null,
        position: 'end',
      })
      setOpen(true)
      return
    }

    await onReorderFolder(draggedFolderId, {
      parentId: folder.parentId ?? null,
      referenceFolderId: folder.id,
      position: hint || 'after',
    })
  }

  const folderDragClass = folderDropHint === 'before'
    ? 'border-t-2 border-accent'
    : folderDropHint === 'after'
      ? 'border-b-2 border-accent'
      : folderDropHint === 'inside'
        ? 'bg-accent/20 ring-1 ring-accent/40'
        : ''

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          e.stopPropagation()
          e.dataTransfer.setData(FOLDER_DRAG_TYPE, folder.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={clearDragState}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer group transition-all ${
          noteDragOver ? 'bg-accent/20 ring-1 ring-accent/40' : 'hover:bg-surface2'
        } ${folderDragClass}`}
        onClick={() => setOpen(o => !o)}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onFolderContextMenu(e, folder) }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={clearDragState}
        onDrop={handleDrop}
      >
        <span className="text-text-faint flex-none">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="flex-none" style={{ color: tagCfg?.color || '#94A3B8' }}>
          {open ? <FolderOpen size={13} /> : <Folder size={13} />}
        </span>
        <span className="text-body-sm text-text-muted truncate flex-1 leading-tight">{folder.name}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button onClick={e => { e.stopPropagation(); setNewNote(true) }}
            className="p-0.5 rounded text-text-faint hover:text-text"><Plus size={11} /></button>
          <button
            onClick={e => {
              e.stopPropagation()
              if (window.confirm(`Delete folder "${folder.name}"? Notes inside move to Trash.`)) {
                deleteFolder(folder.id)
              }
            }}
            className="p-0.5 rounded text-text-faint hover:text-tag-important"
            title="Delete folder"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {open && (
        <>
          {children.map(f => (
            <FolderNode key={f.id} folder={f} depth={depth + 1}
              onNoteContextMenu={onNoteContextMenu} onFolderContextMenu={onFolderContextMenu}
              onOpenNote={onOpenNote} onNoteCreated={onNoteCreated}
              onReorder={onReorder} onReorderFolder={onReorderFolder} gdConnected={gdConnected}
              expandSignal={expandSignal} />
          ))}
          {children.length > 0 && (
            <FolderListEndDropZone parentId={folder.id} depth={depth + 1} onReorderFolder={onReorderFolder} />
          )}
          {childNotes.map(n => (
            <NoteRow key={n.id} note={n} depth={depth + 1} folderId={folder.id}
              onContextMenu={onNoteContextMenu} onReorder={onReorder}
              onOpenNote={onOpenNote} showMoveToDrive={gdConnected} draggable />
          ))}
          {childNotes.length > 0 && (
            <NoteListEndDropZone folderId={folder.id} depth={depth + 1} onReorder={onReorder} />
          )}
        </>
      )}

      <NewNoteModal open={newNote} onClose={() => setNewNote(false)} folderId={folder.id}
        onCreated={onNoteCreated} />
      <NewFolderModal open={newFolder} onClose={() => setNewFolder(false)} parentId={folder.id} />
    </>
  )
}

function StorageSectionHeader({
  icon: Icon, title, count, expanded, onToggle,
  onAddNote, onAddFolder, onToggleFolders, foldersExpanded = true,
  showFolderBtn, showAddNote = true, showToggleFolders = false,
}) {
  return (
    <div className="flex items-center justify-between mb-1 mt-3 first:mt-0 gap-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 min-w-0 flex-1 py-1 rounded-lg
                   text-left hover:bg-surface2/60 transition-colors"
      >
        <span className="text-text-faint flex-none">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <Icon size={13} className="flex-none text-text-faint" />
        <span className="text-label text-text-faint uppercase tracking-wider truncate">{title}</span>
        {count > 0 && (
          <span className="text-label text-text-faint/60 tabular-nums">{count}</span>
        )}
      </button>
      {(showAddNote || showFolderBtn || showToggleFolders) && (
        <div className="flex gap-0.5 flex-none">
          {showToggleFolders && (
            <button
              type="button"
              onClick={onToggleFolders}
              className="p-1 rounded hover:bg-surface2 text-text-faint hover:text-text"
              title={foldersExpanded ? 'Collapse all folders' : 'Expand all folders'}
            >
              {foldersExpanded ? <FoldVertical size={13} /> : <UnfoldVertical size={13} />}
            </button>
          )}
          {showAddNote && (
            <button onClick={onAddNote}
              className="p-1 rounded hover:bg-surface2 text-text-faint hover:text-text" title="New note">
              <Plus size={13} />
            </button>
          )}
          {showFolderBtn && (
            <button onClick={onAddFolder}
              className="p-1 rounded hover:bg-surface2 text-text-faint hover:text-text" title="New folder">
              <Folder size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SidebarLevelBar({ onClick }) {
  const totalXp = useGamificationStore(s => s.totalXp)
  const level = useGamificationStore(s => s.level)
  const xpPulseAt = useGamificationStore(s => s.xpPulseAt)
  const progress = progressInLevel(totalXp)
  const title = titleForLevel(level)

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${title.name} · Level ${level} · ${progress.currentXp}/${progress.neededXp} XP`}
      className="w-full flex-none px-3 py-2 border-b border-border text-left
                 hover:bg-surface2/50 transition-colors group"
    >
      <div
        key={xpPulseAt || 'idle'}
        className={`rounded-md -mx-1 px-1 ${xpPulseAt ? 'animate-xp-pulse' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
          <span className="text-label text-text-muted truncate group-hover:text-text transition-colors">
            {title.name}
          </span>
          <span className="text-label text-text-faint tabular-nums flex-none">
            Lv {level}
          </span>
        </div>
        <div className="h-1 rounded-full bg-surface2 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </button>
  )
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const folders = useNoteStore(s => s.folders)
  const notes   = useNoteStore(s => s.notes)
  const openNote = useNoteStore(s => s.openNote)
  const reorderNote = useNoteStore(s => s.reorderNote)
  const reorderFolder = useNoteStore(s => s.reorderFolder)
  const gdConnected = useSettingsStore(s => s.gdConnected)
  const localOpen = useSettingsStore(s => s.sidebarLocalOpen)
  const driveOpen = useSettingsStore(s => s.sidebarDriveOpen)
  const updateSettings = useSettingsStore(s => s.update)
  const unreadCount = useNotificationStore(s => s.notifications.filter(n => !n.read).length)

  const [newLocalNote, setNewLocalNote] = useState(false)
  const [newDriveNote, setNewDriveNote] = useState(false)
  const [newFolder, setNewFolder]       = useState(false)
  const [ctxMenu, setCtxMenu]           = useState(null)
  const [foldersExpanded, setFoldersExpanded] = useState(true)
  const [folderExpandSignal, setFolderExpandSignal] = useState(null)

  const isSettings = location.pathname === '/settings'
  const isGraph = location.pathname === '/graph'
  const isNotifications = location.pathname === '/notifications'
  const isDashboard = location.pathname === '/dashboard'
  const isHelp = location.pathname === '/help'
  const isOverlay = isSettings || isGraph || isNotifications || isDashboard || isHelp

  const exitOverlay = () => {
    if (isOverlay) navigate('/')
  }

  const handleOpenNote = (id) => {
    openNote(id)
    if (isOverlay) navigate('/')
  }

  const handleNoteCreated = () => exitOverlay()

  const handleNoteContextMenu = (e, note) => {
    setCtxMenu({ type: 'note', id: note.id, x: e.clientX, y: e.clientY })
  }

  const handleFolderContextMenu = (e, folder) => {
    setCtxMenu({ type: 'folder', id: folder.id, x: e.clientX, y: e.clientY })
  }

  const localNotes  = notes.filter(n => !n.deletedAt && isLocalNote(n))
  const driveNotes  = notes.filter(n => !n.deletedAt && n.cloudSync)
  const rootFolders = foldersInParent(folders, null)
  const rootLocalNotes = notesInFolder(localNotes, null)

  const handleReorder = async (noteId, options) => {
    await reorderNote(noteId, options)
  }

  const handleReorderFolder = async (folderId, options) => {
    await reorderFolder(folderId, options)
  }

  return (
    <aside className="w-60 h-full flex flex-col bg-surface border-r border-border overflow-hidden">
      {isMac && (
        <div className="flex-none titlebar" style={{ height: MAC_TITLEBAR_HEIGHT }} />
      )}

      <div
        className="flex items-center gap-2.5 px-3 flex-none border-b border-border cursor-pointer hover:bg-surface2/50 transition-colors"
        style={{ height: SIDEBAR_BRAND_HEIGHT }}
        onClick={exitOverlay}
      >
        <AppLogo size={24} />
        <span className="text-body-sm font-semibold text-text flex-1 min-w-0 truncate">OTDO</span>
        <SidebarCloseButton className="no-drag" />
      </div>

      <SidebarLevelBar onClick={() => navigate(isDashboard ? '/' : '/dashboard')} />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 pt-2 pb-3">
          {/* Local */}
          <StorageSectionHeader
            icon={HardDrive}
            title="Local"
            count={localNotes.length}
            expanded={localOpen}
            onToggle={() => updateSettings({ sidebarLocalOpen: !localOpen })}
            onAddNote={() => setNewLocalNote(true)}
            onAddFolder={() => setNewFolder(true)}
            onToggleFolders={() => {
              const next = !foldersExpanded
              setFoldersExpanded(next)
              setFolderExpandSignal({ open: next, version: Date.now() })
            }}
            foldersExpanded={foldersExpanded}
            showFolderBtn
            showToggleFolders={rootFolders.length > 0}
          />

          {localOpen && (
            <>
              {rootFolders.map(f => (
                <FolderNode key={f.id} folder={f} onNoteContextMenu={handleNoteContextMenu}
                  onFolderContextMenu={handleFolderContextMenu}
                  onOpenNote={handleOpenNote} onNoteCreated={handleNoteCreated}
                  onReorder={handleReorder} onReorderFolder={handleReorderFolder} gdConnected={gdConnected}
                  expandSignal={folderExpandSignal} />
              ))}
              {rootFolders.length > 0 && (
                <FolderListEndDropZone parentId={null} depth={0} onReorderFolder={handleReorderFolder} />
              )}
              {rootLocalNotes.map(n => (
                <NoteRow key={n.id} note={n} depth={0} folderId={null}
                  onContextMenu={handleNoteContextMenu} onReorder={handleReorder}
                  onOpenNote={handleOpenNote} showMoveToDrive={gdConnected} draggable />
              ))}
              {rootLocalNotes.length > 0 && (
                <NoteListEndDropZone folderId={null} depth={0} onReorder={handleReorder} />
              )}
              {localNotes.length === 0 && (
                <p className="text-label text-text-faint py-2 px-2 text-center">No local notes</p>
              )}
            </>
          )}

          {/* Google Drive */}
          <StorageSectionHeader
            icon={Cloud}
            title="Google Drive"
            count={driveNotes.length}
            expanded={driveOpen}
            onToggle={() => updateSettings({ sidebarDriveOpen: !driveOpen })}
            onAddNote={() => setNewDriveNote(true)}
            showAddNote={gdConnected}
            showFolderBtn={false}
          />

          {driveOpen && (
            <>
              {!gdConnected && (
                <button
                  onClick={() => navigate('/settings?section=google-drive')}
                  className="w-full mt-1 px-2 py-2 rounded-lg text-label text-text-faint
                             hover:bg-surface2 hover:text-accent transition-colors text-left"
                >
                  Connect in Settings →
                </button>
              )}
              {[...driveNotes].sort(compareNotes).map(n => (
                <NoteRow key={n.id} note={n} depth={0} onContextMenu={handleNoteContextMenu}
                  onOpenNote={handleOpenNote} showMoveToLocal showSyncDrive={gdConnected} />
              ))}
              {driveNotes.length === 0 && (
                <p className="text-label text-text-faint py-2 px-2 text-center">No Drive notes</p>
              )}
            </>
          )}

          <TrashSection />
        </div>
      </div>

      <div
        className="flex-none border-t border-border"
        style={{ height: EDITOR_META_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => navigate(isDashboard ? '/' : '/dashboard')}
          className={`w-full h-full flex items-center gap-2 px-6 text-body-sm transition-colors ${
            isDashboard ? 'bg-accent/20 text-accent' : 'text-text-faint hover:bg-surface2 hover:text-text'
          }`}
        >
          <LayoutDashboard size={15} />
          Dashboard
        </button>
      </div>

      <div
        className="flex-none border-t border-border"
        style={{ height: EDITOR_META_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => navigate(isNotifications ? '/' : '/notifications')}
          className={`w-full h-full flex items-center gap-2 px-6 text-body-sm transition-colors relative ${
            isNotifications ? 'bg-accent/20 text-accent' : 'text-text-faint hover:bg-surface2 hover:text-text'
          }`}
        >
          <Bell size={15} />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-label bg-accent text-white min-w-[1.125rem] h-[1.125rem] px-1 rounded-full flex items-center justify-center tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div
        className="flex-none border-t border-border"
        style={{ height: EDITOR_META_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => navigate(isGraph ? '/' : '/graph')}
          className={`w-full h-full flex items-center gap-2 px-6 text-body-sm transition-colors ${
            isGraph ? 'bg-accent/20 text-accent' : 'text-text-faint hover:bg-surface2 hover:text-text'
          }`}
        >
          <GitBranch size={15} />
          Graph
        </button>
      </div>

      <SidebarCalendar onNoteOpen={exitOverlay} />

      <div
        className="flex-none border-t border-border"
        style={{ height: EDITOR_META_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => navigate(isHelp ? '/' : '/help')}
          className={`w-full h-full flex items-center gap-2 px-6 text-body-sm transition-colors ${
            isHelp ? 'bg-accent/20 text-accent' : 'text-text-faint hover:bg-surface2 hover:text-text'
          }`}
        >
          <CircleHelp size={15} />
          Help
        </button>
      </div>

      <div
        className="flex-none border-t border-border"
        style={{ height: EDITOR_META_HEIGHT }}
      >
        <button
          onClick={() => navigate(isSettings ? '/' : '/settings')}
          className={`w-full h-full flex items-center gap-2 px-6 text-body-sm transition-colors ${
            isSettings ? 'bg-accent/20 text-accent' : 'text-text-faint hover:bg-surface2 hover:text-text'
          }`}
        >
          <Settings size={15} />
          Settings
        </button>
      </div>

      <NewNoteModal open={newLocalNote} onClose={() => setNewLocalNote(false)} folderId={null}
        cloudSync={false} onCreated={handleNoteCreated} />
      <NewNoteModal open={newDriveNote} onClose={() => setNewDriveNote(false)} folderId={null}
        cloudSync={true} onCreated={handleNoteCreated} />
      <NewFolderModal open={newFolder} onClose={() => setNewFolder(false)} parentId={null} />

      {ctxMenu?.type === 'note' && (
        <NoteContextMenu
          noteId={ctxMenu.id}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
          gdConnected={gdConnected}
        />
      )}
      {ctxMenu?.type === 'folder' && (
        <FolderContextMenu
          folderId={ctxMenu.id}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </aside>
  )
}
