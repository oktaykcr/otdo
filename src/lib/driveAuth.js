import { refreshToken } from '../services/googleDrive'
import { connectGoogleDrive } from './googleDriveConnect'

let onSettingsPatch = null
let reauthPromise = null

export function bindDriveSettingsSync(fn) {
  onSettingsPatch = fn
}

function isElectron() {
  return typeof window !== 'undefined' && window.api?.isElectron
}

export function isDriveAuthError(error) {
  if (!error) return false
  const code = error.code ?? error.status
  return code === 401 || code === 403 || error.status === 'UNAUTHENTICATED'
}

export function isTokenRefreshError(data) {
  if (!data || data.access_token) return false
  const err = String(data.error || '')
  return err === 'invalid_grant'
    || err === 'invalid_token'
    || err === 'unauthorized_client'
    || err === 'invalid_client'
}

async function readStoredSettings() {
  if (!isElectron()) return null
  return (await window.api.store.get('settings')) || {}
}

async function applyDriveSettingsPatch(patch) {
  if (!isElectron()) return

  const current = await readStoredSettings()
  const next = { ...current, ...patch }
  await window.api.store.set('settings', next)
  onSettingsPatch?.(patch)
}

export async function clearDriveConnection() {
  await applyDriveSettingsPatch({
    gdConnected: false,
    gdAccessToken: null,
    gdRefreshToken: null,
  })
}

export function normalizeDriveSettings(settings) {
  if (!settings?.gdConnected) return settings

  const hasToken = settings.gdAccessToken || settings.gdRefreshToken
  if (!hasToken) {
    return {
      ...settings,
      gdConnected: false,
      gdAccessToken: null,
      gdRefreshToken: null,
    }
  }

  return settings
}

export async function refreshAccessToken(settings) {
  if (!settings?.gdRefreshToken || !settings.gdClientId || !settings.gdClientSecret) {
    return { ok: false, needsReauth: true, error: 'Refresh token missing' }
  }

  const refreshed = await refreshToken(
    settings.gdRefreshToken,
    settings.gdClientId,
    settings.gdClientSecret,
  )

  if (refreshed.access_token) {
    const patch = { gdAccessToken: refreshed.access_token }
    if (refreshed.refresh_token) patch.gdRefreshToken = refreshed.refresh_token
    await applyDriveSettingsPatch(patch)
    return { ok: true, token: refreshed.access_token }
  }

  if (isTokenRefreshError(refreshed)) {
    await applyDriveSettingsPatch({
      gdAccessToken: null,
      gdRefreshToken: null,
    })
    return {
      ok: false,
      needsReauth: true,
      error: refreshed.error_description || refreshed.error || 'Session expired',
    }
  }

  return {
    ok: false,
    needsReauth: false,
    error: refreshed.error_description || refreshed.error || 'Token refresh failed',
  }
}

export async function reconnectGoogleDrive(settings) {
  if (!isElectron()) {
    return { ok: false, error: 'Google Drive connection is only available in the desktop app.' }
  }

  const creds = settings || normalizeDriveSettings(await readStoredSettings())
  if (!creds?.gdClientId || !creds?.gdClientSecret) {
    return {
      ok: false,
      needsReauth: true,
      error: 'OAuth credentials missing. Open Settings → Google Drive to reconnect.',
    }
  }

  if (reauthPromise) return reauthPromise

  reauthPromise = (async () => {
    try {
      const result = await connectGoogleDrive({
        clientId: creds.gdClientId,
        clientSecret: creds.gdClientSecret,
      })

      if (result.ok) {
        const patch = {
          gdAccessToken: result.accessToken,
          gdConnected: true,
        }
        if (result.refreshToken) patch.gdRefreshToken = result.refreshToken
        await applyDriveSettingsPatch(patch)
        return { ok: true, accessToken: result.accessToken }
      }

      const cancelled = result.error === 'Connection cancelled'
      return {
        ok: false,
        cancelled,
        needsReauth: !cancelled,
        error: cancelled
          ? 'Google Drive reconnection cancelled.'
          : (result.error || 'Could not reconnect to Google Drive'),
      }
    } finally {
      reauthPromise = null
    }
  })()

  return reauthPromise
}

export async function ensureDriveAccessToken(settings, { allowReauth = false } = {}) {
  const base = normalizeDriveSettings(settings || await readStoredSettings())
  if (!base?.gdConnected) {
    return { ok: false, error: 'Google Drive not connected' }
  }

  if (base.gdAccessToken) {
    return { ok: true, token: base.gdAccessToken, settings: base }
  }

  if (base.gdRefreshToken && base.gdClientId && base.gdClientSecret) {
    const refreshed = await refreshAccessToken(base)
    if (refreshed.ok) {
      const updated = { ...base, gdAccessToken: refreshed.token }
      return { ok: true, token: refreshed.token, settings: updated }
    }
    if (refreshed.needsReauth && allowReauth) {
      const reauth = await reconnectGoogleDrive(base)
      if (reauth.ok) {
        const updated = normalizeDriveSettings(await readStoredSettings())
        return { ok: true, token: reauth.accessToken, settings: updated }
      }
      return {
        ok: false,
        error: reauth.error,
        needsReauth: reauth.needsReauth,
        cancelled: reauth.cancelled,
      }
    }
    if (refreshed.needsReauth) {
      return {
        ok: false,
        error: 'Google Drive session expired. Reconnect in Settings.',
        needsReauth: true,
      }
    }
    return { ok: false, error: refreshed.error || 'Could not refresh Google Drive session' }
  }

  if (allowReauth && base.gdClientId && base.gdClientSecret) {
    const reauth = await reconnectGoogleDrive(base)
    if (reauth.ok) {
      const updated = normalizeDriveSettings(await readStoredSettings())
      return { ok: true, token: reauth.accessToken, settings: updated }
    }
    return {
      ok: false,
      error: reauth.error,
      needsReauth: reauth.needsReauth,
      cancelled: reauth.cancelled,
    }
  }

  return { ok: false, error: 'Google Drive not connected', needsReauth: true }
}

export async function refreshDriveSessionOnInit() {
  if (!isElectron()) return

  const settings = normalizeDriveSettings(await readStoredSettings())
  if (!settings?.gdConnected) return

  if (settings.gdRefreshToken && settings.gdClientId && settings.gdClientSecret) {
    await refreshAccessToken(settings)
    return
  }

  if (!settings.gdAccessToken) {
    await applyDriveSettingsPatch({ gdAccessToken: null })
  }
}

export async function getDriveSettings({ allowReauth = false } = {}) {
  const auth = await ensureDriveAccessToken(null, { allowReauth })
  if (!auth.ok) return null
  return auth.settings
}
