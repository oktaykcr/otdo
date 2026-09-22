import { uploadFile, deleteNoteFile, listFolderFiles, downloadFile } from '../services/googleDrive'
import { noteFileName } from './noteCanvas'
import {
  clearDriveConnection,
  ensureDriveAccessToken,
  isDriveAuthError,
  reconnectGoogleDrive,
  refreshAccessToken,
} from './driveAuth'

export {
  normalizeDriveSettings,
  refreshDriveSessionOnInit,
  clearDriveConnection,
  reconnectGoogleDrive,
} from './driveAuth'

async function recoverAccessToken(settings, refreshResult) {
  if (refreshResult.needsReauth) {
    const reauth = await reconnectGoogleDrive(settings)
    if (reauth.ok) {
      const auth = await ensureDriveAccessToken(null, { allowReauth: false })
      if (auth.ok) return { ok: true, token: auth.token, settings: auth.settings }
    }
    return {
      ok: false,
      error: reauth.error || 'Google Drive session expired. Reconnect in Settings.',
      needsReauth: reauth.needsReauth,
    }
  }

  await clearDriveConnection()
  return {
    ok: false,
    error: refreshResult.error || 'Google Drive session expired. Reconnect in Settings.',
  }
}

async function refreshTokenAndRetry(settings, apiFn) {
  const refresh = await refreshAccessToken(settings)
  if (refresh.ok) {
    const result = await apiFn(refresh.token)
    return { ok: true, result, token: refresh.token, settings }
  }

  const recovered = await recoverAccessToken(settings, refresh)
  if (!recovered.ok) return recovered

  const result = await apiFn(recovered.token)
  return { ok: true, result, token: recovered.token, settings: recovered.settings }
}

export async function uploadNoteToDrive(note, content) {
  const auth = await ensureDriveAccessToken(null, { allowReauth: true })
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error || 'Google Drive not connected',
      needsReauth: auth.needsReauth,
    }
  }

  let settings = auth.settings
  const token = auth.token
  const folderName = settings.gdFolderPath || 'OTDO Notes'
  const fileName = noteFileName(note)
  const doUpload = (accessToken) =>
    uploadFile(accessToken, folderName, fileName, content, note.gdFileId || null)

  let result = await doUpload(token)

  if (isDriveAuthError(result.error)) {
    const retry = await refreshTokenAndRetry(settings, doUpload)
    if (!retry.ok) return retry
    result = retry.result
  }

  if (result.error) {
    return {
      ok: false,
      error: result.error.message || result.error.errors?.[0]?.message || 'Upload failed',
    }
  }

  return { ok: true, gdFileId: result.id }
}

export async function deleteNoteFromDrive(note) {
  const auth = await ensureDriveAccessToken(null, { allowReauth: true })
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error || 'Google Drive not connected',
      needsReauth: auth.needsReauth,
    }
  }

  const settings = auth.settings
  const token = auth.token
  const folderName = settings.gdFolderPath || 'OTDO Notes'
  const fileName = noteFileName(note)
  const doDelete = (accessToken) =>
    deleteNoteFile(accessToken, folderName, fileName, note.gdFileId || null)

  let result = await doDelete(token)

  if (result.error && isDriveAuthError(result.error)) {
    const retry = await refreshTokenAndRetry(settings, doDelete)
    if (!retry.ok) return retry
    result = retry.result
  }

  if (result.error) {
    return {
      ok: false,
      error: result.error.message || result.error.errors?.[0]?.message || 'Delete failed',
    }
  }

  return { ok: true }
}

export async function listDriveFolderNotes() {
  const auth = await ensureDriveAccessToken(null, { allowReauth: true })
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error || 'Google Drive not connected',
      needsReauth: auth.needsReauth,
    }
  }

  const settings = auth.settings
  const token = auth.token
  const folderName = settings.gdFolderPath || 'OTDO Notes'
  const doList = (accessToken) => listFolderFiles(accessToken, folderName)

  let result = await doList(token)

  if (result.error && isDriveAuthError(result.error)) {
    const retry = await refreshTokenAndRetry(settings, doList)
    if (!retry.ok) return retry
    result = retry.result
  }

  if (result.error) {
    return {
      ok: false,
      error: result.error.message || result.error.errors?.[0]?.message || 'Could not list Drive files',
    }
  }

  return { ok: true, files: result.files || [] }
}

export async function downloadDriveNoteContent(fileId) {
  const auth = await ensureDriveAccessToken(null, { allowReauth: true })
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error || 'Google Drive not connected',
      needsReauth: auth.needsReauth,
    }
  }

  const settings = auth.settings
  const token = auth.token
  const doDownload = (accessToken) => downloadFile(accessToken, fileId)

  try {
    let content = await doDownload(token)
    if (typeof content === 'object' && content?.error && isDriveAuthError(content.error)) {
      const retry = await refreshTokenAndRetry(settings, doDownload)
      if (!retry.ok) return retry
      content = retry.result
    }
    if (typeof content === 'object' && content?.error) {
      return {
        ok: false,
        error: content.error.message || content.error.errors?.[0]?.message || 'Download failed',
      }
    }
    return { ok: true, content: content ?? '' }
  } catch (err) {
    return { ok: false, error: err.message || 'Download failed' }
  }
}
