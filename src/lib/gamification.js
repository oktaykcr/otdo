export const XP_ACTIONS = {
  TODO_COMPLETE: 'todo_complete',
  TODO_COMPLETE_HIGH: 'todo_complete_high',
  TODO_COMPLETE_ON_TIME: 'todo_complete_on_time',
  TODO_IN_PROGRESS: 'todo_in_progress',
  NOTE_CREATE: 'note_create',
  NOTE_MILESTONE: 'note_milestone',
  FOLDER_CREATE: 'folder_create',
  NOTE_PIN: 'note_pin',
  REMINDER_SET: 'reminder_set',
  STREAK_BONUS: 'streak_bonus',
}

export const XP_REWARDS = {
  [XP_ACTIONS.TODO_COMPLETE]: 25,
  [XP_ACTIONS.TODO_COMPLETE_HIGH]: 10,
  [XP_ACTIONS.TODO_COMPLETE_ON_TIME]: 15,
  [XP_ACTIONS.TODO_IN_PROGRESS]: 5,
  [XP_ACTIONS.NOTE_CREATE]: 10,
  [XP_ACTIONS.FOLDER_CREATE]: 5,
  [XP_ACTIONS.NOTE_PIN]: 5,
  [XP_ACTIONS.REMINDER_SET]: 8,
  [XP_ACTIONS.STREAK_BONUS]: 20,
}

export const NOTE_MILESTONES = [
  { chars: 500, xp: 15, label: 'Note reached 500 characters' },
  { chars: 2000, xp: 30, label: 'Note reached 2,000 characters' },
  { chars: 5000, xp: 50, label: 'Note reached 5,000 characters' },
  { chars: 10000, xp: 80, label: 'Note reached 10,000 characters' },
]

export const TITLES = [
  { id: 'novice', name: 'Novice', minLevel: 1, description: 'Just getting started' },
  { id: 'apprentice', name: 'Apprentice', minLevel: 3, description: 'Building daily habits' },
  { id: 'scribe', name: 'Scribe', minLevel: 5, description: 'Notes are taking shape' },
  { id: 'organizer', name: 'Organizer', minLevel: 8, description: 'Tasks under control' },
  { id: 'taskmaster', name: 'Taskmaster', minLevel: 12, description: 'Completion machine' },
  { id: 'scholar', name: 'Scholar', minLevel: 16, description: 'Deep note taker' },
  { id: 'productivity_pro', name: 'Productivity Pro', minLevel: 20, description: 'Systems thinker' },
  { id: 'knowledge_keeper', name: 'Knowledge Keeper', minLevel: 25, description: 'Vault of ideas' },
  { id: 'master_planner', name: 'Master Planner', minLevel: 30, description: 'Plans that stick' },
  { id: 'legend', name: 'Legend', minLevel: 40, description: 'Peak productivity' },
]

const MAX_HISTORY = 50

export function xpForLevel(level) {
  if (level <= 1) return 0
  return Math.floor(80 * Math.pow(level - 1, 1.45))
}

export function levelFromXp(totalXp) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) {
    level += 1
    if (level >= 99) break
  }
  return level
}

export function titleForLevel(level) {
  let current = TITLES[0]
  for (const title of TITLES) {
    if (level >= title.minLevel) current = title
  }
  return current
}

export function titlesUnlockedAt(level) {
  return TITLES.filter(t => level >= t.minLevel)
}

export function progressInLevel(totalXp) {
  const level = levelFromXp(totalXp)
  const currentFloor = xpForLevel(level)
  const nextFloor = xpForLevel(level + 1)
  const into = Math.max(0, totalXp - currentFloor)
  const needed = Math.max(1, nextFloor - currentFloor)
  return {
    level,
    currentXp: into,
    neededXp: needed,
    percent: Math.min(100, Math.round((into / needed) * 100)),
    totalXp,
    nextLevelAt: nextFloor,
  }
}

export function actionLabel(action, meta = {}) {
  switch (action) {
    case XP_ACTIONS.TODO_COMPLETE:
      return meta.title ? `Completed: ${meta.title}` : 'Completed a todo'
    case XP_ACTIONS.TODO_COMPLETE_HIGH:
      return 'High-priority bonus'
    case XP_ACTIONS.TODO_COMPLETE_ON_TIME:
      return 'On-time completion bonus'
    case XP_ACTIONS.TODO_IN_PROGRESS:
      return meta.title ? `Started: ${meta.title}` : 'Started a todo'
    case XP_ACTIONS.NOTE_CREATE:
      return meta.name ? `Created note: ${meta.name}` : 'Created a note'
    case XP_ACTIONS.NOTE_MILESTONE:
      return meta.label || 'Note milestone'
    case XP_ACTIONS.FOLDER_CREATE:
      return meta.name ? `Created folder: ${meta.name}` : 'Created a folder'
    case XP_ACTIONS.NOTE_PIN:
      return meta.name ? `Pinned: ${meta.name}` : 'Pinned a note'
    case XP_ACTIONS.REMINDER_SET:
      return 'Set a reminder'
    case XP_ACTIONS.STREAK_BONUS:
      return meta.days ? `${meta.days}-day streak bonus` : 'Streak bonus'
    default:
      return 'Experience gained'
  }
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function yesterdayKey(date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

export function computeStreakUpdate(streak, activeDateKey = todayKey()) {
  const prev = streak || { current: 0, best: 0, lastActiveDate: null }
  if (prev.lastActiveDate === activeDateKey) {
    return { streak: prev, isNewDay: false, bonusEligible: false }
  }

  let current = 1
  if (prev.lastActiveDate === yesterdayKey()) {
    current = (prev.current || 0) + 1
  }

  const next = {
    current,
    best: Math.max(prev.best || 0, current),
    lastActiveDate: activeDateKey,
  }

  return {
    streak: next,
    isNewDay: true,
    bonusEligible: current >= 2,
  }
}

export function buildTodoCompleteAwards(todo) {
  const awards = []
  const title = todo?.title || 'Todo'
  awards.push({
    action: XP_ACTIONS.TODO_COMPLETE,
    amount: XP_REWARDS[XP_ACTIONS.TODO_COMPLETE],
    sourceKey: `todo:done:${todo.id}`,
    label: actionLabel(XP_ACTIONS.TODO_COMPLETE, { title }),
  })

  if (todo.priority === 'high') {
    awards.push({
      action: XP_ACTIONS.TODO_COMPLETE_HIGH,
      amount: XP_REWARDS[XP_ACTIONS.TODO_COMPLETE_HIGH],
      sourceKey: `todo:done-high:${todo.id}`,
      label: actionLabel(XP_ACTIONS.TODO_COMPLETE_HIGH),
    })
  }

  if (todo.dueDate) {
    const due = new Date(todo.dueDate)
    if (!Number.isNaN(due.getTime()) && due >= new Date()) {
      awards.push({
        action: XP_ACTIONS.TODO_COMPLETE_ON_TIME,
        amount: XP_REWARDS[XP_ACTIONS.TODO_COMPLETE_ON_TIME],
        sourceKey: `todo:done-ontime:${todo.id}`,
        label: actionLabel(XP_ACTIONS.TODO_COMPLETE_ON_TIME),
      })
    }
  }

  return awards
}

export function buildNoteMilestoneAwards(noteId, content, alreadyAwarded = {}) {
  const chars = (content || '').length
  const awards = []
  for (const milestone of NOTE_MILESTONES) {
    if (chars < milestone.chars) continue
    const sourceKey = `note:chars:${noteId}:${milestone.chars}`
    if (alreadyAwarded[sourceKey]) continue
    awards.push({
      action: XP_ACTIONS.NOTE_MILESTONE,
      amount: milestone.xp,
      sourceKey,
      label: actionLabel(XP_ACTIONS.NOTE_MILESTONE, { label: milestone.label }),
    })
  }
  return awards
}

export function trimHistory(history) {
  return (history || []).slice(0, MAX_HISTORY)
}

export function createEmptyGamificationState() {
  return {
    totalXp: 0,
    level: 1,
    titleId: 'novice',
    history: [],
    awarded: {},
    streak: { current: 0, best: 0, lastActiveDate: null },
    unlockedTitles: ['novice'],
  }
}
