import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft, Bell, BellOff, BellRing, Check, CheckCheck, Trash2, Clock, Send,
} from 'lucide-react'
import useNotificationStore from '../../store/notificationStore'
import useSettingsStore from '../../store/settingsStore'
import useTodoStore from '../../store/todoStore'
import { SidebarOpenButton } from '../layout/SidebarToggle'
import { isMac } from '../../lib/platform'
import { MAC_TITLEBAR_HEIGHT, APP_HEADER_HEIGHT } from '../../lib/editorLayout'
import { REMINDER_TYPE_OPTIONS, reminderWeekdayLabel } from '../../lib/reminderTypes'

function reminderTypeLabel(type) {
  return REMINDER_TYPE_OPTIONS.find(o => o.value === type)?.label || type
}

function formatReminderSchedule(item) {
  const typeLabel = reminderTypeLabel(item.type)
  if (item.type === 'once' && item.at) {
    return `${typeLabel} · ${format(new Date(item.at), 'MMM d, HH:mm')}`
  }
  if (item.type === 'hourly') return `${typeLabel} at :${item.time.split(':')[1]}`
  if (item.type === 'weekly' || item.type === 'monthly') {
    const day = reminderWeekdayLabel(item.dayOfWeek)
    return `${typeLabel} · ${day} ${item.time}`
  }
  return `${typeLabel} · ${item.time}`
}

function NotificationRow({ item, onMarkRead, onDelete }) {
  return (
    <div
      className={`group flex gap-3 px-4 py-3 border-b border-border transition-colors ${
        item.read ? 'bg-transparent opacity-75' : 'bg-accent/[0.04]'
      }`}
    >
      <div className={`mt-0.5 flex-none w-2 h-2 rounded-full ${item.read ? 'bg-transparent' : 'bg-accent'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <BellRing size={14} className="text-accent flex-none mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={`text-body-sm truncate ${item.read ? 'text-text-muted' : 'text-text font-medium'}`}>
              {item.title}
            </p>
            {item.subtitle && (
              <p className="text-label text-text-faint truncate mt-0.5">{item.subtitle}</p>
            )}
            {item.body && (
              <p className="text-body-sm text-text-muted mt-1 whitespace-pre-line line-clamp-3">{item.body}</p>
            )}
            <p className="text-label text-text-faint mt-1.5">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.read && (
          <button
            type="button"
            title="Mark as read"
            onClick={() => onMarkRead(item.id)}
            className="p-1.5 rounded-lg text-text-faint hover:text-accent hover:bg-surface2"
          >
            <Check size={14} />
          </button>
        )}
        <button
          type="button"
          title="Delete"
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg text-text-faint hover:text-tag-important hover:bg-surface2"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function ActiveReminderRow({ item, onCancel, cancelling }) {
  const isNote = item.scope === 'note'
  const isQuick = item.scope === 'quick'
  const scopeLabel = isNote ? 'Note reminder · ' : isQuick ? 'Quick reminder · ' : ''
  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-border">
      <Clock size={14} className="text-tag-warning flex-none mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text font-medium truncate">{item.todoTitle}</p>
        <p className="text-label text-text-muted mt-0.5">
          {scopeLabel}
          {formatReminderSchedule(item)}
        </p>
        <p className="text-label text-text-faint mt-1">
          Next: {format(new Date(item.nextFireAt), 'MMM d, HH:mm')}
          {' · '}
          {formatDistanceToNow(new Date(item.nextFireAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex-none flex items-center gap-2">
        {item.telegramEnabled && (
          <span className="flex items-center gap-1 text-label text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            <Send size={10} />
            Telegram
          </span>
        )}
        <button
          type="button"
          title="Cancel reminder"
          disabled={cancelling}
          onClick={() => onCancel(item.id)}
          className="p-1.5 rounded-lg text-text-faint hover:text-tag-important hover:bg-surface2
                     opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
        >
          <BellOff size={14} />
        </button>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen)
  const telegramConnected = useSettingsStore(s => s.telegramConnected)

  const notifications = useNotificationStore(s => s.notifications)
  const activeReminders = useNotificationStore(s => s.activeReminders)
  const markAsRead = useNotificationStore(s => s.markAsRead)
  const markAllAsRead = useNotificationStore(s => s.markAllAsRead)
  const deleteNotification = useNotificationStore(s => s.deleteNotification)
  const clearRead = useNotificationStore(s => s.clearRead)
  const refreshActiveReminders = useNotificationStore(s => s.refreshActiveReminders)
  const disableReminder = useTodoStore(s => s.disableReminder)

  const [cancellingId, setCancellingId] = useState(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const handleCancelReminder = async (reminderId) => {
    setCancellingId(reminderId)
    try {
      await disableReminder(reminderId)
      await refreshActiveReminders()
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    refreshActiveReminders()
    const interval = setInterval(refreshActiveReminders, 30_000)
    return () => clearInterval(interval)
  }, [refreshActiveReminders])

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
          <Bell size={18} className="text-accent flex-none" />
          <h1 className="text-body-md font-semibold text-text truncate">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-label bg-accent text-white px-1.5 py-0.5 rounded-full tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm
                         text-text-muted hover:bg-surface2 hover:text-text transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          {notifications.some(n => n.read) && (
            <button
              type="button"
              onClick={clearRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm
                         text-text-muted hover:bg-surface2 hover:text-text transition-colors"
            >
              <Trash2 size={14} />
              Clear read
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeReminders.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 px-4 py-2.5 bg-surface border-b border-border">
              <h2 className="text-label text-text-faint uppercase tracking-wider">
                Active reminders ({activeReminders.length})
              </h2>
              <p className="text-label text-text-faint mt-0.5">
                Scheduled while OTDO is running
                {telegramConnected ? ' · Telegram enabled items will also send on fire' : ''}
              </p>
            </div>
            {activeReminders.map(item => (
              <ActiveReminderRow
                key={item.id}
                item={item}
                onCancel={handleCancelReminder}
                cancelling={cancellingId === item.id}
              />
            ))}
          </section>
        )}

        <section>
          <div className="sticky top-0 z-10 px-4 py-2.5 bg-surface border-b border-border">
            <h2 className="text-label text-text-faint uppercase tracking-wider">
              History ({notifications.length})
            </h2>
          </div>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-faint gap-3">
              <Bell size={40} strokeWidth={1} />
              <p className="text-body-sm">No notifications yet</p>
              <p className="text-label text-text-faint max-w-xs text-center">
                Reminder alerts will appear here when they fire
              </p>
            </div>
          ) : (
            notifications.map(item => (
              <NotificationRow
                key={item.id}
                item={item}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
