import { useRef, useCallback, useEffect } from 'react'

const MAX_HISTORY = 100
const MERGE_MS = 400

function cloneBlocks(blocks) {
  return structuredClone(blocks)
}

function isStructuralChange(prev, next) {
  if (prev.length !== next.length) return true
  return prev.some((b, i) => b.id !== next[i]?.id || b.type !== next[i]?.type)
}

export function useEditorHistory(blocks, onApply) {
  const undoStack = useRef([])
  const redoStack = useRef([])
  const isApplying = useRef(false)
  const lastPushAt = useRef(0)
  const blocksRef = useRef(blocks)

  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  const reset = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    lastPushAt.current = 0
  }, [])

  const applySnapshot = useCallback((snapshot) => {
    isApplying.current = true
    blocksRef.current = snapshot
    onApply(snapshot)
    isApplying.current = false
  }, [onApply])

  const setBlocksWithHistory = useCallback((newBlocks) => {
    if (!isApplying.current) {
      const prev = blocksRef.current
      const now = Date.now()
      if (isStructuralChange(prev, newBlocks) || now - lastPushAt.current >= MERGE_MS) {
        undoStack.current.push(cloneBlocks(prev))
        if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
        redoStack.current = []
        lastPushAt.current = now
      }
    }
    blocksRef.current = newBlocks
    onApply(newBlocks)
  }, [onApply])

  const undo = useCallback(() => {
    if (!undoStack.current.length) return false
    redoStack.current.push(cloneBlocks(blocksRef.current))
    const prev = undoStack.current.pop()
    applySnapshot(prev)
    return true
  }, [applySnapshot])

  const redo = useCallback(() => {
    if (!redoStack.current.length) return false
    undoStack.current.push(cloneBlocks(blocksRef.current))
    const next = redoStack.current.pop()
    applySnapshot(next)
    return true
  }, [applySnapshot])

  return { setBlocksWithHistory, undo, redo, reset }
}
