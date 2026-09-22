import { Award } from 'lucide-react'
import useGamificationStore from '../../store/gamificationStore'
import {
  NOTE_MILESTONES,
  TITLES,
  XP_ACTIONS,
  XP_REWARDS,
  titleForLevel,
} from '../../lib/gamification'

const XP_GUIDE = [
  { label: 'Complete a todo', xp: XP_REWARDS[XP_ACTIONS.TODO_COMPLETE] },
  { label: 'High-priority completion bonus', xp: XP_REWARDS[XP_ACTIONS.TODO_COMPLETE_HIGH] },
  { label: 'On-time completion bonus', xp: XP_REWARDS[XP_ACTIONS.TODO_COMPLETE_ON_TIME] },
  { label: 'Start a todo (in progress)', xp: XP_REWARDS[XP_ACTIONS.TODO_IN_PROGRESS] },
  { label: 'Create a note', xp: XP_REWARDS[XP_ACTIONS.NOTE_CREATE] },
  { label: 'Pin a note', xp: XP_REWARDS[XP_ACTIONS.NOTE_PIN] },
  { label: 'Create a folder', xp: XP_REWARDS[XP_ACTIONS.FOLDER_CREATE] },
  { label: 'Set a reminder', xp: XP_REWARDS[XP_ACTIONS.REMINDER_SET] },
  { label: 'Daily streak bonus (day 2+)', xp: XP_REWARDS[XP_ACTIONS.STREAK_BONUS] },
]

function titleBadgeClasses(current, unlocked) {
  if (current) return 'border-accent/50 bg-accent/10'
  if (unlocked) return 'border-border bg-surface2/60'
  return 'border-border/60 bg-surface/40 opacity-50'
}

function titleIconClass(current, unlocked) {
  if (current) return 'text-accent flex-none'
  if (unlocked) return 'text-tag-warning flex-none'
  return 'text-text-faint flex-none'
}

function TitleBadge({ title, unlocked, current }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 min-w-0 transition-colors ${titleBadgeClasses(current, unlocked)}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Award size={14} className={titleIconClass(current, unlocked)} />
        <p className={`text-body-sm font-medium truncate ${current ? 'text-text' : 'text-text-muted'}`}>
          {title.name}
        </p>
      </div>
      <p className="text-label text-text-faint mt-1 truncate">
        {unlocked ? title.description : `Unlocks at level ${title.minLevel}`}
      </p>
    </div>
  )
}

export default function HelpGamification() {
  const level = useGamificationStore(s => s.level)
  const titleId = useGamificationStore(s => s.titleId)
  const unlockedTitles = useGamificationStore(s => s.unlockedTitles)
  const title = titleForLevel(level)
  const unlockedSet = new Set(unlockedTitles?.length ? unlockedTitles : [titleId])

  return (
    <div className="space-y-5">
      <p className="text-body-sm text-text-muted">
        Earn experience by completing todos, growing notes, and staying consistent.
        Levels unlock titles — track your progress on the Dashboard.
      </p>

      <div>
        <h3 className="text-body-sm font-semibold text-text mb-2">How to earn XP</h3>
        <div className="space-y-1">
          {XP_GUIDE.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg hover:bg-surface2/60"
            >
              <span className="text-body-sm text-text-muted">{item.label}</span>
              <span className="text-label text-status-done tabular-nums flex-none">+{item.xp} XP</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-body-sm font-semibold text-text mb-2">Note length milestones</h3>
        <div className="space-y-1">
          {NOTE_MILESTONES.map(m => (
            <div
              key={m.chars}
              className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg hover:bg-surface2/60"
            >
              <span className="text-body-sm text-text-muted">{m.label}</span>
              <span className="text-label text-status-done tabular-nums flex-none">+{m.xp} XP</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-body-sm font-semibold text-text">Titles</h3>
          <span className="text-label text-text-faint tabular-nums">
            {unlockedSet.size}/{TITLES.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TITLES.map(t => (
            <TitleBadge
              key={t.id}
              title={t}
              unlocked={unlockedSet.has(t.id)}
              current={t.id === title.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
