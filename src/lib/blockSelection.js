export function normalizeBlockRange(a, b) {
  return { start: Math.min(a, b), end: Math.max(a, b) }
}

export function isBlockInRange(idx, range) {
  if (!range) return false
  return idx >= range.start && idx <= range.end
}

export function sliceBlocksByRange(blocks, range) {
  if (!range || !blocks?.length) return []
  const start = Math.max(0, range.start)
  const end = Math.min(blocks.length - 1, range.end)
  if (start > end) return []
  return blocks.slice(start, end + 1)
}

export function removeBlocksByRange(blocks, range, newBlock) {
  if (!range || !blocks?.length) {
    return { blocks: [newBlock('p')], focusIdx: 0 }
  }
  const start = Math.max(0, range.start)
  const end = Math.min(blocks.length - 1, range.end)
  const next = [...blocks.slice(0, start), ...blocks.slice(end + 1)]
  if (!next.length) next.push(newBlock('p'))
  return {
    blocks: next,
    focusIdx: Math.min(start, next.length - 1),
  }
}

export function blockIndexFromPoint(clientX, clientY, root) {
  const el = document.elementFromPoint(clientX, clientY)
  if (!el || (root && !root.contains(el))) return null
  const blockEl = el.closest('[data-block-index]')
  if (!blockEl || (root && !root.contains(blockEl))) return null
  const idx = Number(blockEl.getAttribute('data-block-index'))
  return Number.isInteger(idx) ? idx : null
}
