import { PanelLeft, PanelLeftClose } from 'lucide-react'
import useSettingsStore from '../../store/settingsStore'

export function SidebarCloseButton({ className = '', onClick }) {
  const update = useSettingsStore(s => s.update)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
        update({ sidebarOpen: false })
      }}
      className={`p-1.5 rounded-lg text-text-faint hover:text-text hover:bg-surface2 transition-colors flex-none ${className}`}
      title="Hide sidebar"
      aria-label="Hide sidebar"
    >
      <PanelLeftClose size={16} />
    </button>
  )
}

export function SidebarOpenButton({ className = '' }) {
  const update = useSettingsStore(s => s.update)

  return (
    <button
      type="button"
      onClick={() => update({ sidebarOpen: true })}
      className={`p-1.5 rounded-lg text-text-faint hover:text-text hover:bg-surface2 transition-colors flex-none ${className}`}
      title="Show sidebar"
      aria-label="Show sidebar"
    >
      <PanelLeft size={16} />
    </button>
  )
}
