import { Filter, ArrowUpDown, ChevronDown } from 'lucide-react'
import useSettingsStore from '../../store/settingsStore'
import { NOTE_TODO_FILTER_OPTIONS, NOTE_TODO_SORT_OPTIONS } from '../../lib/noteTodoView'

function ToolbarSelect({ icon: Icon, value, options, onChange, title, widthClass }) {
  return (
    <label
      className={`relative flex items-center min-w-0 ${widthClass}`}
      title={title}
    >
      <Icon
        size={13}
        strokeWidth={2}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none z-10"
        aria-hidden
      />
      <select
        value={value}
        aria-label={title}
        onChange={e => onChange(e.target.value)}
        style={{ WebkitAppRegion: 'no-drag' }}
        className="toolbar-select w-full"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={13}
        strokeWidth={2}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
        aria-hidden
      />
    </label>
  )
}

export default function EditorTodoControls() {
  const noteTodoFilter = useSettingsStore(s => s.noteTodoFilter)
  const noteTodoSort = useSettingsStore(s => s.noteTodoSort)
  const update = useSettingsStore(s => s.update)

  return (
    <div
      className="no-drag flex items-stretch flex-none shrink-0
                 rounded-lg border border-border bg-surface2 overflow-hidden
                 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      role="group"
      aria-label="Todo view controls"
    >
      <ToolbarSelect
        icon={Filter}
        value={noteTodoFilter}
        options={NOTE_TODO_FILTER_OPTIONS}
        title="Filter todos by status"
        onChange={v => update({ noteTodoFilter: v }, true)}
        widthClass="w-[6.75rem] border-r border-border"
      />
      <ToolbarSelect
        icon={ArrowUpDown}
        value={noteTodoSort}
        options={NOTE_TODO_SORT_OPTIONS}
        title="Sort todos"
        onChange={v => update({ noteTodoSort: v }, true)}
        widthClass="w-[8.25rem]"
      />
    </div>
  )
}
