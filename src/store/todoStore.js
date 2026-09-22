import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { enrichTodoPatch, nowISO, syncTodoReminder } from '../lib/todoStatus'
import { applyLongTitleDescription } from '../lib/todoTitle'
import { shouldShowTodo } from '../lib/todoVisibility'
import useSettingsStore from './settingsStore'
import useNotificationStore from './notificationStore'
import useNoteStore from './noteStore'
import { parseNoteReminderId } from '../lib/noteReminders'
import { isQuickReminderId } from '../lib/quickReminders'
import useQuickReminderStore from './quickReminderStore'
import useGamificationStore from './gamificationStore'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

async function loadAppSettings() {
  if (isElectron) {
    return (await window.api.store.get('settings')) || {}
  }
  const data = localStorage.getItem('otdo-settings')
  return data ? JSON.parse(data) : {}
}

async function persistTodos(todos) {
  if (isElectron) {
    await window.api.store.set('todos', todos)
  } else {
    localStorage.setItem('otdo-todos', JSON.stringify(todos))
  }
}

async function loadTodos() {
  if (isElectron) {
    return (await window.api.store.get('todos')) || []
  }
  const data = localStorage.getItem('otdo-todos')
  return data ? JSON.parse(data) : []
}

const useTodoStore = create(
  subscribeWithSelector((set, get) => ({
    todos: [],
    selectedTodoId: null,
    filter: 'all', // all | pending | in-progress | done | cancelled
    sortBy: 'createdAt', // createdAt | dueDate | priority
    searchQuery: '',

    // Load from persistence
    init: async () => {
      const todos = await loadTodos()
      set({ todos })
      if (window.api?.reminder) {
        const settings = await loadAppSettings()
        for (const todo of todos) {
          if (todo.reminder?.enabled) {
            await syncTodoReminder(todo, settings)
          }
        }
      }
      useNotificationStore.getState().refreshActiveReminders()
    },

    addTodo: async (data) => {
      const { title, description } = applyLongTitleDescription({
        title: data.title,
        description: data.description || '',
      })
      const todo = {
        id: crypto.randomUUID(),
        title,
        description,
        status: 'pending',
        priority: data.priority || 'medium',
        tag: data.tag || null,
        startDate: data.startDate ?? nowISO(),
        dueDate: data.dueDate || null,
        cancelDate: data.cancelDate || null,
        completedAt: null,
        reminder: data.reminder || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const todos = [...get().todos, todo]
      set({ todos, selectedTodoId: todo.id })
      await persistTodos(todos)
      if (todo.reminder?.enabled) {
        const settings = await loadAppSettings()
        await syncTodoReminder(todo, settings)
        useNotificationStore.getState().refreshActiveReminders()
        await useGamificationStore.getState().awardReminderSet('todo', todo.id)
      }
      return todo
    },

    updateTodo: async (id, data) => {
      const existing = get().todos.find(t => t.id === id)
      const patch = enrichTodoPatch(existing, data)

      if (data.title !== undefined || data.description !== undefined) {
        const applied = applyLongTitleDescription({
          title: data.title !== undefined ? data.title : existing?.title,
          description: data.description !== undefined ? data.description : existing?.description,
          previousTitle: existing?.title,
        })
        if (data.title !== undefined) patch.title = applied.title
        if (data.description !== undefined || data.title !== undefined) {
          patch.description = applied.description
        }
      }
      const todos = get().todos.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      )
      set({ todos })
      await persistTodos(todos)

      const updated = get().todos.find(t => t.id === id)
      const reminderChanged = data.reminder !== undefined
      const reminderContentChanged = updated?.reminder?.enabled && (
        data.title !== undefined
        || data.priority !== undefined
        || data.status !== undefined
        || data.dueDate !== undefined
      )

      if (reminderChanged || reminderContentChanged) {
        const settings = await loadAppSettings()
        await syncTodoReminder(updated, settings)
        useNotificationStore.getState().refreshActiveReminders()
      }

      if (
        data.title !== undefined
        || data.priority !== undefined
        || data.status !== undefined
        || data.dueDate !== undefined
      ) {
        await useNoteStore.getState().refreshRemindersForTodo(id)
      }

      if (updated) {
        const gamification = useGamificationStore.getState()
        if (patch.status === 'done' && existing?.status !== 'done') {
          await gamification.awardTodoComplete(updated)
        } else if (patch.status === 'in-progress' && existing?.status !== 'in-progress') {
          await gamification.awardTodoInProgress(updated)
        }
        if (
          data.reminder?.enabled
          && !existing?.reminder?.enabled
        ) {
          await gamification.awardReminderSet('todo', id)
        }
      }
    },

    deleteTodo: async (id) => {
      if (window.api?.reminder) window.api.reminder.cancel(id)
      const todos = get().todos.filter(t => t.id !== id)
      const selectedTodoId = get().selectedTodoId === id ? null : get().selectedTodoId
      set({ todos, selectedTodoId })
      await persistTodos(todos)
      await useNoteStore.getState().refreshRemindersForTodo(id)
      useNotificationStore.getState().refreshActiveReminders()
    },

    disableReminder: async (id) => {
      const noteId = parseNoteReminderId(id)
      if (noteId) {
        await useNoteStore.getState().disableNoteReminder(noteId)
        return
      }
      if (isQuickReminderId(id)) {
        await useQuickReminderStore.getState().disableQuickReminder(id)
        return
      }
      const todo = get().todos.find(t => t.id === id)
      if (!todo?.reminder?.enabled) return
      await get().updateTodo(id, {
        reminder: { ...todo.reminder, enabled: false },
      })
    },

    setStatus: async (id, status) => {
      await get().updateTodo(id, { status })
    },

    selectTodo: (id) => set({ selectedTodoId: id }),

    setFilter: (filter) => set({ filter }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSearch: (searchQuery) => set({ searchQuery }),

    getFiltered: () => {
      const { todos, filter, sortBy, searchQuery } = get()
      let result = [...todos]

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        result = result.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        )
      }

      if (filter !== 'all') {
        result = result.filter(t => t.status === filter)
      } else {
        const { showDoneTodos, showCancelledTodos } = useSettingsStore.getState()
        result = result.filter(t => shouldShowTodo(t, showDoneTodos, showCancelledTodos))
      }

      result.sort((a, b) => {
        if (sortBy === 'dueDate') {
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate) - new Date(b.dueDate)
        }
        if (sortBy === 'priority') {
          const order = { high: 0, medium: 1, low: 2 }
          return order[a.priority] - order[b.priority]
        }
        return new Date(b.createdAt) - new Date(a.createdAt)
      })

      return result
    },
  }))
)

export default useTodoStore
