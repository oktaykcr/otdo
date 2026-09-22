import { Bell } from 'lucide-react'
import Modal from '../common/Modal'
import ReminderForm from '../todos/ReminderForm'

export default function NoteReminderModal({ open, onClose, reminder, onChange }) {
  return (
    <Modal open={open} onClose={onClose} title="Note reminder" size="sm">
      <p className="text-body-sm text-text-muted mb-4">
        Hatırlatıcı tetiklendiğinde bu nottaki açık task'ların listesi gönderilir.
      </p>
      <ReminderForm value={reminder} onChange={onChange} />
      <div className="flex justify-end mt-5">
        <button type="button" onClick={onClose} className="btn-primary btn-sm flex items-center gap-1.5">
          <Bell size={14} />
          Done
        </button>
      </div>
    </Modal>
  )
}
