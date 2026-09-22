import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CircleHelp, Keyboard, Bell, Terminal, Sparkles, ChevronDown } from 'lucide-react'
import useSettingsStore from '../../store/settingsStore'
import { SidebarOpenButton } from '../layout/SidebarToggle'
import { isMac } from '../../lib/platform'
import { MAC_TITLEBAR_HEIGHT, APP_HEADER_HEIGHT } from '../../lib/editorLayout'
import {
  HELP_SHORTCUTS,
  HELP_COMMAND_PALETTE,
  HELP_EDITOR_TIPS,
  shortcutLabel,
} from '../../lib/keyboardShortcuts'
import HelpGamification from './HelpGamification'

function HelpSection({ id, icon: Icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `help-section-${id}`

  return (
    <section className="card p-0 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left
                   hover:bg-surface2/50 transition-colors"
      >
        <div className="w-8 h-8 bg-accent/15 rounded-lg flex items-center justify-center flex-none">
          <Icon size={16} className="text-accent" />
        </div>
        <h2 className="text-headline-sm text-text flex-1 min-w-0 truncate">{title}</h2>
        <ChevronDown
          size={18}
          className={`text-text-faint flex-none transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 pt-3 border-t border-border space-y-4 animate-fade-in">
          {children}
        </div>
      )}
    </section>
  )
}

export default function HelpPage() {
  const navigate = useNavigate()
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

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
          <CircleHelp size={18} className="text-accent flex-none" />
          <h1 className="text-body-md font-semibold text-text truncate">Help</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-3">
          <HelpSection id="experience" icon={Sparkles} title="Experience & titles" defaultOpen>
            <HelpGamification />
          </HelpSection>

          <HelpSection id="shortcuts" icon={Keyboard} title="Keyboard shortcuts">
            <div className="space-y-1.5">
              {HELP_SHORTCUTS.map(item => (
                <div
                  key={item.description}
                  className="flex items-center justify-between gap-4 py-1.5 px-2.5 rounded-lg hover:bg-surface2/60"
                >
                  <span className="text-body-sm text-text-muted">{item.description}</span>
                  <kbd className="text-[11px] text-text-faint bg-surface2 px-1.5 py-0.5 rounded border border-border font-mono flex-none">
                    {shortcutLabel(item)}
                  </kbd>
                </div>
              ))}
            </div>
          </HelpSection>

          <HelpSection id="reminders" icon={Bell} title="Quick reminders">
            <p className="text-body-sm text-text-muted">
              Open the command palette ({shortcutLabel({ mac: '⌘⇧P', win: 'Ctrl+Shift+P' })})
              and type a remind command. Creates a standalone reminder — no todo or note required.
            </p>
            <div className="space-y-2">
              {HELP_COMMAND_PALETTE.map(item => (
                <div key={item.example} className="p-2.5 bg-surface2 rounded-xl">
                  <code className="text-body-sm text-accent font-mono">{item.example}</code>
                  <p className="text-label text-text-faint mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </HelpSection>

          <HelpSection id="editor" icon={Terminal} title="Editor tips">
            <div className="space-y-1.5">
              {HELP_EDITOR_TIPS.map(item => (
                <div
                  key={item.trigger}
                  className="flex items-start gap-3 py-1.5 px-2.5 rounded-lg hover:bg-surface2/60"
                >
                  <kbd className="text-[11px] text-text-faint bg-surface2 px-1.5 py-0.5 rounded border border-border font-mono flex-none mt-0.5">
                    {item.trigger}
                  </kbd>
                  <span className="text-body-sm text-text-muted">{item.description}</span>
                </div>
              ))}
            </div>
          </HelpSection>
        </div>
      </div>
    </div>
  )
}
