import { create } from 'zustand'
import {
  bindDriveSettingsSync,
  normalizeDriveSettings,
  refreshDriveSessionOnInit,
} from '../lib/driveAuth'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

export const DEFAULTS = {
  theme: 'dark',
  notesPath: '',
  exportFormat: 'html',
  appFontSize: 'md',
  editorLineNumbers: false,
  editorSpellCheck: false,
  editorFontSize: 'md',
  editorPaddingTop: 48,
  editorPaddingLeft: 32,
  editorPaddingRight: 32,
  editorPaddingBottom: 128,
  editorMaxWidth: 'md',
  editorAlign: 'center',
  editorShowBounds: false,
  showDoneTodos: true,
  showCancelledTodos: true,
  noteTodoFilter: 'all',
  noteTodoSort: 'document',
  sidebarOpen: true,
  sidebarLocalOpen: true,
  sidebarDriveOpen: true,
  editorAutoSaveMs: 1500,
  gdAutoSyncMs: 5000,
  gdClientId: '',
  gdClientSecret: '',
  gdFolderPath: 'OTDO Notes',
  gdAccessToken: null,
  gdRefreshToken: null,
  gdConnected: false,
  telegramBotToken: '',
  telegramChatId: '',
  telegramConnected: false,
  reminderSound: 'Ping',
  trashRetentionDays: 14,
}

let persistTimer = null

export function pickSettings(state) {
  return Object.fromEntries(
    Object.keys(DEFAULTS).map(key => [key, state[key] ?? DEFAULTS[key]])
  )
}

async function persistSettings(settings) {
  const payload = pickSettings(settings)
  if (isElectron) {
    await window.api.store.set('settings', payload)
  } else {
    localStorage.setItem('otdo-settings', JSON.stringify(payload))
  }
  return payload
}

async function loadSettings() {
  if (isElectron) {
    const raw = (await window.api.store.get('settings')) || {}
    return pickSettings({ ...DEFAULTS, ...raw })
  }
  const data = localStorage.getItem('otdo-settings')
  return data ? pickSettings({ ...DEFAULTS, ...JSON.parse(data) }) : { ...DEFAULTS }
}

const useSettingsStore = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  init: async () => {
    bindDriveSettingsSync(patch => set(patch))

    const raw = await loadSettings()
    const settings = normalizeDriveSettings(raw)
    set({ ...settings, loaded: true })

    if (settings !== raw) {
      await persistSettings({ ...settings, loaded: true })
    }

    try {
      await refreshDriveSessionOnInit()
    } catch {
      // Drive session refresh is best-effort on startup
    }

    return get()
  },

  update: (data, immediate = false) => {
    set(data)
    if (immediate) {
      return get().flush()
    }
    get().schedulePersist()
  },

  schedulePersist: () => {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      get().flush()
    }, 400)
  },

  flush: async () => {
    clearTimeout(persistTimer)
    return persistSettings(get())
  },

  browseNotesPath: async () => {
    if (!isElectron) return null
    const path = await window.api.dialog.openDirectory()
    if (path) {
      await get().update({ notesPath: path }, true)
    }
    return path || null
  },

  testTelegram: async () => {
    const { telegramBotToken, telegramChatId } = get()
    if (!telegramBotToken || !telegramChatId) {
      return { ok: false, error: 'Bot token and Chat ID required' }
    }
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: '✅ OTDO connected! Your reminders will be sent here.',
          }),
        }
      )
      const data = await res.json()
      if (data.ok) {
        await get().update({ telegramConnected: true }, true)
        return { ok: true }
      }
      return { ok: false, error: data.description }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  },
}))

export default useSettingsStore
