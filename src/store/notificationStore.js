import { create } from 'zustand'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron
const MAX_NOTIFICATIONS = 200

async function loadNotifications() {
  if (isElectron) {
    return (await window.api.store.get('notifications')) || []
  }
  const data = localStorage.getItem('otdo-notifications')
  return data ? JSON.parse(data) : []
}

async function persistNotifications(notifications) {
  if (isElectron) {
    await window.api.store.set('notifications', notifications)
  } else {
    localStorage.setItem('otdo-notifications', JSON.stringify(notifications))
  }
}

const useNotificationStore = create((set, get) => ({
  notifications: [],
  activeReminders: [],
  loaded: false,

  init: async () => {
    const notifications = await loadNotifications()
    set({ notifications, loaded: true })
    await get().refreshActiveReminders()
  },

  refreshActiveReminders: async () => {
    if (!window.api?.reminder?.list) {
      set({ activeReminders: [] })
      return
    }
    try {
      const list = await window.api.reminder.list()
      set({ activeReminders: list || [] })
    } catch {
      set({ activeReminders: [] })
    }
  },

  addNotification: async (payload) => {
    const item = {
      id: crypto.randomUUID(),
      type: payload.type || 'general',
      todoId: payload.todoId || null,
      noteId: payload.noteId || null,
      title: payload.title || 'Notification',
      subtitle: payload.subtitle || '',
      body: payload.body || '',
      read: false,
      createdAt: new Date().toISOString(),
    }
    const notifications = [item, ...get().notifications].slice(0, MAX_NOTIFICATIONS)
    set({ notifications })
    await persistNotifications(notifications)
    return item
  },

  markAsRead: async (id) => {
    const notifications = get().notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
    set({ notifications })
    await persistNotifications(notifications)
  },

  markAllAsRead: async () => {
    const notifications = get().notifications.map(n => ({ ...n, read: true }))
    set({ notifications })
    await persistNotifications(notifications)
  },

  deleteNotification: async (id) => {
    const notifications = get().notifications.filter(n => n.id !== id)
    set({ notifications })
    await persistNotifications(notifications)
  },

  clearRead: async () => {
    const notifications = get().notifications.filter(n => !n.read)
    set({ notifications })
    await persistNotifications(notifications)
  },

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}))

export default useNotificationStore
