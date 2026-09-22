import { create } from 'zustand'
import {
  XP_ACTIONS,
  XP_REWARDS,
  actionLabel,
  buildNoteMilestoneAwards,
  buildTodoCompleteAwards,
  computeStreakUpdate,
  createEmptyGamificationState,
  levelFromXp,
  progressInLevel,
  titleForLevel,
  titlesUnlockedAt,
  todayKey,
  trimHistory,
} from '../lib/gamification'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron
const STORE_KEY = 'gamification'

async function loadState() {
  if (isElectron) {
    return (await window.api.store.get(STORE_KEY)) || null
  }
  const data = localStorage.getItem('otdo-gamification')
  return data ? JSON.parse(data) : null
}

async function persistState(state) {
  const payload = {
    totalXp: state.totalXp,
    level: state.level,
    titleId: state.titleId,
    history: state.history,
    awarded: state.awarded,
    streak: state.streak,
    unlockedTitles: state.unlockedTitles,
  }
  if (isElectron) {
    await window.api.store.set(STORE_KEY, payload)
  } else {
    localStorage.setItem('otdo-gamification', JSON.stringify(payload))
  }
}

function normalizeLoaded(raw) {
  const empty = createEmptyGamificationState()
  if (!raw || typeof raw !== 'object') return empty
  const totalXp = Math.max(0, Number(raw.totalXp) || 0)
  const level = levelFromXp(totalXp)
  const title = titleForLevel(level)
  return {
    ...empty,
    totalXp,
    level,
    titleId: title.id,
    history: Array.isArray(raw.history) ? raw.history : [],
    awarded: raw.awarded && typeof raw.awarded === 'object' ? raw.awarded : {},
    streak: {
      current: Math.max(0, Number(raw.streak?.current) || 0),
      best: Math.max(0, Number(raw.streak?.best) || 0),
      lastActiveDate: raw.streak?.lastActiveDate || null,
    },
    unlockedTitles: Array.isArray(raw.unlockedTitles)
      ? raw.unlockedTitles
      : titlesUnlockedAt(level).map(t => t.id),
  }
}

const MAX_TOASTS = 4

function pushToasts(existing, items) {
  return [...items, ...(existing || [])].slice(0, MAX_TOASTS)
}

const useGamificationStore = create((set, get) => ({
  ...createEmptyGamificationState(),
  loaded: false,
  lastLevelUp: null,
  toasts: [],
  xpPulseAt: 0,

  init: async () => {
    const raw = await loadState()
    const state = normalizeLoaded(raw)
    set({ ...state, loaded: true, lastLevelUp: null, toasts: [], xpPulseAt: 0 })
  },

  getProgress: () => progressInLevel(get().totalXp),

  getTitle: () => titleForLevel(get().level),

  getUnlockedTitles: () => titlesUnlockedAt(get().level),

  dismissToast: (id) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },

  award: async (awards) => {
    const list = (Array.isArray(awards) ? awards : [awards]).filter(Boolean)
    if (!list.length) return { gained: 0, leveledUp: false }

    const state = get()
    const awarded = { ...state.awarded }
    const entries = []
    let gained = 0

    for (const item of list) {
      const amount = Math.max(0, Number(item.amount) || 0)
      if (!amount) continue
      if (item.sourceKey && awarded[item.sourceKey]) continue

      if (item.sourceKey) awarded[item.sourceKey] = true
      gained += amount
      entries.push({
        id: crypto.randomUUID(),
        action: item.action,
        amount,
        label: item.label || actionLabel(item.action),
        at: new Date().toISOString(),
        sourceKey: item.sourceKey || null,
      })
    }

    if (!gained) return { gained: 0, leveledUp: false }

    const { streak, isNewDay, bonusEligible } = computeStreakUpdate(state.streak)
    if (isNewDay && bonusEligible) {
      const streakKey = `streak:${todayKey()}`
      if (!awarded[streakKey]) {
        awarded[streakKey] = true
        const bonus = XP_REWARDS[XP_ACTIONS.STREAK_BONUS]
        gained += bonus
        entries.push({
          id: crypto.randomUUID(),
          action: XP_ACTIONS.STREAK_BONUS,
          amount: bonus,
          label: actionLabel(XP_ACTIONS.STREAK_BONUS, { days: streak.current }),
          at: new Date().toISOString(),
          sourceKey: streakKey,
        })
      }
    }

    const totalXp = state.totalXp + gained
    const level = levelFromXp(totalXp)
    const title = titleForLevel(level)
    const unlockedTitles = titlesUnlockedAt(level).map(t => t.id)
    const leveledUp = level > state.level
    const history = trimHistory([...entries, ...state.history])
    const now = new Date().toISOString()

    const newToasts = [{
      id: crypto.randomUUID(),
      type: 'xp',
      amount: gained,
      label: entries[0]?.label || 'Experience gained',
      detail: entries.length > 1
        ? entries.slice(1).map(e => `+${e.amount}`).join(' · ')
        : null,
      at: now,
    }]

    if (leveledUp) {
      newToasts.unshift({
        id: crypto.randomUUID(),
        type: 'levelup',
        from: state.level,
        to: level,
        title: title.name,
        at: now,
      })
    }

    const next = {
      totalXp,
      level,
      titleId: title.id,
      history,
      awarded,
      streak: isNewDay ? streak : state.streak,
      unlockedTitles,
      lastLevelUp: leveledUp
        ? { from: state.level, to: level, title: title.name, at: now }
        : state.lastLevelUp,
      toasts: pushToasts(state.toasts, newToasts),
      xpPulseAt: Date.now(),
    }

    set(next)
    await persistState({ ...state, ...next })
    return { gained, leveledUp, level, title }
  },

  awardTodoComplete: async (todo) => {
    if (!todo?.id) return { gained: 0 }
    return get().award(buildTodoCompleteAwards(todo))
  },

  awardTodoInProgress: async (todo) => {
    if (!todo?.id) return { gained: 0 }
    return get().award({
      action: XP_ACTIONS.TODO_IN_PROGRESS,
      amount: XP_REWARDS[XP_ACTIONS.TODO_IN_PROGRESS],
      sourceKey: `todo:progress:${todo.id}`,
      label: actionLabel(XP_ACTIONS.TODO_IN_PROGRESS, { title: todo.title }),
    })
  },

  awardNoteCreate: async (note) => {
    if (!note?.id) return { gained: 0 }
    return get().award({
      action: XP_ACTIONS.NOTE_CREATE,
      amount: XP_REWARDS[XP_ACTIONS.NOTE_CREATE],
      sourceKey: `note:create:${note.id}`,
      label: actionLabel(XP_ACTIONS.NOTE_CREATE, { name: note.name }),
    })
  },

  awardFolderCreate: async (folder) => {
    if (!folder?.id) return { gained: 0 }
    return get().award({
      action: XP_ACTIONS.FOLDER_CREATE,
      amount: XP_REWARDS[XP_ACTIONS.FOLDER_CREATE],
      sourceKey: `folder:create:${folder.id}`,
      label: actionLabel(XP_ACTIONS.FOLDER_CREATE, { name: folder.name }),
    })
  },

  awardNotePin: async (note) => {
    if (!note?.id) return { gained: 0 }
    return get().award({
      action: XP_ACTIONS.NOTE_PIN,
      amount: XP_REWARDS[XP_ACTIONS.NOTE_PIN],
      sourceKey: `note:pin:${note.id}`,
      label: actionLabel(XP_ACTIONS.NOTE_PIN, { name: note.name }),
    })
  },

  awardReminderSet: async (scope, id) => {
    if (!id) return { gained: 0 }
    return get().award({
      action: XP_ACTIONS.REMINDER_SET,
      amount: XP_REWARDS[XP_ACTIONS.REMINDER_SET],
      sourceKey: `reminder:${scope}:${id}`,
      label: actionLabel(XP_ACTIONS.REMINDER_SET),
    })
  },

  awardNoteMilestones: async (noteId, content) => {
    if (!noteId) return { gained: 0 }
    const awards = buildNoteMilestoneAwards(noteId, content, get().awarded)
    if (!awards.length) return { gained: 0 }
    return get().award(awards)
  },

  clearLastLevelUp: () => set({ lastLevelUp: null }),
}))

export default useGamificationStore
