import { useState, useEffect } from 'react'
import { Loader, FileText, LayoutTemplate } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import { NoteAppearancePicker } from '../common/NoteAppearancePicker'
import Modal from '../common/Modal'
import { NOTE_TYPE_MARKDOWN, NOTE_TYPE_CANVAS } from '../../lib/noteCanvas'

const NOTE_TYPES = [
  {
    value: NOTE_TYPE_MARKDOWN,
    label: 'Note',
    desc: 'Markdown blocks',
    Icon: FileText,
    defaultIcon: 'file-text',
  },
  {
    value: NOTE_TYPE_CANVAS,
    label: 'Canvas',
    desc: 'Boxes & arrows',
    Icon: LayoutTemplate,
    defaultIcon: 'layout',
  },
]

export default function NewNoteModal({ open, onClose, folderId, cloudSync = false, onCreated }) {
  const [name, setName] = useState('')
  const [noteType, setNoteType] = useState(NOTE_TYPE_MARKDOWN)
  const [icon, setIcon] = useState('file-text')
  const [tag, setTag] = useState(null)
  const [phase, setPhase] = useState(null)
  const addNote = useNoteStore(s => s.addNote)
  const moveNoteToDrive = useNoteStore(s => s.moveNoteToDrive)

  useEffect(() => {
    if (open) {
      setName('')
      setNoteType(NOTE_TYPE_MARKDOWN)
      setIcon('file-text')
      setTag(null)
      setPhase(null)
    }
  }, [open])

  const selectType = (type) => {
    setNoteType(type)
    const preset = NOTE_TYPES.find(t => t.value === type)
    if (preset) setIcon(preset.defaultIcon)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || phase) return
    setPhase('creating')
    try {
      const defaultIcon = noteType === NOTE_TYPE_CANVAS ? 'layout' : 'file-text'
      const note = await addNote({
        name: name.trim(),
        type: noteType,
        folderId,
        icon: icon === defaultIcon && noteType === NOTE_TYPE_MARKDOWN ? null : icon,
        tag,
        cloudSync,
      })
      if (cloudSync) {
        setPhase('syncing')
        const result = await moveNoteToDrive(note.id)
        if (!result.ok) {
          alert(result.error || 'Note created locally but Drive sync failed')
        }
      }
      setName('')
      setNoteType(NOTE_TYPE_MARKDOWN)
      setIcon('file-text')
      setTag(null)
      onClose()
      onCreated?.(note)
    } finally {
      setPhase(null)
    }
  }

  const submitLabel = phase === 'creating'
    ? 'Creating…'
    : phase === 'syncing'
      ? 'Syncing to Drive…'
      : 'Create'

  return (
    <Modal open={open} onClose={onClose} title={cloudSync ? 'New Drive Note' : 'New Local Note'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label block mb-1.5">Note name</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={noteType === NOTE_TYPE_CANVAS ? 'My canvas' : 'My note'}
            autoFocus
            required
            disabled={!!phase}
          />
        </div>

        <div>
          <span className="label block mb-2">Type</span>
          <div className="grid grid-cols-2 gap-2">
            {NOTE_TYPES.map(({ value, label, desc, Icon }) => {
              const selected = noteType === value
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!!phase}
                  onClick={() => selectType(value)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
                      : 'border-border bg-surface2 hover:border-text-faint'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`flex-none mt-0.5 ${selected ? 'text-accent' : 'text-text-faint'}`}
                  />
                  <span>
                    <span className={`block text-body-sm font-medium ${selected ? 'text-accent' : 'text-text'}`}>
                      {label}
                    </span>
                    <span className="block text-label text-text-faint mt-0.5">{desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <NoteAppearancePicker icon={icon} tag={tag} onIconChange={setIcon} onTagChange={setTag} />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={!!phase} className="btn-secondary flex-1 btn-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!!phase}
            className="btn-primary flex-1 btn-sm inline-flex items-center justify-center gap-1.5"
          >
            {phase && <Loader size={13} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
