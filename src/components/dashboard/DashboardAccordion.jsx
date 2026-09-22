import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function DashboardAccordion({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `dashboard-accordion-${id}`

  return (
    <section className="card p-0 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                   hover:bg-surface2/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-headline-sm text-text">{title}</h2>
          {summary && !open && (
            <p className="text-label text-text-faint mt-0.5 truncate">{summary}</p>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-text-faint flex-none transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 pt-1 border-t border-border space-y-3 animate-fade-in">
          {children}
        </div>
      )}
    </section>
  )
}
