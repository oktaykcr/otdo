import { useEffect, useState } from 'react'
import { Sparkles, Trophy, X, Zap } from 'lucide-react'
import useGamificationStore from '../../store/gamificationStore'

const XP_DURATION_MS = 2800
const LEVELUP_DURATION_MS = 4200

function ToastCard({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false)
  const isLevelUp = toast.type === 'levelup'
  const duration = isLevelUp ? LEVELUP_DURATION_MS : XP_DURATION_MS

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), duration - 280)
    const dismissTimer = setTimeout(() => onDismiss(toast.id), duration)
    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(dismissTimer)
    }
  }, [toast.id, duration, onDismiss])

  const handleDismiss = () => {
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), 180)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto w-[min(100vw-1.5rem,20rem)] rounded-xl border shadow-elevated
                  backdrop-blur-md transition-all duration-200 ease-out
                  ${leaving ? 'opacity-0 translate-y-2 scale-[0.98]' : 'animate-toast-in'}
                  ${isLevelUp
                    ? 'border-accent/50 bg-surface/95 ring-1 ring-accent/30'
                    : 'border-border/80 bg-surface/95'}`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-none
                      ${isLevelUp ? 'bg-accent/20' : 'bg-status-done/15'}`}
        >
          {isLevelUp
            ? <Trophy size={16} className="text-accent" />
            : <Zap size={16} className="text-status-done" />}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          {isLevelUp ? (
            <>
              <p className="text-body-sm font-semibold text-text">
                Level up!
              </p>
              <p className="text-label text-text-muted mt-0.5">
                Level {toast.to}
                {toast.title ? ` · ${toast.title}` : ''}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-body-sm font-semibold text-status-done tabular-nums flex-none">
                  +{toast.amount} XP
                </span>
                <Sparkles size={12} className="text-accent flex-none opacity-80" />
              </div>
              <p className="text-label text-text-muted mt-0.5 truncate">
                {toast.label}
              </p>
              {toast.detail && (
                <p className="text-label text-text-faint mt-0.5 truncate">
                  Bonuses {toast.detail}
                </p>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2
                     transition-colors flex-none -mr-0.5 -mt-0.5"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      <div className="h-0.5 rounded-b-xl overflow-hidden bg-surface2/80">
        <div
          className={`h-full ${isLevelUp ? 'bg-accent' : 'bg-status-done'} animate-toast-progress`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  )
}

export default function XpToastStack() {
  const toasts = useGamificationStore(s => s.toasts)
  const dismissToast = useGamificationStore(s => s.dismissToast)

  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] flex flex-col-reverse gap-2
                 pointer-events-none sm:bottom-5 sm:right-5"
    >
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
