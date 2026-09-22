import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import EditorPage from './components/editor/EditorPage'
import SettingsPage from './components/settings/SettingsPage'
import GraphPage from './components/graph/GraphPage'
import NotificationsPage from './components/notifications/NotificationsPage'
import DashboardPage from './components/dashboard/DashboardPage'
import HelpPage from './components/help/HelpPage'
import useTodoStore from './store/todoStore'
import useNoteStore from './store/noteStore'
import useSettingsStore from './store/settingsStore'
import useNotificationStore from './store/notificationStore'
import useQuickReminderStore from './store/quickReminderStore'
import useGamificationStore from './store/gamificationStore'
import { startPolling, stopPolling, handleCommand } from './services/telegram'
import FontScaleEffect from './components/common/FontScaleEffect'
import AppLogo from './components/common/AppLogo'
import { isQuickReminderId } from './lib/quickReminders'

export default function App() {
  const loaded       = useSettingsStore(s => s.loaded)
  const initTodos    = useTodoStore(s => s.init)
  const initNotes    = useNoteStore(s => s.init)
  const initSettings = useSettingsStore(s => s.init)
  const initNotifications = useNotificationStore(s => s.init)
  const initQuickReminders = useQuickReminderStore(s => s.init)
  const initGamification = useGamificationStore(s => s.init)
  const addNotification = useNotificationStore(s => s.addNotification)
  const refreshActiveReminders = useNotificationStore(s => s.refreshActiveReminders)
  const notifications = useNotificationStore(s => s.notifications)
  const notificationsLoaded = useNotificationStore(s => s.loaded)
  const disableReminder = useTodoStore(s => s.disableReminder)
  const disableNoteReminder = useNoteStore(s => s.disableNoteReminder)
  const disableQuickReminder = useQuickReminderStore(s => s.disableQuickReminder)
  const flush              = useSettingsStore(s => s.flush)
  const flushAllOpenDrafts = useNoteStore(s => s.flushAllOpenDrafts)
  const telegramConnected = useSettingsStore(s => s.telegramConnected)
  const telegramBotToken  = useSettingsStore(s => s.telegramBotToken)
  const telegramChatId    = useSettingsStore(s => s.telegramChatId)

  useEffect(() => {
    initSettings().then(async () => {
      await initTodos()
      await initNotes()
      await initNotifications()
      await initQuickReminders()
      await initGamification()
    })
  }, [])

  useEffect(() => {
    if (!notificationsLoaded || !window.api?.dock?.setBadge) return
    const count = notifications.filter(n => !n.read).length
    window.api.dock.setBadge(count)
  }, [notifications, notificationsLoaded])

  useEffect(() => {
    if (!loaded || !window.api?.onNotificationPush) return
    const unsubscribe = window.api.onNotificationPush(async (payload) => {
      await addNotification(payload)
      await refreshActiveReminders()
    })
    return unsubscribe
  }, [loaded, addNotification, refreshActiveReminders])

  useEffect(() => {
    if (!loaded || !window.api?.onReminderExpired) return
    const unsubscribe = window.api.onReminderExpired(async ({ id, scope, noteId }) => {
      if (scope === 'note' && noteId) {
        await disableNoteReminder(noteId)
      } else if (scope === 'quick' || isQuickReminderId(id)) {
        await disableQuickReminder(id)
      } else if (scope !== 'note') {
        await disableReminder(id)
      }
      await refreshActiveReminders()
    })
    return unsubscribe
  }, [loaded, disableReminder, disableNoteReminder, disableQuickReminder, refreshActiveReminders])

  useEffect(() => {
    const saveOnExit = () => {
      flush()
      flushAllOpenDrafts()
    }
    window.addEventListener('beforeunload', saveOnExit)
    return () => window.removeEventListener('beforeunload', saveOnExit)
  }, [flush, flushAllOpenDrafts])

  useEffect(() => {
    if (!loaded) return
    if (telegramConnected && telegramBotToken && telegramChatId) {
      startPolling(telegramBotToken, telegramChatId, (cmd, args, token, chatId) => {
        handleCommand(cmd, args, token, chatId)
      })
    }
    return () => stopPolling()
  }, [loaded, telegramConnected, telegramBotToken, telegramChatId])

  if (!loaded) {
    return (
      <div className="h-screen bg-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <AppLogo size={48} className="mx-auto" />
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body-sm text-text-muted">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <FontScaleEffect />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<EditorPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
