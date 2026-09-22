import { extractNoteMentionIds } from './noteMentions'
import { isCanvasNote } from './noteCanvas'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

async function readNoteContentForGraph(note, activeNoteId, activeContent) {
  if (isCanvasNote(note)) return ''
  if (note.id === activeNoteId && activeContent) return activeContent
  if (note.path && isElectron) {
    const r = await window.api.fs.readFile(note.path)
    if (r.ok) return r.data
  }
  return localStorage.getItem(`otdo-note-${note.id}`) || ''
}

export async function buildNoteGraph(notes, activeNoteId, activeContent) {
  const liveNotes = notes.filter(n => !n.deletedAt)
  const noteIds = new Set(liveNotes.map(n => n.id))
  const nodes = liveNotes.map(n => ({
    id: n.id,
    name: n.name,
    cloudSync: !!n.cloudSync,
  }))

  const edgeKeys = new Set()
  const edges = []

  for (const note of liveNotes) {
    const content = await readNoteContentForGraph(note, activeNoteId, activeContent)
    for (const targetId of extractNoteMentionIds(content)) {
      if (!noteIds.has(targetId) || targetId === note.id) continue
      const key = `${note.id}->${targetId}`
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      edges.push({ source: note.id, target: targetId })
    }
  }

  return { nodes, edges }
}

export function layoutNoteGraph(nodes, edges, width, height, iterations = 90) {
  if (!nodes.length) return []

  const nodeMap = new Map(
    nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length
      const r = Math.min(width, height) * 0.32
      return [node.id, {
        ...node,
        x: width / 2 + r * Math.cos(angle),
        y: height / 2 + r * Math.sin(angle),
        vx: 0,
        vy: 0,
      }]
    }),
  )

  const list = () => [...nodeMap.values()]

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations
    const arr = list()

    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const dx = arr[j].x - arr[i].x
        const dy = arr[j].y - arr[i].y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const force = (600 * alpha) / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        arr[i].vx -= fx
        arr[i].vy -= fy
        arr[j].vx += fx
        arr[j].vy += fy
      }
    }

    for (const edge of edges) {
      const s = nodeMap.get(edge.source)
      const t = nodeMap.get(edge.target)
      if (!s || !t) continue
      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.max(Math.hypot(dx, dy), 1)
      const force = (dist - 52) * 0.06 * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      s.vx += fx
      s.vy += fy
      t.vx -= fx
      t.vy -= fy
    }

    const pad = 16
    for (const node of nodeMap.values()) {
      node.vx += (width / 2 - node.x) * 0.012 * alpha
      node.vy += (height / 2 - node.y) * 0.012 * alpha
      node.x += node.vx * 0.35
      node.y += node.vy * 0.35
      node.vx *= 0.55
      node.vy *= 0.55
      node.x = Math.max(pad, Math.min(width - pad, node.x))
      node.y = Math.max(pad, Math.min(height - pad, node.y))
    }
  }

  return list()
}

export function getGraphNodeRadius(count) {
  if (count <= 8) return 10
  if (count <= 20) return 8
  return 6
}
