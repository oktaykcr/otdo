import { create } from 'zustand'
import { scanNotesFolder } from '../lib/notesFolderScan'
import { buildFolderPath, buildNotePath, renameNotePath } from '../lib/notePaths'
import { uploadNoteToDrive, deleteNoteFromDrive, listDriveFolderNotes, downloadDriveNoteContent } from '../lib/driveSync'
import { extractTodoIdsFromMarkdown } from '../lib/telegramTodos'
import {
  NOTE_TYPE_MARKDOWN,
  NOTE_TYPE_CANVAS,
  parseDriveNoteFileName,
  defaultNoteContent,
} from '../lib/noteCanvas'
import useTodoStore from './todoStore'
import { PERSIST_STATUS, isPersistBusy } from '../lib/notePersistStatus'
import {
  toCalendarDateKey,
  calendarNoteTitle,
  findCalendarFolder,
  CALENDAR_FOLDER_NAME,
} from '../lib/calendarNotes'
import { normalizeTag, normalizeTags } from '../lib/noteTags'
import {
  backfillNoteSortOrders,
  backfillFolderSortOrders,
  buildReorderUpdates,
  buildFolderReorderUpdates,
  collectDescendantFolderIds,
  nextSortOrder,
  nextFolderSortOrder,
} from '../lib/noteOrder'
import {
  createEditorPane,
  createEditorTab,
  createDefaultEditorLayout,
  findTabWithNote,
  sortTabs,
  replacePaneInLayout,
  paneHasOpenNotes,
  removePaneFromLayout,
  findFirstPaneId,
  countPanesInLayout,
  getActiveTabNoteId,
  getActiveTabNoteContent,
  collectOpenTabNoteIds,
} from '../lib/editorTabs'
import {
  noteReminderId,
  syncNoteReminder,
} from '../lib/noteReminders'
import {
  isNoteTrashed,
  buildTrashNotePath,
  isTrashExpired,
  normalizeRetentionDays,
} from '../lib/noteTrash'
import useNotificationStore from './notificationStore'
import useGamificationStore from './gamificationStore'
import useSettingsStore from './settingsStore'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

let persistIdleTimer = null
let persistChain = Promise.resolve()
let noteReminderSyncTimer = null

async function loadAppSettings() {
  if (isElectron) {
    return (await window.api.store.get('settings')) || {}
  }
  const data = localStorage.getItem('otdo-settings')
  return data ? JSON.parse(data) : {}
}

async function readNoteContentForReminder(note, state) {
  if (state.activeNoteId === note.id && state.activeContent) {
    return state.activeContent
  }
  const draft = state.noteDrafts[note.id]
  if (draft?.content != null) return draft.content
  return readNoteContent(note, state.activeNoteId, state.activeContent)
}

function enqueuePersist(task) {
  const run = persistChain.then(task, task)
  persistChain = run.catch(() => {})
  return run
}

async function writeMeta(meta) {
  if (isElectron) {
    await window.api.store.set('notesMeta', meta)
  } else {
    localStorage.setItem('otdo-notes-meta', JSON.stringify(meta))
  }
}

async function persistStoreState(get) {
  return enqueuePersist(async () => {
    const { folders, notes, layout, panes, activePaneId } = get()
    await writeMeta({
      folders,
      notes,
      editorState: { layout, panes, activePaneId },
    })
  })
}

async function loadMeta() {
  if (isElectron) {
    return (await window.api.store.get('notesMeta')) || { folders: [], notes: [] }
  }
  const data = localStorage.getItem('otdo-notes-meta')
  return data ? JSON.parse(data) : { folders: [], notes: [] }
}

async function getNotesBasePath() {
  if (!isElectron) return ''
  const settings = await window.api.store.get('settings') || {}
  return settings.notesPath?.trim() || ''
}

async function writeNoteFile(filePath, content) {
  const result = await window.api.fs.writeFile(filePath, content)
  if (!result.ok) {
    console.error('[OTDO] Failed to write note file:', filePath, result.error)
  }
  return result
}

async function backfillNotePaths(notes, folders) {
  const basePath = await getNotesBasePath()
  if (!basePath || !isElectron) return notes

  let changed = false
  const updated = []

  for (const note of notes) {
    if (note.path || isNoteTrashed(note)) {
      updated.push(note)
      continue
    }

    const filePath = buildNotePath(basePath, note, folders)
    if (!filePath) {
      updated.push(note)
      continue
    }

    const fallback = localStorage.getItem(`otdo-note-${note.id}`)
    const content = fallback || defaultNoteContent(note)
    const result = await writeNoteFile(filePath, content)

    if (result.ok) {
      changed = true
      updated.push({ ...note, path: filePath })
      if (fallback) localStorage.removeItem(`otdo-note-${note.id}`)
    } else {
      updated.push(note)
    }
  }

  return changed ? updated : notes
}

async function readNoteContent(note, activeNoteId, activeContent) {
  if (activeNoteId === note.id && activeContent) return activeContent
  if (note.path && isElectron) {
    const r = await window.api.fs.readFile(note.path)
    if (r.ok) return r.data
  }
  return localStorage.getItem(`otdo-note-${note.id}`) || defaultNoteContent(note)
}

async function readStoredNoteContent(note, { activeNoteId, activeContent, noteDrafts }) {
  if (activeNoteId === note.id && activeContent) return activeContent
  const draft = noteDrafts?.[note.id]
  if (draft?.content != null) return draft.content
  return readNoteContent(note, activeNoteId, activeContent)
}

async function collectLinkedTodoIdsFromNotes(notes, state, excludeNoteIds = null) {
  const excluded = excludeNoteIds instanceof Set
    ? excludeNoteIds
    : excludeNoteIds
      ? new Set([excludeNoteIds].flat())
      : null
  const ids = new Set()
  for (const note of notes) {
    if (excluded?.has(note.id)) continue
    const content = await readStoredNoteContent(note, state)
    extractTodoIdsFromMarkdown(content).forEach(id => ids.add(id))
  }
  return ids
}

async function moveNoteFile(oldPath, newPath) {
  if (!oldPath || !newPath || oldPath === newPath || !isElectron) return { ok: true, path: newPath || oldPath }
  const sep = Math.max(newPath.lastIndexOf('/'), newPath.lastIndexOf('\\'))
  if (sep > 0) await window.api.fs.mkdir(newPath.slice(0, sep))
  const exists = await window.api.fs.exists(oldPath)
  if (!exists) return { ok: true, path: newPath }
  const result = await window.api.fs.rename(oldPath, newPath)
  if (!result.ok) {
    console.error('[OTDO] Failed to move note file:', result.error)
    return { ok: false, error: result.error, path: oldPath }
  }
  return { ok: true, path: newPath }
}

const useNoteStore = create((set, get) => {
  const schedulePersistIdle = (delay = 2500) => {
    clearTimeout(persistIdleTimer)
    persistIdleTimer = setTimeout(() => {
      const { persistStatus, isDirty } = get()
      if (persistStatus === PERSIST_STATUS.SAVED && !isDirty) {
        set({ persistStatus: PERSIST_STATUS.IDLE, persistError: null })
      }
    }, delay)
  }

  const markSaved = () => {
    set({ persistStatus: PERSIST_STATUS.SAVED, persistError: null, isDirty: false })
    schedulePersistIdle()
  }

  const loadNoteContentFromDisk = async (note) => {
    let content = ''
    let filePath = note.path

    if (isElectron) {
      if (!filePath) {
        const basePath = await getNotesBasePath()
        if (basePath) filePath = buildNotePath(basePath, note, get().folders)
      }
      if (filePath) {
        const result = await window.api.fs.readFile(filePath)
        if (result.ok) {
          content = result.data
          if (!note.path) {
            const notes = get().notes.map(n =>
              n.id === note.id ? { ...n, path: filePath } : n
            )
            set({ notes })
            await persistStoreState(get)
          }
        }
      }
    }

    if (!content) {
      content = localStorage.getItem(`otdo-note-${note.id}`) || defaultNoteContent(note)
    }
    return content
  }

  const applyActiveNote = (noteId, content, isDirty = false) => {
    set({
      activeNoteId: noteId,
      activeContent: content,
      isDirty,
      persistStatus: PERSIST_STATUS.IDLE,
      persistError: null,
    })
  }

  const clearActiveNote = () => {
    set({
      activeNoteId: null,
      activeContent: '',
      isDirty: false,
      persistStatus: PERSIST_STATUS.IDLE,
      persistError: null,
    })
  }

  const flushNoteDraft = async (noteId) => {
    if (!noteId) return
    const state = get()
    const draft = state.noteDrafts[noteId]
    const dirty = draft?.isDirty || (state.activeNoteId === noteId && state.isDirty)
    if (!dirty) return

    if (state.activeNoteId !== noteId) {
      const note = state.notes.find(n => n.id === noteId)
      const content = draft?.content ?? (note ? await loadNoteContentFromDisk(note) : '')
      applyActiveNote(noteId, content, true)
    }
    await get().saveNoteLocal({ quiet: true })
    set(s => ({
      noteDrafts: {
        ...s.noteDrafts,
        [noteId]: { content: s.activeContent, isDirty: false },
      },
    }))
  }

  const loadNoteIntoEditor = async (noteId) => {
    const note = get().notes.find(n => n.id === noteId)
    if (!note) return

    set({ persistStatus: PERSIST_STATUS.OPENING, persistError: null })

    try {
      const draft = get().noteDrafts[noteId]
      const content = draft?.content ?? await loadNoteContentFromDisk(note)
      applyActiveNote(noteId, content, !!draft?.isDirty)
      set(s => ({
        noteDrafts: {
          ...s.noteDrafts,
          [noteId]: { content, isDirty: !!draft?.isDirty },
        },
      }))
    } catch (err) {
      set({ persistStatus: PERSIST_STATUS.ERROR, persistError: err.message || 'Could not open note' })
    }
  }

  const refreshNoteReminder = async (noteId) => {
    const state = get()
    const note = state.notes.find(n => n.id === noteId)
    if (!note) return
    const content = await readNoteContentForReminder(note, state)
    const todos = useTodoStore.getState().todos
    const settings = await loadAppSettings()
    await syncNoteReminder(note, content, todos, settings)
    useNotificationStore.getState().refreshActiveReminders()
  }

  const scheduleNoteReminderSync = (noteId) => {
    const note = get().notes.find(n => n.id === noteId)
    if (!note?.reminder?.enabled) return
    clearTimeout(noteReminderSyncTimer)
    noteReminderSyncTimer = setTimeout(() => {
      refreshNoteReminder(noteId)
    }, 400)
  }

  const syncActivePaneEditor = async () => {
    const { panes, activePaneId } = get()
    const pane = panes[activePaneId]
    if (!pane) return
    const tab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (tab?.noteId) await loadNoteIntoEditor(tab.noteId)
    else clearActiveNote()
  }

  const detachNoteFromUi = async (id) => {
    const panes = {}
    for (const [pid, pane] of Object.entries(get().panes)) {
      panes[pid] = {
        ...pane,
        tabs: pane.tabs.map(t => t.noteId === id ? { ...t, noteId: null } : t),
      }
    }
    const noteDrafts = { ...get().noteDrafts }
    delete noteDrafts[id]
    set({
      panes,
      noteDrafts,
      activeNoteId: get().activeNoteId === id ? null : get().activeNoteId,
      isDirty: get().activeNoteId === id ? false : get().isDirty,
      activeContent: get().activeNoteId === id ? '' : get().activeContent,
    })
    await syncActivePaneEditor()
  }

  const maybeCollapseEmptyPane = async (paneId) => {
    const { layout, panes } = get()
    const pane = panes[paneId]
    if (!pane || paneHasOpenNotes(pane)) return false
    if (countPanesInLayout(layout) <= 1) return false

    const newLayout = removePaneFromLayout(layout, paneId)
    if (!newLayout) return false

    const newPanes = { ...panes }
    delete newPanes[paneId]

    let activePaneId = get().activePaneId
    if (activePaneId === paneId || !newPanes[activePaneId]) {
      activePaneId = findFirstPaneId(newLayout)
    }

    set({ layout: newLayout, panes: newPanes, activePaneId })
    await persistStoreState(get)
    await syncActivePaneEditor()
    return true
  }

  return {
  folders: [],
  notes: [],
  activeNoteId: null,
  activeContent: '',
  isDirty: false,
  persistStatus: PERSIST_STATUS.IDLE,
  persistError: null,
  layout: createDefaultEditorLayout().layout,
  panes: createDefaultEditorLayout().panes,
  activePaneId: createDefaultEditorLayout().activePaneId,
  noteDrafts: {},

  init: async () => {
    const meta = await loadMeta()
    let folders = meta.folders || []
    let notes = meta.notes || []

    const basePath = await getNotesBasePath()
    if (basePath && isElectron) ({ notes, folders } = await scanNotesFolder(basePath, notes, folders))
    notes = await backfillNotePaths(notes, folders)

    notes = notes.map(n => ({
      ...n,
      tags: normalizeTags(n.tags),
      createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
      updatedAt: n.updatedAt || n.createdAt || new Date().toISOString(),
    }))
    const needsSortBackfill = notes.some(n => n.sortOrder == null)
    notes = backfillNoteSortOrders(notes)
    const needsFolderSortBackfill = folders.some(f => f.sortOrder == null)
    folders = backfillFolderSortOrders(folders)

    const editor = meta.editorState?.panes && meta.editorState?.layout
      ? meta.editorState
      : createDefaultEditorLayout()

    set({
      folders,
      notes,
      layout: editor.layout,
      panes: editor.panes,
      activePaneId: editor.activePaneId,
      noteDrafts: {},
      activeNoteId: null,
      activeContent: '',
      isDirty: false,
    })

    if (needsSortBackfill || needsFolderSortBackfill) {
      await persistStoreState(get)
    }

    if (notes !== meta.notes) {
      await persistStoreState(get)
    }

    await syncActivePaneEditor()
    for (const noteId of collectOpenTabNoteIds(get().panes)) {
      await get().ensureNoteDraft(noteId)
    }

    await get().purgeExpiredTrash()

    const settings = await loadAppSettings()
    const todos = useTodoStore.getState().todos
    for (const note of get().notes) {
      if (isNoteTrashed(note) || !note.reminder?.enabled) continue
      const content = await readNoteContentForReminder(note, get())
      await syncNoteReminder(note, content, todos, settings)
    }
    useNotificationStore.getState().refreshActiveReminders()
  },

  syncNotePaths: async () => {
    const { folders, notes } = get()
    const basePath = await getNotesBasePath()
    let scan = { notes, folders, added: 0 }
    if (basePath && isElectron) scan = await scanNotesFolder(basePath, notes, folders)
    const updated = await backfillNotePaths(scan.notes, scan.folders)
    if (updated !== notes || scan.folders !== folders) {
      set({ notes: updated, folders: scan.folders })
      await persistStoreState(get)
    }
    return { added: scan.added }
  },

  importDriveNotes: async () => {
    const listResult = await listDriveFolderNotes()
    if (!listResult.ok) return listResult

    const driveFiles = listResult.files || []
    const driveIds = new Set(driveFiles.map(file => file.id))
    const driveByName = new Map(
      driveFiles
        .map(file => {
          const parsed = parseDriveNoteFileName(file.name)
          return parsed ? [parsed.name, { file, type: parsed.type }] : null
        })
        .filter(Boolean)
    )

    let imported = 0
    let updated = 0
    let removed = 0

    const orphaned = get().notes.filter(note => {
      if (isNoteTrashed(note) || !note.cloudSync) return false
      if (note.gdFileId && driveIds.has(note.gdFileId)) return false
      const entry = driveByName.get(note.name)
      if (entry && entry.type === (note.type || NOTE_TYPE_MARKDOWN)) return false
      return true
    })

    for (const note of orphaned) {
      await get().deleteNote(note.id, { skipDriveDelete: true })
      removed += 1
    }

    for (const file of driveFiles) {
      const parsed = parseDriveNoteFileName(file.name)
      if (!parsed?.name) continue
      const { name, type } = parsed

      let note = get().notes.find(n => !isNoteTrashed(n) && n.gdFileId === file.id)
        || get().notes.find(n => !isNoteTrashed(n) && n.cloudSync && n.name === name && (n.type || NOTE_TYPE_MARKDOWN) === type)

      const download = await downloadDriveNoteContent(file.id)
      if (!download.ok) {
        return {
          ok: false,
          error: download.error || `Could not download "${name}"`,
          imported,
          updated,
          removed,
        }
      }

      const content = download.content ?? ''
      const modifiedAt = file.modifiedTime || new Date().toISOString()

      if (!note) {
        note = {
          id: crypto.randomUUID(),
          name,
          type,
          folderId: null,
          path: null,
          icon: type === NOTE_TYPE_CANVAS ? 'layout' : null,
          tag: null,
          cloudSync: true,
          gdFileId: file.id,
          calendarDate: null,
          sortOrder: nextSortOrder(get().notes, null),
          createdAt: modifiedAt,
          updatedAt: modifiedAt,
          lastSyncedAt: modifiedAt,
        }

        if (isElectron) {
          const basePath = await getNotesBasePath()
          if (basePath) {
            const filePath = buildNotePath(basePath, note, get().folders)
            const result = await writeNoteFile(filePath, content)
            if (result.ok) note.path = filePath
          }
        }

        set({ notes: [...get().notes, note] })
        await persistStoreState(get)
        imported += 1
        continue
      }

      const shouldUpdate = !note.lastSyncedAt
        || new Date(modifiedAt).getTime() > new Date(note.lastSyncedAt).getTime()

      if (!shouldUpdate) continue

      let filePath = note.path
      if (isElectron) {
        if (!filePath) {
          const basePath = await getNotesBasePath()
          if (basePath) filePath = buildNotePath(basePath, note, get().folders)
        }
        if (filePath) {
          const result = await writeNoteFile(filePath, content)
          if (!result.ok) {
            return {
              ok: false,
              error: result.error || `Could not save "${name}" locally`,
              imported,
              updated,
              removed,
            }
          }
        }
      } else {
        localStorage.setItem(`otdo-note-${note.id}`, content)
      }

      const notes = get().notes.map(n =>
        n.id === note.id
          ? {
              ...n,
              cloudSync: true,
              gdFileId: file.id,
              path: filePath || n.path,
              updatedAt: modifiedAt,
              lastSyncedAt: modifiedAt,
            }
          : n
      )
      set({ notes })

      const { activeNoteId, noteDrafts } = get()
      if (activeNoteId === note.id) {
        set({
          activeContent: content,
          isDirty: false,
          noteDrafts: {
            ...noteDrafts,
            [note.id]: { content, isDirty: false },
          },
        })
      } else if (noteDrafts[note.id]) {
        set({
          noteDrafts: {
            ...noteDrafts,
            [note.id]: { content, isDirty: false },
          },
        })
      }

      updated += 1
    }

    await persistStoreState(get)
    return { ok: true, imported, updated, removed }
  },

  addFolder: async (data) => {
    const parentId = data.parentId || null
    const folder = {
      id: crypto.randomUUID(),
      name: data.name,
      parentId,
      tag: data.tag || null,
      cloudSync: data.cloudSync || false,
      sortOrder: nextFolderSortOrder(get().folders, parentId),
    }
    const folders = [...get().folders, folder]
    set({ folders })
    await persistStoreState(get)

    if (isElectron) {
      const basePath = await getNotesBasePath()
      if (basePath) {
        const folderPath = `${buildFolderPath(basePath, folder.parentId, get().folders)}/${folder.name}`
        await window.api.fs.mkdir(folderPath)
      }
    }

    await useGamificationStore.getState().awardFolderCreate(folder)
    return folder
  },

  updateFolder: async (id, data) => {
    const folder = get().folders.find(f => f.id === id)
    if (!folder) return

    const foldersBefore = get().folders
    let folders = foldersBefore.map(f => f.id === id ? { ...f, ...data } : f)
    let notes = get().notes

    if (data.name && data.name !== folder.name && isElectron) {
      const basePath = await getNotesBasePath()
      if (basePath) {
        const oldDir = `${buildFolderPath(basePath, folder.parentId, foldersBefore)}/${folder.name}`
        const newDir = `${buildFolderPath(basePath, folder.parentId, foldersBefore)}/${data.name}`
        if (oldDir !== newDir) {
          const result = await window.api.fs.rename(oldDir, newDir)
          if (!result.ok) {
            console.error('[OTDO] Failed to rename folder:', result.error)
          }
        }
        notes = notes.map(n => {
          if (n.folderId !== id) return n
          const newPath = buildNotePath(basePath, n, folders)
          return newPath ? { ...n, path: newPath } : n
        })
      }
    }

    set({ folders, notes })
    await persistStoreState(get)
  },

  deleteFolder: async (id) => {
    const folder = get().folders.find(f => f.id === id)
    if (!folder) return

    const affectedFolderIds = collectDescendantFolderIds(get().folders, id)
    const notesToTrash = get().notes.filter(
      n => !isNoteTrashed(n) && n.folderId && affectedFolderIds.has(n.folderId)
    )

    for (const note of notesToTrash) {
      await get().deleteNote(note.id)
    }

    if (isElectron) {
      const basePath = await getNotesBasePath()
      if (basePath) {
        const all = get().folders
        const dirs = all
          .filter(f => affectedFolderIds.has(f.id))
          .map(f => `${buildFolderPath(basePath, f.parentId, all)}/${f.name}`)
          .sort((a, b) => b.length - a.length) // children before parents
        for (const dir of dirs) await window.api.fs.rmdir(dir)
      }
    }

    const folders = get().folders.filter(f => !affectedFolderIds.has(f.id))
    set({ folders })
    await persistStoreState(get)
  },

  addNote: async (data) => {
    set({ persistStatus: PERSIST_STATUS.CREATING, persistError: null })

    const folderId = data.folderId || null
    const type = data.type === NOTE_TYPE_CANVAS ? NOTE_TYPE_CANVAS : NOTE_TYPE_MARKDOWN
    const note = {
      id: crypto.randomUUID(),
      name: data.name || 'Untitled',
      type,
      folderId,
      path: null,
      icon: data.icon || (type === NOTE_TYPE_CANVAS ? 'layout' : null),
      tag: data.tag || null,
      tags: normalizeTags(data.tags),
      cloudSync: data.cloudSync || false,
      calendarDate: data.calendarDate || null,
      pinned: false,
      sortOrder: nextSortOrder(get().notes, folderId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const content = defaultNoteContent(note)

    try {
      if (isElectron) {
        const basePath = await getNotesBasePath()
        if (basePath) {
          const filePath = buildNotePath(basePath, note, get().folders)
          const result = await writeNoteFile(filePath, content)
          if (result.ok) note.path = filePath
        }
      }

      const notes = [...get().notes, note]
      set({ notes })
      await persistStoreState(get)
      await get().openNote(note.id)
      await useGamificationStore.getState().awardNoteCreate(note)
      return note
    } catch (err) {
      set({ persistStatus: PERSIST_STATUS.ERROR, persistError: err.message || 'Could not create note' })
      throw err
    }
  },

  ensureCalendarFolder: async () => {
    const existing = findCalendarFolder(get().folders)
    if (existing) return existing
    return get().addFolder({ name: CALENDAR_FOLDER_NAME })
  },

  openOrCreateCalendarNote: async (date) => {
    const calendarDate = toCalendarDateKey(date)
    const folder = await get().ensureCalendarFolder()
    const existing = get().notes.find(n => n.calendarDate === calendarDate && !isNoteTrashed(n))
    if (existing) {
      if ((existing.folderId ?? null) !== folder.id) {
        await get().moveNoteToFolder(existing.id, folder.id)
      }
      await get().openNote(existing.id)
      return get().notes.find(n => n.id === existing.id) || existing
    }
    return get().addNote({
      name: calendarNoteTitle(date),
      folderId: folder.id,
      cloudSync: false,
      calendarDate,
      icon: 'calendar',
    })
  },

  addNoteTag: async (id, rawTag) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    const tag = normalizeTag(rawTag)
    if (!tag) return
    const tags = normalizeTags([...(note.tags || []), tag])
    if (tags.length === (note.tags || []).length) return
    await get().updateNoteMeta(id, { tags })
  },

  removeNoteTag: async (id, tag) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    const tags = (note.tags || []).filter(t => t !== tag)
    if (tags.length === (note.tags || []).length) return
    await get().updateNoteMeta(id, { tags })
  },

  renameNoteTag: async (id, oldTag, rawNewTag) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    const newTag = normalizeTag(rawNewTag)
    if (!newTag || newTag === oldTag) return
    const tags = normalizeTags(
      (note.tags || []).map(t => (t === oldTag ? newTag : t))
    )
    await get().updateNoteMeta(id, { tags })
  },

  updateNoteMeta: async (id, data) => {
    const note = get().notes.find(n => n.id === id)
    if (!note || isNoteTrashed(note)) return

    if (data.tags) {
      data = { ...data, tags: normalizeTags(data.tags) }
    }

    const folders = get().folders
    const basePath = isElectron ? await getNotesBasePath() : ''

    if (data.name && data.name !== note.name) {
      const currentPath = note.path || (basePath ? buildNotePath(basePath, note, folders) : null)
      if (currentPath && isElectron) {
        const newPath = renameNotePath(currentPath, note, data.name)
        if (newPath) {
          const result = await window.api.fs.rename(currentPath, newPath)
          if (result.ok) data = { ...data, path: newPath }
        }
      } else if (basePath) {
        const newPath = buildNotePath(basePath, { ...note, ...data }, folders)
        if (newPath) data = { ...data, path: newPath }
      }
    }

    const notes = get().notes.map(n =>
      n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n
    )
    set({ notes })
    await persistStoreState(get)

    const gamification = useGamificationStore.getState()
    if (data.pinned === true && !note.pinned) {
      await gamification.awardNotePin({ ...note, ...data })
    }
    if (data.reminder?.enabled && !note.reminder?.enabled) {
      await gamification.awardReminderSet('note', id)
    }

    if (data.reminder !== undefined) {
      await refreshNoteReminder(id)
    }
  },

  disableNoteReminder: async (noteId) => {
    const note = get().notes.find(n => n.id === noteId)
    if (!note?.reminder?.enabled) return
    await get().updateNoteMeta(noteId, {
      reminder: { ...note.reminder, enabled: false },
    })
  },

  refreshRemindersForTodo: async (todoId) => {
    const state = get()
    for (const note of state.notes) {
      if (!note.reminder?.enabled) continue
      const content = await readNoteContentForReminder(note, state)
      if (extractTodoIdsFromMarkdown(content).has(todoId)) {
        await refreshNoteReminder(note.id)
      }
    }
  },

  moveNoteToDrive: async (id) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return { ok: false, error: 'Note not found' }
    if (note.cloudSync) return get().syncNoteById(id)

    const { notes, activeNoteId, activeContent } = get()

    if (activeNoteId === id) {
      set({ persistStatus: PERSIST_STATUS.SYNCING, persistError: null })
    }

    try {
      const content = await readNoteContent(note, activeNoteId, activeContent)
      const upload = await uploadNoteToDrive(note, content)
      if (!upload.ok) {
        if (activeNoteId === id) {
          set({ persistStatus: PERSIST_STATUS.ERROR, persistError: upload.error || 'Drive sync failed' })
        }
        return upload
      }

      const updated = notes.map(n =>
        n.id === id
          ? { ...n, cloudSync: true, gdFileId: upload.gdFileId, lastSyncedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : n
      )
      set({ notes: updated })
      await persistStoreState(get)
      if (activeNoteId === id) markSaved()
      return { ok: true }
    } catch (err) {
      if (activeNoteId === id) {
        set({ persistStatus: PERSIST_STATUS.ERROR, persistError: err.message || 'Drive sync failed' })
      }
      return { ok: false, error: err.message }
    }
  },

  moveNoteToLocal: async (id) => {
    const notes = get().notes.map(n =>
      n.id === id
        ? { ...n, cloudSync: false, updatedAt: new Date().toISOString() }
        : n
    )
    set({ notes })
    await persistStoreState(get)
    return { ok: true }
  },

  moveNoteToFolder: async (id, folderId) => {
    return get().reorderNote(id, { folderId: folderId ?? null, referenceNoteId: null, position: 'end' })
  },

  reorderNote: async (id, { folderId, referenceNoteId, position }) => {
    const { folders, notes } = get()
    const plan = buildReorderUpdates(notes, id, { folderId, referenceNoteId, position })
    if (!plan) return { ok: false, error: 'Invalid reorder' }

    const { note, targetFolderId, updates } = plan
    const folderChanged = (note.folderId ?? null) !== targetFolderId
    const pathUpdates = new Map()

    if (folderChanged && isElectron) {
      const basePath = await getNotesBasePath()
      if (basePath) {
        const updatedNote = { ...note, folderId: targetFolderId }
        const oldPath = note.path || buildNotePath(basePath, note, folders)
        const targetPath = buildNotePath(basePath, updatedNote, folders)
        if (oldPath && targetPath && oldPath !== targetPath) {
          const sep = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'))
          await window.api.fs.mkdir(targetPath.slice(0, sep))
          const result = await window.api.fs.rename(oldPath, targetPath)
          if (!result.ok) {
            console.error('[OTDO] Failed to move note file:', result.error)
            return { ok: false, error: result.error }
          }
          pathUpdates.set(id, targetPath)
        } else if (targetPath) {
          pathUpdates.set(id, targetPath)
        }
      }
    }

    const updated = notes.map(n => {
      const patch = updates.get(n.id)
      if (!patch) return n
      return {
        ...n,
        folderId: patch.folderId,
        sortOrder: patch.sortOrder,
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        path: pathUpdates.get(n.id) ?? n.path,
        updatedAt: n.id === id ? new Date().toISOString() : n.updatedAt,
      }
    })

    set({ notes: updated })
    await persistStoreState(get)
    return { ok: true }
  },

  reorderFolder: async (id, { parentId, referenceFolderId, position }) => {
    const { folders, notes } = get()
    const plan = buildFolderReorderUpdates(folders, id, { parentId, referenceFolderId, position })
    if (!plan) return { ok: false, error: 'Invalid reorder' }

    const { folder, targetParentId, updates } = plan
    const parentChanged = (folder.parentId ?? null) !== targetParentId

    if (parentChanged && isElectron) {
      const basePath = await getNotesBasePath()
      if (basePath) {
        const oldDir = `${buildFolderPath(basePath, folder.parentId, folders)}/${folder.name}`
        const foldersWithNewParent = folders.map(f =>
          f.id === id ? { ...f, parentId: targetParentId } : f
        )
        const newDir = `${buildFolderPath(basePath, targetParentId, foldersWithNewParent)}/${folder.name}`
        if (oldDir !== newDir) {
          const sep = Math.max(newDir.lastIndexOf('/'), newDir.lastIndexOf('\\'))
          await window.api.fs.mkdir(newDir.slice(0, sep))
          const result = await window.api.fs.rename(oldDir, newDir)
          if (!result.ok) {
            console.error('[OTDO] Failed to move folder:', result.error)
            return { ok: false, error: result.error }
          }
        }
      }
    }

    const updatedFolders = folders.map(f => {
      const patch = updates.get(f.id)
      if (!patch) return f
      return { ...f, parentId: patch.parentId, sortOrder: patch.sortOrder }
    })

    let updatedNotes = notes
    if (parentChanged && isElectron) {
      const basePath = await getNotesBasePath()
      if (basePath) {
        const affectedIds = collectDescendantFolderIds(updatedFolders, id)
        updatedNotes = notes.map(n => {
          if (!n.folderId || !affectedIds.has(n.folderId)) return n
          const newPath = buildNotePath(basePath, n, updatedFolders)
          return newPath ? { ...n, path: newPath } : n
        })
      }
    }

    set({ folders: updatedFolders, notes: updatedNotes })
    await persistStoreState(get)
    return { ok: true }
  },

  deleteNote: async (id, { skipDriveDelete = false } = {}) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return
    if (isNoteTrashed(note)) {
      await get().permanentlyDeleteNote(id, { skipDriveDelete })
      return
    }

    if (window.api?.reminder) {
      await window.api.reminder.cancel(noteReminderId(id))
    }

    await flushNoteDraft(id)
    await detachNoteFromUi(id)

    let gdFileId = note.gdFileId || null
    if (note.cloudSync && !skipDriveDelete) {
      const driveResult = await deleteNoteFromDrive(note)
      if (driveResult.ok) {
        gdFileId = null
      } else {
        console.error('[OTDO] Drive delete failed:', driveResult.error)
      }
    }

    const deletedAt = new Date().toISOString()
    let nextPath = note.path || null
    const basePath = isElectron ? await getNotesBasePath() : ''
    if (isElectron && basePath) {
      const sourcePath = note.path || buildNotePath(basePath, note, get().folders)
      const trashPath = buildTrashNotePath(basePath, note)
      if (sourcePath && trashPath) {
        const moved = await moveNoteFile(sourcePath, trashPath)
        if (moved.ok) nextPath = moved.path
      }
    }

    try {
      localStorage.removeItem(`otdo-note-${id}`)
    } catch {
      // ignore
    }

    const notes = get().notes.map(n =>
      n.id === id
        ? {
            ...n,
            deletedAt,
            path: nextPath,
            preTrashPath: note.path || nextPath,
            reminder: n.reminder ? { ...n.reminder, enabled: false } : n.reminder,
            gdFileId,
            updatedAt: deletedAt,
          }
        : n
    )
    set({ notes })
    await persistStoreState(get)
    useNotificationStore.getState().refreshActiveReminders()
  },

  restoreNote: async (id) => {
    const note = get().notes.find(n => n.id === id)
    if (!note || !isNoteTrashed(note)) return { ok: false, error: 'Note is not in trash' }

    const folders = get().folders
    let folderId = note.folderId ?? null
    if (folderId && !folders.some(f => f.id === folderId)) {
      folderId = null
    }

    const restored = {
      ...note,
      folderId,
      deletedAt: null,
      preTrashPath: null,
      updatedAt: new Date().toISOString(),
    }

    const basePath = isElectron ? await getNotesBasePath() : ''
    let nextPath = note.path || null
    if (isElectron && basePath) {
      const targetPath = buildNotePath(basePath, restored, folders)
      if (note.path && targetPath) {
        const moved = await moveNoteFile(note.path, targetPath)
        if (moved.ok) nextPath = moved.path
      } else if (targetPath) {
        nextPath = targetPath
      }
    }

    const notes = get().notes.map(n =>
      n.id === id ? { ...restored, path: nextPath } : n
    )
    set({ notes })
    await persistStoreState(get)

    if (restored.cloudSync) {
      await get().syncNoteById(id)
    }

    await get().openNote(id)
    return { ok: true }
  },

  permanentlyDeleteNote: async (id, { skipDriveDelete = false } = {}) => {
    const note = get().notes.find(n => n.id === id)
    if (!note) return

    const state = get()
    const deletedContent = await readStoredNoteContent(note, state)
    const deletedTodoIds = extractTodoIdsFromMarkdown(deletedContent)
    const remainingLinkedIds = await collectLinkedTodoIdsFromNotes(state.notes, state, id)
    const orphanedTodoIds = [...deletedTodoIds].filter(todoId => !remainingLinkedIds.has(todoId))

    if (note.cloudSync && note.gdFileId && !skipDriveDelete) {
      const driveResult = await deleteNoteFromDrive(note)
      if (!driveResult.ok) {
        console.error('[OTDO] Drive delete failed:', driveResult.error)
      }
    }

    if (window.api?.reminder) {
      await window.api.reminder.cancel(noteReminderId(id))
    }

    await detachNoteFromUi(id)

    if (note.path && isElectron) {
      await window.api.fs.deleteFile(note.path)
    }

    try {
      localStorage.removeItem(`otdo-note-${id}`)
    } catch {
      // ignore
    }

    const notes = get().notes.filter(n => n.id !== id)
    set({ notes })
    await persistStoreState(get)

    const deleteTodo = useTodoStore.getState().deleteTodo
    for (const todoId of orphanedTodoIds) {
      await deleteTodo(todoId)
    }
  },

  purgeExpiredTrash: async () => {
    const retentionDays = normalizeRetentionDays(
      useSettingsStore.getState().trashRetentionDays
      ?? (await loadAppSettings()).trashRetentionDays
    )
    const expired = get().notes.filter(n => isTrashExpired(n, retentionDays))
    for (const note of expired) {
      await get().permanentlyDeleteNote(note.id)
    }
    return expired.length
  },

  emptyTrash: async () => {
    const trashed = get().notes.filter(isNoteTrashed)
    for (const note of trashed) {
      await get().permanentlyDeleteNote(note.id)
    }
    return trashed.length
  },

  setActivePane: async (paneId) => {
    if (get().activePaneId === paneId) return
    const prev = get().panes[get().activePaneId]
    const prevTab = prev?.tabs.find(t => t.id === prev?.activeTabId)
    if (prevTab?.noteId) await flushNoteDraft(prevTab.noteId)
    set({ activePaneId: paneId })
    await syncActivePaneEditor()
  },

  selectTab: async (paneId, tabId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    const current = pane.tabs.find(t => t.id === pane.activeTabId)
    if (current?.noteId) await flushNoteDraft(current.noteId)

    const panes = {
      ...get().panes,
      [paneId]: { ...pane, activeTabId: tabId },
    }
    set({ panes, activePaneId: paneId })
    await persistStoreState(get)

    const tab = panes[paneId].tabs.find(t => t.id === tabId)
    if (paneId === get().activePaneId) {
      if (tab?.noteId) await loadNoteIntoEditor(tab.noteId)
      else clearActiveNote()
    }
  },

  addEditorTab: async (paneId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    const tab = createEditorTab(null)
    const panes = {
      ...get().panes,
      [paneId]: {
        ...pane,
        tabs: [...pane.tabs, tab],
        activeTabId: tab.id,
      },
    }
    set({ panes, activePaneId: paneId })
    clearActiveNote()
    await persistStoreState(get)
  },

  closeEditorTab: async (paneId, tabId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    const closing = pane.tabs.find(t => t.id === tabId)
    if (closing?.noteId) await flushNoteDraft(closing.noteId)

    let tabs = pane.tabs.filter(t => t.id !== tabId)
    let activeTabId = pane.activeTabId

    if (tabs.length === 0) {
      const empty = createEditorTab(null)
      tabs = [empty]
      activeTabId = empty.id
    } else if (tabId === activeTabId) {
      const idx = pane.tabs.findIndex(t => t.id === tabId)
      const next = tabs[Math.min(idx, tabs.length - 1)]
      activeTabId = next.id
    }

    const panes = {
      ...get().panes,
      [paneId]: { ...pane, tabs, activeTabId },
    }
    set({ panes })
    await persistStoreState(get)

    if (await maybeCollapseEmptyPane(paneId)) return

    if (paneId === get().activePaneId) {
      const tab = tabs.find(t => t.id === activeTabId)
      if (tab?.noteId) await loadNoteIntoEditor(tab.noteId)
      else clearActiveNote()
    }
  },

  closeAllEditorTabs: async (paneId) => {
    const pane = get().panes[paneId]
    if (!pane) return

    for (const tab of pane.tabs) {
      if (!tab.pinned && tab.noteId) await flushNoteDraft(tab.noteId)
    }

    let tabs = pane.tabs.filter(t => t.pinned)
    if (tabs.length === 0) {
      tabs = [createEditorTab(null)]
    }

    const panes = {
      ...get().panes,
      [paneId]: { ...pane, tabs, activeTabId: tabs[tabs.length - 1].id },
    }
    set({ panes })
    await persistStoreState(get)

    if (await maybeCollapseEmptyPane(paneId)) return

    if (paneId === get().activePaneId) {
      const tab = tabs.find(t => t.id === panes[paneId].activeTabId)
      if (tab?.noteId) await loadNoteIntoEditor(tab.noteId)
      else clearActiveNote()
    }
  },

  pinEditorTab: async (paneId, tabId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    const tabs = sortTabs(
      pane.tabs.map(t => t.id === tabId ? { ...t, pinned: !t.pinned } : t)
    )
    const panes = { ...get().panes, [paneId]: { ...pane, tabs } }
    set({ panes })
    await persistStoreState(get)
  },

  splitPane: async (paneId, direction, tabId = null) => {
    const { layout, panes } = get()
    const sourcePane = panes[paneId]
    const sourceTab = tabId ? sourcePane?.tabs.find(t => t.id === tabId) : null
    const noteId = sourceTab?.noteId ?? null

    if (noteId) await flushNoteDraft(noteId)

    const newPane = createEditorPane(noteId)
    const splitNode = {
      type: 'split',
      id: crypto.randomUUID(),
      direction: direction === 'right' ? 'horizontal' : 'vertical',
      ratio: 0.5,
      first: { type: 'pane', paneId },
      second: { type: 'pane', paneId: newPane.id },
    }
    set({
      layout: replacePaneInLayout(layout, paneId, splitNode),
      panes: { ...panes, [newPane.id]: newPane },
      activePaneId: newPane.id,
    })
    if (noteId) await loadNoteIntoEditor(noteId)
    else clearActiveNote()
    await persistStoreState(get)
  },

  setSplitRatio: (splitId, ratio) => {
    const walk = (node) => {
      if (!node) return node
      if (node.type === 'split' && node.id === splitId) {
        return { ...node, ratio }
      }
      if (node.type === 'split') {
        return { ...node, first: walk(node.first), second: walk(node.second) }
      }
      return node
    }
    set({ layout: walk(get().layout) })
    persistStoreState(get)
  },

  openNote: async (id) => {
    const note = get().notes.find(n => n.id === id)
    if (!note || isNoteTrashed(note)) return

    const paneId = get().activePaneId
    const pane = get().panes[paneId]
    if (!pane) return

    const currentTab = pane.tabs.find(t => t.id === pane.activeTabId)
    if (currentTab?.noteId) await flushNoteDraft(currentTab.noteId)

    let targetTab = findTabWithNote(pane, id)
    let tabs = pane.tabs
    let activeTabId = pane.activeTabId

    if (!targetTab) {
      if (currentTab && !currentTab.noteId) {
        tabs = pane.tabs.map(t =>
          t.id === currentTab.id ? { ...t, noteId: id } : t
        )
        targetTab = { ...currentTab, noteId: id }
      } else {
        const existing = pane.tabs.find(t => t.id === activeTabId)
        if (existing) {
          tabs = pane.tabs.map(t =>
            t.id === existing.id ? { ...t, noteId: id } : t
          )
          targetTab = { ...existing, noteId: id }
        }
      }
    } else {
      activeTabId = targetTab.id
    }

    const panes = { ...get().panes, [paneId]: { ...pane, tabs, activeTabId: targetTab?.id || activeTabId } }
    set({ panes, activePaneId: paneId })
    await persistStoreState(get)
    await loadNoteIntoEditor(id)
  },

  ensureNoteDraft: async (noteId) => {
    if (!noteId || get().noteDrafts[noteId]?.content != null) return
    const note = get().notes.find(n => n.id === noteId)
    if (!note) return
    const content = await loadNoteContentFromDisk(note)
    set(s => ({
      noteDrafts: {
        ...s.noteDrafts,
        [noteId]: { content, isDirty: false },
      },
    }))
  },

  setNoteDraft: (noteId, content) => {
    const { persistStatus, noteDrafts, activeNoteId } = get()
    const patch = {
      noteDrafts: {
        ...noteDrafts,
        [noteId]: { content, isDirty: true },
      },
    }
    if (activeNoteId === noteId) {
      patch.activeContent = content
      patch.isDirty = true
      patch.persistStatus = persistStatus === PERSIST_STATUS.SAVED ? PERSIST_STATUS.IDLE : persistStatus
      patch.persistError = persistStatus === PERSIST_STATUS.SAVED ? null : get().persistError
    }
    set(patch)
    scheduleNoteReminderSync(noteId)
  },

  setContent: (content) => {
    const { persistStatus, activeNoteId, noteDrafts } = get()
    if (!activeNoteId) return
    set({
      activeContent: content,
      isDirty: true,
      noteDrafts: {
        ...noteDrafts,
        [activeNoteId]: { content, isDirty: true },
      },
      persistStatus: persistStatus === PERSIST_STATUS.SAVED ? PERSIST_STATUS.IDLE : persistStatus,
      persistError: persistStatus === PERSIST_STATUS.SAVED ? null : get().persistError,
    })
    scheduleNoteReminderSync(activeNoteId)
  },

  saveNoteLocal: async ({ quiet = false } = {}) => {
    const { activeNoteId, activeContent, notes, folders, persistStatus } = get()
    if (!activeNoteId) return { ok: false }
    if (isPersistBusy(persistStatus)) return { ok: false }

    const note = notes.find(n => n.id === activeNoteId)
    if (!note) return { ok: false }

    const isCloud = !!note.cloudSync
    if (!quiet && !isCloud) {
      set({ persistStatus: PERSIST_STATUS.SAVING, persistError: null })
    }

    try {
      let updatedNotes = notes
      let filePath = note.path

      if (isElectron) {
        if (!filePath) {
          const basePath = await getNotesBasePath()
          if (basePath) filePath = buildNotePath(basePath, note, folders)
        }

        if (filePath) {
          const result = await writeNoteFile(filePath, activeContent)
          if (!result.ok) {
            if (!quiet || !isCloud) {
              set({
                persistStatus: PERSIST_STATUS.ERROR,
                persistError: result.error || 'Could not save note',
              })
            }
            return { ok: false, error: result.error }
          }

          updatedNotes = notes.map(n =>
            n.id === activeNoteId
              ? { ...n, path: filePath, updatedAt: new Date().toISOString() }
              : n
          )
          set({ notes: updatedNotes })
          await persistStoreState(get)
          localStorage.removeItem(`otdo-note-${activeNoteId}`)
          await useGamificationStore.getState().awardNoteMilestones(activeNoteId, activeContent)

          if (isCloud) {
            return { ok: true, filePath }
          }

          markSaved()
          set(s => ({
            noteDrafts: {
              ...s.noteDrafts,
              [activeNoteId]: { content: s.activeContent, isDirty: false },
            },
          }))
          return { ok: true, filePath }
        }
      }

      localStorage.setItem(`otdo-note-${activeNoteId}`, activeContent)
      updatedNotes = notes.map(n =>
        n.id === activeNoteId ? { ...n, updatedAt: new Date().toISOString() } : n
      )
      set({ notes: updatedNotes })
      await persistStoreState(get)

      if (!isCloud) {
        markSaved()
        set(s => ({
          noteDrafts: {
            ...s.noteDrafts,
            [activeNoteId]: { content: s.activeContent, isDirty: false },
          },
        }))
      }
      await useGamificationStore.getState().awardNoteMilestones(activeNoteId, activeContent)
      return { ok: true }
    } catch (err) {
      if (!quiet || !isCloud) {
        set({ persistStatus: PERSIST_STATUS.ERROR, persistError: err.message || 'Could not save note' })
      }
      return { ok: false, error: err.message }
    }
  },

  syncNoteById: async (noteId) => {
    const { notes, activeNoteId, activeContent, folders, persistStatus } = get()
    const note = notes.find(n => n.id === noteId)
    if (!note) return { ok: false, error: 'Note not found' }
    if (!note.cloudSync) return { ok: false, error: 'Not a Drive note' }
    if (isPersistBusy(persistStatus) && activeNoteId === noteId) {
      return { ok: false, error: 'Sync already in progress' }
    }

    const isActive = activeNoteId === noteId
    let filePath = note.path

    if (isActive) {
      const local = await get().saveNoteLocal({ quiet: true })
      if (!local.ok) {
        set({
          persistStatus: PERSIST_STATUS.ERROR,
          persistError: local.error || 'Could not save note locally',
        })
        return { ok: false, error: local.error || 'Could not save note locally' }
      }
      filePath = local.filePath || note.path
      set({ persistStatus: PERSIST_STATUS.SYNCING, persistError: null })
    }

    try {
      if (!filePath && isElectron) {
        const basePath = await getNotesBasePath()
        if (basePath) filePath = buildNotePath(basePath, note, folders)
      }

      const content = await readNoteContent(note, activeNoteId, activeContent)
      const current = get().notes.find(n => n.id === noteId) || note
      const upload = await uploadNoteToDrive({ ...current, path: filePath }, content)

      if (!upload.ok) {
        if (isActive) {
          set({
            persistStatus: PERSIST_STATUS.ERROR,
            persistError: upload.error || 'Drive sync failed',
          })
        }
        return { ok: false, error: upload.error || 'Drive sync failed' }
      }

      const updatedNotes = get().notes.map(n =>
        n.id === noteId
          ? {
              ...n,
              path: filePath || n.path,
              gdFileId: upload.gdFileId,
              lastSyncedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
      set({ notes: updatedNotes })
      await persistStoreState(get)

      if (isActive) markSaved()
      return { ok: true }
    } catch (err) {
      if (isActive) {
        set({ persistStatus: PERSIST_STATUS.ERROR, persistError: err.message || 'Drive sync failed' })
      }
      return { ok: false, error: err.message || 'Drive sync failed' }
    }
  },

  syncNote: async () => {
    const { activeNoteId } = get()
    if (!activeNoteId) return { ok: false, error: 'No note open' }

    const note = get().notes.find(n => n.id === activeNoteId)
    if (!note?.cloudSync) return get().saveNoteLocal()

    return get().syncNoteById(activeNoteId)
  },

  saveNote: async () => {
    const note = get().notes.find(n => n.id === get().activeNoteId)
    if (note?.cloudSync) return get().syncNote()
    return get().saveNoteLocal()
  },

  getActiveNote: () => {
    const state = get()
    const noteId = getActiveTabNoteId(state) || state.activeNoteId
    if (!noteId) return null
    return state.notes.find(n => n.id === noteId) || null
  },

  flushAllOpenDrafts: async () => {
    const { panes } = get()
    const noteIds = new Set()
    for (const pane of Object.values(panes)) {
      for (const tab of pane.tabs) {
        if (tab.noteId) noteIds.add(tab.noteId)
      }
    }
    for (const noteId of noteIds) {
      await flushNoteDraft(noteId)
    }
    await persistStoreState(get)
  },
}})

export default useNoteStore
