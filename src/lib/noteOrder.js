export function compareNotes(a, b) {
  const aPin = a.pinned ? 1 : 0
  const bPin = b.pinned ? 1 : 0
  if (bPin !== aPin) return bPin - aPin
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
}

export function notesInFolder(notes, folderId, { localOnly = true, includeTrashed = false } = {}) {
  return notes
    .filter(n => {
      if (!includeTrashed && n.deletedAt) return false
      return (n.folderId ?? null) === (folderId ?? null) && (!localOnly || !n.cloudSync)
    })
    .sort(compareNotes)
}

export function nextSortOrder(notes, folderId) {
  const siblings = notesInFolder(notes, folderId, { localOnly: false })
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map(n => n.sortOrder ?? 0)) + 1
}

export function backfillNoteSortOrders(notes) {
  if (notes.every(n => n.sortOrder != null)) return notes

  const byFolder = new Map()
  for (const note of notes) {
    const key = note.folderId ?? null
    if (!byFolder.has(key)) byFolder.set(key, [])
    byFolder.get(key).push(note)
  }

  const sortOrderMap = new Map()
  for (const group of byFolder.values()) {
    const sorted = [...group].sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder
      if (a.sortOrder != null) return -1
      if (b.sortOrder != null) return 1
      return 0
    })
    sorted.forEach((note, index) => sortOrderMap.set(note.id, index))
  }

  return notes.map(note => ({
    ...note,
    sortOrder: sortOrderMap.get(note.id) ?? note.sortOrder ?? 0,
  }))
}

export function buildReorderUpdates(notes, noteId, { folderId, referenceNoteId, position }) {
  const note = notes.find(n => n.id === noteId)
  if (!note) return null

  const targetFolderId = folderId ?? null
  const siblings = notesInFolder(notes, targetFolderId, { localOnly: false })
    .filter(n => n.id !== noteId)

  let insertIndex = siblings.length
  let nextPinned = !!note.pinned

  if (referenceNoteId) {
    const refIndex = siblings.findIndex(n => n.id === referenceNoteId)
    if (refIndex === -1) return null
    insertIndex = position === 'before' ? refIndex : refIndex + 1
    nextPinned = !!siblings[refIndex].pinned
  } else if (position === 'end' && (note.folderId ?? null) === targetFolderId) {
    nextPinned = false
  }

  const reordered = [...siblings]
  reordered.splice(insertIndex, 0, { ...note, folderId: targetFolderId, pinned: nextPinned })

  const updates = new Map()
  reordered.forEach((item, index) => {
    const patch = { folderId: targetFolderId, sortOrder: index }
    if (item.id === noteId) patch.pinned = nextPinned
    updates.set(item.id, patch)
  })

  return { note, targetFolderId, updates }
}

export function foldersInParent(folders, parentId) {
  return folders
    .filter(f => (f.parentId ?? null) === (parentId ?? null))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function nextFolderSortOrder(folders, parentId) {
  const siblings = foldersInParent(folders, parentId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map(f => f.sortOrder ?? 0)) + 1
}

export function backfillFolderSortOrders(folders) {
  if (folders.every(f => f.sortOrder != null)) return folders

  const byParent = new Map()
  for (const folder of folders) {
    const key = folder.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(folder)
  }

  const sortOrderMap = new Map()
  for (const group of byParent.values()) {
    const sorted = [...group].sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder
      if (a.sortOrder != null) return -1
      if (b.sortOrder != null) return 1
      return 0
    })
    sorted.forEach((folder, index) => sortOrderMap.set(folder.id, index))
  }

  return folders.map(folder => ({
    ...folder,
    sortOrder: sortOrderMap.get(folder.id) ?? folder.sortOrder ?? 0,
  }))
}

export function isFolderDescendant(folders, ancestorId, folderId) {
  let current = folders.find(f => f.id === folderId)
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    current = folders.find(f => f.id === current.parentId)
  }
  return false
}

export function collectDescendantFolderIds(folders, folderId) {
  const ids = new Set([folderId])
  let changed = true
  while (changed) {
    changed = false
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id)
        changed = true
      }
    }
  }
  return ids
}

export function buildFolderReorderUpdates(folders, folderId, { parentId, referenceFolderId, position }) {
  const folder = folders.find(f => f.id === folderId)
  if (!folder) return null

  const targetParentId = parentId ?? null
  const siblings = foldersInParent(folders, targetParentId).filter(f => f.id !== folderId)

  let insertIndex = siblings.length
  if (referenceFolderId) {
    const refIndex = siblings.findIndex(f => f.id === referenceFolderId)
    if (refIndex === -1) return null
    insertIndex = position === 'before' ? refIndex : refIndex + 1
  }

  const reordered = [...siblings]
  reordered.splice(insertIndex, 0, { ...folder, parentId: targetParentId })

  const updates = new Map()
  reordered.forEach((item, index) => {
    updates.set(item.id, { parentId: targetParentId, sortOrder: index })
  })

  return { folder, targetParentId, updates }
}
