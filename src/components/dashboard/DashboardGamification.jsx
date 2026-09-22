import { formatDistanceToNow } from 'date-fns'
import { Flame, Sparkles, Trophy, Zap } from 'lucide-react'
import useGamificationStore from '../../store/gamificationStore'
import { progressInLevel, titleForLevel } from '../../lib/gamification'

function XpBar({ progress }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-label">
        <span className="text-text-muted">
          {progress.currentXp} / {progress.neededXp} XP
        </span>
        <span className="text-text-faint tabular-nums">{progress.percent}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface2 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-label text-text-faint">
        {progress.neededXp - progress.currentXp} XP to level {progress.level + 1}
      </p>
    </div>
  )
}

export default function DashboardGamification() {
  const totalXp = useGamificationStore(s => s.totalXp)
  const level = useGamificationStore(s => s.level)
  const history = useGamificationStore(s => s.history)
  const streak = useGamificationStore(s => s.streak)
  const lastLevelUp = useGamificationStore(s => s.lastLevelUp)
  const clearLastLevelUp = useGamificationStore(s => s.clearLastLevelUp)

  const progress = progressInLevel(totalXp)
  const title = titleForLevel(level)

  return (
    <div className="space-y-4">
      {lastLevelUp && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-3 animate-fade-in">
          <div className="w-9 h-9 bg-accent/20 rounded-lg flex items-center justify-center flex-none">
            <Trophy size={16} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-medium text-text">
              Level up! You reached level {lastLevelUp.to}
            </p>
            <p className="text-label text-text-muted mt-0.5">
              New title: {lastLevelUp.title}
            </p>
          </div>
          <button
            type="button"
            onClick={clearLastLevelUp}
            className="text-label text-text-faint hover:text-text transition-colors flex-none"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center flex-none">
            <Sparkles size={22} className="text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-label text-text-muted">Current title</p>
            <p className="text-headline-md text-text truncate">{title.name}</p>
            <p className="text-body-sm text-text-faint mt-0.5">{title.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-surface2 px-3.5 py-2.5 min-w-[88px]">
            <p className="text-label text-text-faint">Level</p>
            <p className="text-headline-lg text-text tabular-nums leading-none mt-1">{level}</p>
          </div>
          <div className="rounded-xl bg-surface2 px-3.5 py-2.5 min-w-[88px]">
            <p className="text-label text-text-faint">Total XP</p>
            <p className="text-headline-lg text-text tabular-nums leading-none mt-1">{totalXp}</p>
          </div>
          <div className="rounded-xl bg-surface2 px-3.5 py-2.5 min-w-[88px]">
            <div className="flex items-center gap-1 text-label text-text-faint">
              <Flame size={12} className="text-tag-warning" />
              Streak
            </div>
            <p className="text-headline-lg text-text tabular-nums leading-none mt-1">
              {streak?.current || 0}
              <span className="text-body-sm text-text-faint font-normal ml-1">days</span>
            </p>
          </div>
        </div>
      </div>

      <XpBar progress={progress} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-accent" />
          <h3 className="text-headline-sm text-text">Recent XP</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-body-sm text-text-faint py-4 text-center">
            Complete todos, grow notes, and set reminders to earn XP.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {history.slice(0, 12).map(entry => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-surface2/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-body-sm text-text truncate">{entry.label}</p>
                  <p className="text-label text-text-faint mt-0.5">
                    {formatDistanceToNow(new Date(entry.at), { addSuffix: true })}
                  </p>
                </div>
                <span className="text-body-sm font-medium text-status-done tabular-nums flex-none">
                  +{entry.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(streak?.best || 0) > 0 && (
          <p className="text-label text-text-faint pt-1 border-t border-border">
            Best streak: {streak.best} day{streak.best === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  )
}
