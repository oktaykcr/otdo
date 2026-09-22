export function createEditorTab(noteId = null, pinned = false) {
  return { id: crypto.randomUUID(), noteId, pinned }
}

export function createEditorPane(initialNoteId = null) {
  const tab = createEditorTab(initialNoteId)
  const id = crypto.randomUUID()
  return {
    id,
    tabs: [tab],
    activeTabId: tab.id,
  }
}

export function createDefaultEditorLayout() {
  const pane = createEditorPane()
  return {
    layout: { type: 'pane', paneId: pane.id },
    panes: { [pane.id]: pane },
    activePaneId: pane.id,
  }
}

export function findPaneInLayout(layout, paneId) {
  if (!layout) return false
  if (layout.type === 'pane') return layout.paneId === paneId
  return findPaneInLayout(layout.first, paneId) || findPaneInLayout(layout.second, paneId)
}

export function replacePaneInLayout(layout, targetPaneId, replacement) {
  if (!layout) return replacement
  if (layout.type === 'pane') {
    return layout.paneId === targetPaneId ? replacement : layout
  }
  return {
    ...layout,
    first: replacePaneInLayout(layout.first, targetPaneId, replacement),
    second: replacePaneInLayout(layout.second, targetPaneId, replacement),
  }
}

export function sortTabs(tabs) {
  const pinned = tabs.filter(t => t.pinned)
  const rest = tabs.filter(t => !t.pinned)
  return [...pinned, ...rest]
}

export function findTabWithNote(pane, noteId) {
  return pane?.tabs?.find(t => t.noteId === noteId) || null
}

export function paneHasOpenNotes(pane) {
  return pane?.tabs?.some(t => t.noteId) ?? false
}

export function removePaneFromLayout(layout, paneIdToRemove) {
  if (!layout) return null
  if (layout.type === 'pane') {
    return layout.paneId === paneIdToRemove ? null : layout
  }
  const first = removePaneFromLayout(layout.first, paneIdToRemove)
  const second = removePaneFromLayout(layout.second, paneIdToRemove)
  if (!first) return second
  if (!second) return first
  return { ...layout, first, second }
}

export function findFirstPaneId(layout) {
  if (!layout) return null
  if (layout.type === 'pane') return layout.paneId
  return findFirstPaneId(layout.first) || findFirstPaneId(layout.second)
}

export function countPanesInLayout(layout) {
  if (!layout) return 0
  if (layout.type === 'pane') return 1
  return countPanesInLayout(layout.first) + countPanesInLayout(layout.second)
}

export function getActiveTab(state) {
  const pane = state.panes?.[state.activePaneId]
  if (!pane) return null
  return pane.tabs.find(t => t.id === pane.activeTabId) || null
}

export function getActiveTabNoteId(state) {
  return getActiveTab(state)?.noteId ?? null
}

export function getActiveTabNoteContent(state) {
  const noteId = getActiveTabNoteId(state)
  if (!noteId) return ''
  const draft = state.noteDrafts?.[noteId]?.content
  if (draft != null) return draft
  if (state.activeNoteId === noteId && state.activeContent) return state.activeContent
  return ''
}

export function collectOpenTabNoteIds(panes) {
  const noteIds = new Set()
  for (const pane of Object.values(panes || {})) {
    for (const tab of pane.tabs || []) {
      if (tab.noteId) noteIds.add(tab.noteId)
    }
  }
  return [...noteIds]
}
