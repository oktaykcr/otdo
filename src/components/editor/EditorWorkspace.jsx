import { useCallback } from 'react'
import useNoteStore from '../../store/noteStore'
import EditorPane from './EditorPane'
import EditorSplitPane from './EditorSplitPane'

export default function EditorWorkspace({
  onSelectionLengthChange,
  todos,
  editorSettings,
  searchQuery,
  matchIndex,
  searchNavigate,
  selectionApiRef = null,
}) {
  const layout = useNoteStore(s => s.layout)
  const activePaneId = useNoteStore(s => s.activePaneId)
  const setActivePane = useNoteStore(s => s.setActivePane)
  const setSplitRatio = useNoteStore(s => s.setSplitRatio)

  const renderPane = useCallback((paneId) => (
    <EditorPane
      paneId={paneId}
      isActivePane={paneId === activePaneId}
      onActivatePane={() => setActivePane(paneId)}
      onSelectionLengthChange={onSelectionLengthChange}
      todos={todos}
      editorSettings={editorSettings}
      searchQuery={searchQuery}
      matchIndex={matchIndex}
      searchNavigate={searchNavigate}
      selectionApiRef={selectionApiRef}
    />
  ), [
    activePaneId,
    setActivePane,
    onSelectionLengthChange,
    todos,
    editorSettings,
    searchQuery,
    matchIndex,
    searchNavigate,
    selectionApiRef,
  ])

  const renderLayout = useCallback((node) => {
    if (!node) return null
    if (node.type === 'pane') return renderPane(node.paneId)
    return (
      <EditorSplitPane
        key={node.id}
        direction={node.direction}
        ratio={node.ratio ?? 0.5}
        onRatioChange={(ratio) => setSplitRatio(node.id, ratio)}
        first={renderLayout(node.first)}
        second={renderLayout(node.second)}
      />
    )
  }, [renderPane, setSplitRatio])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {renderLayout(layout)}
    </div>
  )
}
