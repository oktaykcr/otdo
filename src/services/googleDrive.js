/**
 * Google Drive integration service.
 * Generic OAuth2 - user provides their own Client ID and Client Secret.
 */

import { GOOGLE_OAUTH_REDIRECT_URI } from '../lib/googleOAuth'

const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function parseDriveResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = data.error || {}
    return {
      error: {
        code: err.code ?? res.status,
        status: err.status,
        message: err.message || `Drive API error (${res.status})`,
        errors: err.errors,
      },
    }
  }
  return data
}

export function buildAuthUrl(clientId, redirectUri = GOOGLE_OAUTH_REDIRECT_URI) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params}`
}

export async function exchangeCode(code, clientId, clientSecret, redirectUri = GOOGLE_OAUTH_REDIRECT_URI) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function refreshToken(refreshTokenValue, clientId, clientSecret) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshTokenValue,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json().catch(() => ({}))
  return { ...data, _status: res.status, _ok: res.ok }
}

async function getOrCreateFolder(accessToken, folderName, parentId = null) {
  const q = `name='${escapeDriveQuery(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await parseDriveResponse(res)
  if (data.error) return data
  if (data.files?.length) return data.files[0].id

  const body = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) body.parents = [parentId]

  const create = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const folder = await parseDriveResponse(create)
  if (folder.error) return folder
  return folder.id
}

export async function uploadFile(accessToken, folderName, fileName, content, existingFileId = null) {
  const folderId = await getOrCreateFolder(accessToken, folderName)
  if (folderId?.error) return folderId

  let targetId = existingFileId
  if (!targetId) {
    const q = `name='${escapeDriveQuery(fileName)}' and '${folderId}' in parents and trashed=false`
    const search = await fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const searchData = await parseDriveResponse(search)
    if (searchData.error) return searchData
    targetId = searchData.files?.[0]?.id
  }

  const metadata = {
    name: fileName,
    mimeType: /\.json$/i.test(fileName) ? 'application/json' : 'text/markdown',
  }
  if (!targetId) metadata.parents = [folderId]

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append(
    'file',
    new Blob([content ?? ''], {
      type: /\.json$/i.test(fileName) ? 'application/json' : 'text/markdown',
    })
  )

  const url = targetId
    ? `${UPLOAD_API}/files/${targetId}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`

  const method = targetId ? 'PATCH' : 'POST'

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return parseDriveResponse(res)
}

export async function downloadFile(accessToken, fileId) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.text()
}

async function findFolderId(accessToken, folderName) {
  const q = `name='${escapeDriveQuery(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await parseDriveResponse(res)
  if (data.error) return data
  return data.files?.[0]?.id ?? null
}

export async function deleteFile(accessToken, fileId) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.ok || res.status === 404) return { ok: true }
  return parseDriveResponse(res)
}

export async function deleteNoteFile(accessToken, folderName, fileName, existingFileId = null) {
  let targetId = existingFileId
  if (!targetId) {
    const folderId = await findFolderId(accessToken, folderName)
    if (folderId?.error) return folderId
    if (!folderId) return { ok: true }

    const q = `name='${escapeDriveQuery(fileName)}' and '${folderId}' in parents and trashed=false`
    const search = await fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const searchData = await parseDriveResponse(search)
    if (searchData.error) return searchData
    targetId = searchData.files?.[0]?.id
  }

  if (!targetId) return { ok: true }
  return deleteFile(accessToken, targetId)
}

export async function listFiles(accessToken, folderName) {
  const folderId = await getOrCreateFolder(accessToken, folderName)
  if (folderId?.error) return folderId
  return listFilesInFolder(accessToken, folderId)
}

export async function listFolderFiles(accessToken, folderName) {
  const folderId = await findFolderId(accessToken, folderName)
  if (folderId?.error) return folderId
  if (!folderId) return { files: [] }
  return listFilesInFolder(accessToken, folderId)
}

async function listFilesInFolder(accessToken, folderId) {
  const q = `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,mimeType,trashed)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await parseDriveResponse(res)
  if (data.error) return data
  const files = (data.files || []).filter(file =>
    !file.trashed && (/\.md$/i.test(file.name) || /\.canvas\.json$/i.test(file.name))
  )
  return { files }
}
