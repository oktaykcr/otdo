import { noteFileName } from './noteCanvas'

export function buildFolderPath(basePath, folderId, folders) {
  if (!basePath) return ''
  if (!folderId) return basePath

  const chain = []
  let current = folders.find(f => f.id === folderId)
  while (current) {
    chain.unshift(current.name)
    current = current.parentId
      ? folders.find(f => f.id === current.parentId)
      : null
  }

  return chain.length ? `${basePath}/${chain.join('/')}` : basePath
}

export function buildNotePath(basePath, note, folders) {
  if (!basePath || !note?.name) return null
  const dir = buildFolderPath(basePath, note.folderId, folders)
  const fileName = noteFileName(note)
  if (!fileName) return null
  return `${dir}/${fileName}`
}

export function renameNotePath(currentPath, note, newName) {
  if (!currentPath || !newName) return null
  const sep = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'))
  const fileName = noteFileName({ ...note, name: newName })
  if (!fileName) return null
  return `${currentPath.slice(0, sep + 1)}${fileName}`
}
