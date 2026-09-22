import { buildLinkMarkdown } from './inlineFormat'

export const NOTE_MENTION_PREFIX = 'otdo://note/'
const MENTION_LINK_RE = /\[([^\]]*)\]\(otdo:\/\/note\/([a-f0-9-]+)\)/gi

export function extractNoteMentionIds(markdown) {
  const ids = []
  if (!markdown) return ids
  for (const m of markdown.matchAll(MENTION_LINK_RE)) {
    if (m[2]) ids.push(m[2])
  }
  return ids
}

export function buildNoteMentionMarkdown(name, noteId) {
  return buildLinkMarkdown(name, `${NOTE_MENTION_PREFIX}${noteId}`)
}

export function isNoteMentionHref(href) {
  return typeof href === 'string' && href.startsWith(NOTE_MENTION_PREFIX)
}

export function getNoteIdFromMention(href) {
  if (!isNoteMentionHref(href)) return null
  return href.slice(NOTE_MENTION_PREFIX.length) || null
}

export function findActiveMentionTrigger(text, caret) {
  if (caret == null || caret < 0) return null

  const before = text.slice(0, caret)
  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) return null

  if (atIdx > 0 && !/[\s([{'"`]/.test(before[atIdx - 1])) return null

  const query = before.slice(atIdx + 1)
  if (/[\n[\]()`]/.test(query)) return null

  return { atIndex: atIdx, query, replaceEnd: caret }
}

export function filterNotesForMention(notes, query, excludeNoteId = null) {
  const q = query.trim().toLowerCase()
  return notes
    .filter(n => !n.deletedAt && n.id !== excludeNoteId)
    .filter(n => !q || n.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aPin = a.pinned ? 1 : 0
      const bPin = b.pinned ? 1 : 0
      if (bPin !== aPin) return bPin - aPin
      return a.name.localeCompare(b.name)
    })
}
