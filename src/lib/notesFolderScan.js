import { NOTE_TYPE_CANVAS, NOTE_TYPE_MARKDOWN } from './noteCanvas'
import { nextSortOrder, nextFolderSortOrder } from './noteOrder'

const norm = p => (p || '').replace(/\\/g, '/')

function parseFile(name) {
  if (name.endsWith('.canvas.json')) return { name: name.slice(0, -12), type: NOTE_TYPE_CANVAS }
  if (name.endsWith('.md')) return { name: name.slice(0, -3), type: NOTE_TYPE_MARKDOWN }
  return null
}

// Imports .md / .canvas.json files under basePath that are not yet known to the store.
// Hidden entries (.otdo-trash, dotfiles) are skipped. Returns { notes, folders, added }.
export async function scanNotesFolder(basePath, notes, folders) {
  let added = 0
  const knownPaths = new Set(notes.filter(n => n.path).map(n => norm(n.path)))

  const walk = async (dir, parentId) => {
    const r = await window.api.fs.listDir(dir)
    if (!r.ok) return
    for (const e of r.data) {
      if (e.name.startsWith('.')) continue
      if (e.isDir) {
        let folder = folders.find(f => f.name === e.name && (f.parentId || null) === parentId)
        if (!folder) {
          folder = { id: crypto.randomUUID(), name: e.name, parentId, tag: null, cloudSync: false, sortOrder: nextFolderSortOrder(folders, parentId) }
          folders = [...folders, folder]
          added += 1
        }
        await walk(e.path, folder.id)
        continue
      }
      const parsed = parseFile(e.name)
      if (!parsed || knownPaths.has(norm(e.path))) continue

      knownPaths.add(norm(e.path))
      const orphan = notes.find(n => !n.path && !n.deletedAt && n.name === parsed.name
        && (n.type || NOTE_TYPE_MARKDOWN) === parsed.type && (n.folderId || null) === parentId)
      if (orphan) {
        notes = notes.map(n => (n === orphan ? { ...n, path: e.path } : n))
        continue
      }
      const now = new Date().toISOString()
      notes = [...notes, {
        id: crypto.randomUUID(), name: parsed.name, type: parsed.type, folderId: parentId, path: e.path,
        icon: parsed.type === NOTE_TYPE_CANVAS ? 'layout' : null, tag: null, tags: [], cloudSync: false,
        calendarDate: null, pinned: false, sortOrder: nextSortOrder(notes, parentId), createdAt: now, updatedAt: now,
      }]
      added += 1
    }
  }

  await walk(basePath, null)
  return { notes, folders, added }
}
