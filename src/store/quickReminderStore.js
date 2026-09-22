import { create } from 'zustand'
import useSettingsStore from './settingsStore'
import useNotificationStore from './notificationStore'
import useGamificationStore from './gamificationStore'
import {
  isQuickReminderId,
  quickReminderId,
  syncQuickReminder,
} from '../lib/quickReminders'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

async function loadQuickReminders() {
  if (isElectron) {
    return (await window.api.store.get('quickReminders')) || []
  }
  const data = localStorage.getItem('otdo-quick-reminders')
  return data ? JSON.parse(data) : []
}

async function persistQuickReminders(items) {
  if (isElectron) {
    await window.api.store.set('quickReminders', items)
  } else {
    localStorage.setItem('otdo-quick-reminders', JSON.stringify(items))
  }
}

const useQuickReminderStore = create((set, get) => ({
  items: [],
  loaded: false,

  init: async () => {
    const items = await loadQuickReminders()
    set({ items, loaded: true })
    const settings = useSettingsStore.getState()
    if (window.api?.reminder) {
      for (const item of items) {
        if (item.reminder?.enabled) {
          await syncQuickReminder(item, settings)
        }
      }
    }
    useNotificationStore.getState().refreshActiveReminders()
  },

  addQuickReminder: async ({ title, reminder }) => {
    const now = new Date().toISOString()
    const item = {
      id: crypto.randomUUID(),
      title: String(title || '').trim() || 'Reminder',
      reminder: {
        enabled: true,
        type: reminder?.type || 'once',
        time: reminder?.time || '09:00',
        dayOfWeek: reminder?.dayOfWeek ?? new Date().getDay(),
        at: reminder?.at || null,
        telegram: !!reminder?.telegram,
      },
      createdAt: now,
    }
    const items = [item, ...get().items]
    set({ items })
    await persistQuickReminders(items)
    const settings = useSettingsStore.getState()
    await syncQuickReminder(item, settings)
    useNotificationStore.getState().refreshActiveReminders()
    await useGamificationStore.getState().awardReminderSet('quick', item.id)
    return item
  },

  disableQuickReminder: async (id) => {
    const rawId = isQuickReminderId(id) ? id.slice('quick:'.length) : id
    const item = get().items.find(r => r.id === rawId)
    if (!item?.reminder?.enabled) {
      if (window.api?.reminder) {
        await window.api.reminder.cancel(quickReminderId(rawId))
      }
      return
    }
    const updated = {
      ...item,
      reminder: { ...item.reminder, enabled: false },
    }
    const items = get().items.map(r => (r.id === rawId ? updated : r))
    set({ items })
    await persistQuickReminders(items)
    if (window.api?.reminder) {
      await window.api.reminder.cancel(quickReminderId(rawId))
    }
    useNotificationStore.getState().refreshActiveReminders()
  },

  removeQuickReminder: async (id) => {
    const rawId = isQuickReminderId(id) ? id.slice('quick:'.length) : id
    if (window.api?.reminder) {
      await window.api.reminder.cancel(quickReminderId(rawId))
    }
    const items = get().items.filter(r => r.id !== rawId)
    set({ items })
    await persistQuickReminders(items)
    useNotificationStore.getState().refreshActiveReminders()
  },
}))

export default useQuickReminderStore
