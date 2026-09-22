import { useState } from 'react'
import {
  FolderOpen, Folder, FileText, Plus, Trash2,
  ChevronRight, ChevronDown, Cloud, HardDrive,
} from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import ColorTag, { TAG_OPTIONS } from '../common/ColorTag'
import { TAG_CONFIG } from '../common/ColorTag'
import Modal from '../common/Modal'

function NewFolderModal({ open, onClose, parentId }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState(null)
  const addFolder = useNoteStore(s => s.addFolder)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addFolder({ name: name.trim(), parentId, tag })
    setName('')
    setTag(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Folder" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Folder name" autoFocus required />
        </div>
        <div>
          <label className="label">Label</label>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setTag(null)} className={`px-2 py-1 rounded-full text-xs ${!tag ? 'bg-surface2 ring-2 ring-accent text-text' : 'bg-surface2 text-text-muted'}`}>None</button>
            {TAG_OPTIONS.map(t => (
              <button key={t.value} type="button" onClick={() => setTag(t.value)}
                className={`px-2 py-1 rounded-full text-xs font-medium ${tag === t.value ? 'ring-2 ring-current' : ''}`}
                style={{ color: t.color, backgroundColor: t.bg }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Create</button>
        </div>
      </form>
    </Modal>
  )
}

function NewNoteModal({ open, onClose, folderId }) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState(null)
  const addNote = useNoteStore(s => s.addNote)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addNote({ name: name.trim(), folderId, tag })
    setName('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Note" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Note name" autoFocus required />
        </div>
        <div>
          <label className="label">Label</label>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setTag(null)} className={`px-2 py-1 rounded-full text-xs ${!tag ? 'bg-surface2 ring-2 ring-accent text-text' : 'bg-surface2 text-text-muted'}`}>None</button>
            {TAG_OPTIONS.map(t => (
              <button key={t.value} type="button" onClick={() => setTag(t.value)}
                className={`px-2 py-1 rounded-full text-xs font-medium ${tag === t.value ? 'ring-2 ring-current' : ''}`}
                style={{ color: t.color, backgroundColor: t.bg }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Create</button>
        </div>
      </form>
    </Modal>
  )
}

function FolderNode({ folder, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const [showNewNote, setShowNewNote] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const folders = useNoteStore(s => s.folders)
  const notes = useNoteStore(s => s.notes)
  const activeNoteId = useNoteStore(s => s.activeNoteId)
  const openNote = useNoteStore(s => s.openNote)
  const deleteFolder = useNoteStore(s => s.deleteFolder)
  const deleteNote = useNoteStore(s => s.deleteNote)

  const childFolders = folders.filter(f => f.parentId === folder.id)
  const folderNotes = notes.filter(n => !n.deletedAt && n.folderId === folder.id)
  const tagCfg = folder.tag ? TAG_CONFIG[folder.tag] : null

  return (
    <div>
      {/* Folder row */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-surface2 cursor-pointer group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-text-faint flex-none">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span style={{ color: tagCfg?.color || '#94A3B8' }} className="flex-none">
          {expanded ? <FolderOpen size={15} /> : <Folder size={15} />}
        </span>
        <span className="text-body-sm text-text-muted truncate flex-1">{folder.name}</span>
        {folder.tag && (
          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: tagCfg?.color }} />
        )}

        {/* Actions (on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-none">
          <button
            onClick={(e) => { e.stopPropagation(); setShowNewNote(true) }}
            className="p-0.5 rounded text-text-faint hover:text-text"
            title="New note"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowNewFolder(true) }}
            className="p-0.5 rounded text-text-faint hover:text-text"
            title="New subfolder"
          >
            <Folder size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Delete folder "${folder.name}"? Notes inside move to Trash.`)) {
                deleteFolder(folder.id)
              }
            }}
            className="p-0.5 rounded text-text-faint hover:text-tag-important"
            title="Delete folder"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && (
        <div>
          {childFolders.map(f => <FolderNode key={f.id} folder={f} depth={depth + 1} />)}
          {folderNotes.map(note => (
            <NoteRow
              key={note.id}
              note={note}
              depth={depth + 1}
              isActive={note.id === activeNoteId}
              onOpen={() => openNote(note.id)}
              onDelete={() => {
                if (window.confirm(`Move "${note.name}" to Trash?`)) deleteNote(note.id)
              }}
            />
          ))}
        </div>
      )}

      <NewNoteModal open={showNewNote} onClose={() => setShowNewNote(false)} folderId={folder.id} />
      <NewFolderModal open={showNewFolder} onClose={() => setShowNewFolder(false)} parentId={folder.id} />
    </div>
  )
}

function NoteRow({ note, depth, isActive, onOpen, onDelete }) {
  const tagCfg = note.tag ? TAG_CONFIG[note.tag] : null
  return (
    <div
      onClick={onOpen}
      className={`flex items-center gap-2 py-1.5 pr-2 rounded-lg cursor-pointer group transition-all ${
        isActive ? 'bg-accent/15 text-accent' : 'hover:bg-surface2 text-text-muted'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileText size={13} className="flex-none" style={{ color: tagCfg?.color || undefined }} />
      <span className="text-body-sm truncate flex-1">{note.name}</span>
      {note.cloudSync && <Cloud size={11} className="text-blue-400 flex-none" />}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="hidden group-hover:block p-0.5 rounded text-text-faint hover:text-tag-important flex-none"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

export default function FolderTree() {
  const folders = useNoteStore(s => s.folders)
  const notes = useNoteStore(s => s.notes)
  const activeNoteId = useNoteStore(s => s.activeNoteId)
  const openNote = useNoteStore(s => s.openNote)
  const deleteNote = useNoteStore(s => s.deleteNote)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)

  const rootFolders = folders.filter(f => !f.parentId)
  const rootNotes = notes.filter(n => !n.deletedAt && !n.folderId)

  return (
    <div className="h-full flex flex-col">
      {/* Local */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-label text-text-faint">
              <HardDrive size={12} />
              <span>Local</span>
            </div>
            <div className="flex gap-0.5">
              <button onClick={() => setShowNewNote(true)} className="p-1 rounded hover:bg-surface2 text-text-faint hover:text-text" title="New note">
                <Plus size={13} />
              </button>
              <button onClick={() => setShowNewFolder(true)} className="p-1 rounded hover:bg-surface2 text-text-faint hover:text-text" title="New folder">
                <Folder size={13} />
              </button>
            </div>
          </div>

          {/* Root folders */}
          {rootFolders.map(folder => (
            <FolderNode key={folder.id} folder={folder} />
          ))}

          {/* Root notes (no folder) */}
          {rootNotes.map(note => (
            <NoteRow
              key={note.id}
              note={note}
              depth={0}
              isActive={note.id === activeNoteId}
              onOpen={() => openNote(note.id)}
              onDelete={() => {
                if (window.confirm(`Move "${note.name}" to Trash?`)) deleteNote(note.id)
              }}
            />
          ))}

          {rootFolders.length === 0 && rootNotes.length === 0 && (
            <p className="text-label text-text-faint text-center py-4">No notes yet</p>
          )}
        </div>
      </div>

      <NewFolderModal open={showNewFolder} onClose={() => setShowNewFolder(false)} parentId={null} />
      <NewNoteModal open={showNewNote} onClose={() => setShowNewNote(false)} folderId={null} />
    </div>
  )
}
