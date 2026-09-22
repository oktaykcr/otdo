import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import Modal from '../common/Modal'
import ColorTag from '../common/ColorTag'
import ReminderForm from './ReminderForm'
import useTodoStore from '../../store/todoStore'
import { toDateTimeLocalValue, fromDateTimeLocalValue } from '../../lib/todoStatus'

const PRIORITY_OPTIONS = ['high', 'medium', 'low']
const TAG_OPTIONS = ['important', 'warning', 'info', 'temp']

export default function TodoForm({ open, onClose, initial = null }) {
  const updateTodo = useTodoStore(s => s.updateTodo)
  const addTodo = useTodoStore(s => s.addTodo)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [tag, setTag] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reminder, setReminder] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title || '')
    setDescription(initial?.description || '')
    setPriority(initial?.priority || 'medium')
    setTag(initial?.tag || null)
    setStartDate(toDateTimeLocalValue(initial?.startDate))
    setDueDate(toDateTimeLocalValue(initial?.dueDate))
    setReminder(initial?.reminder || null)
  }, [open, initial])

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description,
        priority,
        tag,
        startDate: fromDateTimeLocalValue(startDate),
        dueDate: fromDateTimeLocalValue(dueDate),
        reminder,
      }
      if (initial?.id) {
        await updateTodo(initial.id, payload)
      } else {
        await addTodo(payload)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit task' : 'New task'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label block mb-1.5">Title</label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="label block mb-1.5">Description</label>
          <textarea
            className="input min-h-[96px] resize-y"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional details..."
          />
        </div>

        <div>
          <label className="label block mb-1.5">Priority</label>
          <div className="flex gap-1.5">
            {PRIORITY_OPTIONS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-lg text-body-sm capitalize transition-all border ${
                  priority === p
                    ? 'bg-accent text-white border-transparent'
                    : 'bg-surface2 text-text-muted border-border hover:bg-border'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label block mb-1.5">Tag</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTag(null)}
              className={`px-2.5 py-1 rounded-lg text-body-sm border transition-all ${
                !tag ? 'bg-surface2 text-text border-border' : 'text-text-faint border-transparent hover:bg-surface2'
              }`}
            >
              None
            </button>
            {TAG_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`rounded-full transition-all ${tag === t ? 'ring-2 ring-accent ring-offset-1 ring-offset-primary' : ''}`}
              >
                <ColorTag tag={t} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Start', value: startDate, onChange: setStartDate },
            { label: 'Due', value: dueDate, onChange: setDueDate },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="label block mb-1.5">{label}</label>
              <div className="relative datetime-input-wrap">
                <input
                  type="datetime-local"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="input font-mono pr-9"
                />
                <Calendar
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>

        <ReminderForm value={reminder} onChange={setReminder} />

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 btn-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 btn-sm">
            {saving ? 'Saving…' : initial ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
