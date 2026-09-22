import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, LayoutDashboard, StickyNote, CheckCircle2, ListTodo,
  Clock, CalendarClock, AlertTriangle, Bell, Folder, Pin, Cloud, HardDrive, Flag,
  LayoutTemplate, Zap,
} from 'lucide-react'
import useTodoStore from '../../store/todoStore'
import useNoteStore from '../../store/noteStore'
import useNotificationStore from '../../store/notificationStore'
import useQuickReminderStore from '../../store/quickReminderStore'
import useSettingsStore from '../../store/settingsStore'
import useGamificationStore from '../../store/gamificationStore'
import { SidebarOpenButton } from '../layout/SidebarToggle'
import { isMac } from '../../lib/platform'
import { MAC_TITLEBAR_HEIGHT, APP_HEADER_HEIGHT } from '../../lib/editorLayout'
import { computeDashboardStats } from '../../lib/dashboardStats'
import { TODO_STATUS } from '../../lib/todoStatus'
import { titleForLevel } from '../../lib/gamification'
import DashboardActivityReport from './DashboardActivityReport'
import DashboardGamification from './DashboardGamification'
import DashboardAccordion from './DashboardAccordion'

function StatCard({ icon: Icon, label, value, hint, accent = 'text-accent', iconBg = 'bg-accent/15' }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/40 flex items-start gap-3 min-w-0 p-3.5">
      <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center flex-none`}>
        <Icon size={16} className={accent} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-label text-text-muted truncate">{label}</p>
        <p className="text-headline-lg text-text tabular-nums mt-0.5 leading-none">{value}</p>
        {hint && <p className="text-label text-text-faint mt-1.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}

function StatusBar({ stats }) {
  const total = stats.todos.total || 1
  const segments = [
    { key: 'pending', count: stats.todos.pending, color: TODO_STATUS.pending.accent },
    { key: 'in-progress', count: stats.todos.inProgress, color: TODO_STATUS['in-progress'].accent },
    { key: 'done', count: stats.todos.done, color: TODO_STATUS.done.accent },
    { key: 'cancelled', count: stats.todos.cancelled, color: TODO_STATUS.cancelled.accent },
  ]

  return (
    <div className="rounded-xl border border-border bg-surface2/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body-sm font-semibold text-text">Todo status</h3>
        <span className="text-label text-text-faint tabular-nums">{stats.todos.total} total</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface overflow-hidden flex">
        {segments.map(s => (
          s.count > 0 ? (
            <div
              key={s.key}
              className="h-full transition-all"
              style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
              title={`${TODO_STATUS[s.key].label}: ${s.count}`}
            />
          ) : null
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-label text-text-muted">
            <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: s.color }} />
            <span>{TODO_STATUS[s.key].label}</span>
            <span className="tabular-nums text-text">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const todos = useTodoStore(s => s.todos)
  const notes = useNoteStore(s => s.notes)
  const folders = useNoteStore(s => s.folders)
  const activeReminders = useNotificationStore(s => s.activeReminders)
  const refreshActiveReminders = useNotificationStore(s => s.refreshActiveReminders)
  const quickReminders = useQuickReminderStore(s => s.items)
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen)
  const level = useGamificationStore(s => s.level)
  const totalXp = useGamificationStore(s => s.totalXp)
  const title = titleForLevel(level)

  useEffect(() => {
    refreshActiveReminders()
  }, [refreshActiveReminders])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

  const stats = computeDashboardStats({ todos, notes, folders, activeReminders, quickReminders })

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
          <LayoutDashboard size={18} className="text-accent flex-none" />
          <h1 className="text-body-md font-semibold text-text truncate">Dashboard</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-3">
          <DashboardAccordion
            id="experience"
            title="Experience"
            summary={`Level ${level} · ${title.name} · ${totalXp} XP`}
            defaultOpen
          >
            <DashboardGamification />
          </DashboardAccordion>

          <DashboardAccordion
            id="overview"
            title="Overview"
            summary={`${stats.notes.total} notes · ${stats.notes.canvas} canvas · ${stats.reminders.quick} quick reminders`}
            defaultOpen
          >
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard
                icon={StickyNote}
                label="Notes"
                value={stats.notes.total}
                hint={`${stats.notes.markdown} markdown · ${stats.notes.canvas} canvas`}
              />
              <StatCard
                icon={ListTodo}
                label="Todos"
                value={stats.todos.total}
                hint={`${stats.todos.pending} pending · ${stats.todos.inProgress} active`}
              />
              <StatCard
                icon={CheckCircle2}
                label="Done today"
                value={stats.todos.doneToday}
                hint={`${stats.todos.done} completed total`}
                accent="text-status-done"
                iconBg="bg-status-done/15"
              />
              <StatCard
                icon={Bell}
                label="Reminders"
                value={stats.reminders.active}
                hint={`${stats.reminders.todos} todos · ${stats.reminders.notes} notes · ${stats.reminders.quick} quick`}
                accent="text-tag-warning"
                iconBg="bg-tag-warning/15"
              />
            </div>

            <StatusBar stats={stats} />

            <div>
              <h3 className="text-label uppercase tracking-wide text-text-faint mb-2 px-0.5">
                Deadlines & schedule
              </h3>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                  icon={CalendarClock}
                  label="Due today"
                  value={stats.todos.dueToday}
                  hint="Open todos with due date today"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Overdue"
                  value={stats.todos.overdue}
                  hint="Past due, not done"
                  accent="text-tag-important"
                  iconBg="bg-tag-important/15"
                />
                <StatCard
                  icon={Clock}
                  label="With deadline"
                  value={stats.todos.withDueDate}
                  hint="Active todos that have a due date"
                />
                <StatCard
                  icon={Flag}
                  label="High priority"
                  value={stats.todos.highPriority}
                  hint="Open high-priority todos"
                  accent="text-priority-high"
                  iconBg="bg-priority-high/15"
                />
              </div>
            </div>

            <div>
              <h3 className="text-label uppercase tracking-wide text-text-faint mb-2 px-0.5">
                Notes & canvas
              </h3>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                  icon={StickyNote}
                  label="Markdown notes"
                  value={stats.notes.markdown}
                  hint="Block editor notes"
                />
                <StatCard
                  icon={LayoutTemplate}
                  label="Canvas notes"
                  value={stats.notes.canvas}
                  hint="Diagram / shape notes"
                />
                <StatCard icon={HardDrive} label="Local notes" value={stats.notes.local} />
                <StatCard icon={Cloud} label="Drive notes" value={stats.notes.drive} />
                <StatCard
                  icon={CalendarClock}
                  label="Calendar notes"
                  value={stats.notes.calendar}
                  hint={stats.notes.calendarToday > 0 ? `${stats.notes.calendarToday} for today` : 'Linked to a calendar day'}
                />
                <StatCard icon={Pin} label="Pinned" value={stats.notes.pinned} />
                <StatCard icon={Folder} label="Folders" value={stats.notes.folders} />
              </div>
            </div>

            <div>
              <h3 className="text-label uppercase tracking-wide text-text-faint mb-2 px-0.5">
                Custom reminders
              </h3>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                  icon={Zap}
                  label="Quick reminders"
                  value={stats.reminders.quick}
                  hint={
                    stats.reminders.quickTotal > stats.reminders.quick
                      ? `${stats.reminders.quick} active · ${stats.reminders.quickTotal} total`
                      : 'Standalone via command palette'
                  }
                  accent="text-tag-warning"
                  iconBg="bg-tag-warning/15"
                />
                <StatCard
                  icon={Bell}
                  label="Todo reminders"
                  value={stats.reminders.todos}
                  hint="Attached to todos"
                />
                <StatCard
                  icon={StickyNote}
                  label="Note reminders"
                  value={stats.reminders.notes}
                  hint="Attached to notes"
                />
                <StatCard
                  icon={Bell}
                  label="All active"
                  value={stats.reminders.active}
                  hint="Scheduled and running"
                />
              </div>
            </div>
          </DashboardAccordion>

          <DashboardAccordion
            id="activity"
            title="Activity report"
            summary="Daily and monthly todo activity"
          >
            <DashboardActivityReport todos={todos} />
          </DashboardAccordion>
        </div>
      </div>
    </div>
  )
}
