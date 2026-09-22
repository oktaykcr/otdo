function getApiMethod(...paths) {
  let cur = window.api
  for (const key of paths) {
    cur = cur?.[key]
  }
  return typeof cur === 'function' ? cur : null
}

export function getGoogleDriveConnect() {
  return getApiMethod('oauth', 'googleDriveConnect') ?? getApiMethod('googleDriveConnect')
}

export function getGoogleDriveCancel() {
  return getApiMethod('oauth', 'googleDriveCancel') ?? getApiMethod('googleDriveCancel')
}

export async function connectGoogleDrive(creds) {
  const fn = getGoogleDriveConnect()
  if (!fn) {
    return {
      ok: false,
      error: 'OAuth is not available. Quit OTDO completely and run npm run dev again.',
    }
  }
  return fn(creds)
}

export async function cancelGoogleDriveConnect() {
  const fn = getGoogleDriveCancel()
  if (!fn) return { ok: true }
  return fn()
}
