const http = require('http')
const { shell } = require('electron')

const GOOGLE_OAUTH = {
  REDIRECT_URI: 'http://127.0.0.1:45832/oauth/callback',
  PORT: 45832,
  PATH: '/oauth/callback',
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
}

const OAUTH_TIMEOUT_MS = 2 * 60 * 1000

let activeOAuthServer = null
let activeOAuthSession = null

function closeOAuthServer() {
  if (!activeOAuthServer) return
  try { activeOAuthServer.close() } catch { /* ignore */ }
  activeOAuthServer = null
}

function finishOAuthSession(result) {
  if (!activeOAuthSession) return
  clearTimeout(activeOAuthSession.timeout)
  closeOAuthServer()
  const { resolve } = activeOAuthSession
  activeOAuthSession = null
  resolve(result)
}

function oauthErrorMessage(error, description) {
  if (error === 'access_denied') {
    return 'Google sign-in was denied. Add your Gmail as a Test user in Google Cloud Console → OAuth consent screen, then try again.'
  }
  return description || error || 'Authorization failed'
}

function buildAuthUrl(clientId) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_OAUTH.REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_OAUTH.SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${GOOGLE_OAUTH.AUTH_URL}?${params}`
}

async function exchangeCode(code, clientId, clientSecret) {
  const res = await fetch(GOOGLE_OAUTH.TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: GOOGLE_OAUTH.REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

function cancelGoogleDriveConnect() {
  if (!activeOAuthSession) return { ok: true }
  finishOAuthSession({ ok: false, error: 'Connection cancelled' })
  return { ok: true }
}

function startGoogleDriveConnect({ clientId, clientSecret }) {
  if (!clientId || !clientSecret) {
    return Promise.resolve({ ok: false, error: 'Client ID and Client Secret required' })
  }

  cancelGoogleDriveConnect()

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      finishOAuthSession({
        ok: false,
        error: 'Authorization timed out. Close the browser tab and try again.',
      })
    }, OAUTH_TIMEOUT_MS)

    activeOAuthSession = { resolve, timeout }

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, GOOGLE_OAUTH.REDIRECT_URI)
        if (url.pathname !== GOOGLE_OAUTH.PATH) {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')
        const code = url.searchParams.get('code')

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(
          error
            ? '<html><body style="font-family:sans-serif;padding:2rem"><h2>Connection failed</h2><p>Return to OTDO and try again.</p></body></html>'
            : '<html><body style="font-family:sans-serif;padding:2rem"><h2>Google Drive connected</h2><p>Return to OTDO. You can close this tab.</p></body></html>',
        )

        if (error) {
          finishOAuthSession({
            ok: false,
            error: oauthErrorMessage(error, errorDescription),
          })
          return
        }

        if (!code) {
          finishOAuthSession({ ok: false, error: 'No authorization code received' })
          return
        }

        const tokens = await exchangeCode(code, clientId, clientSecret)
        if (tokens.error) {
          finishOAuthSession({
            ok: false,
            error: tokens.error_description || tokens.error,
          })
          return
        }

        finishOAuthSession({
          ok: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
        })
      } catch (err) {
        finishOAuthSession({ ok: false, error: err.message })
      }
    })

    activeOAuthServer = server

    server.on('error', (err) => {
      finishOAuthSession({
        ok: false,
        error: err.code === 'EADDRINUSE'
          ? `Port ${GOOGLE_OAUTH.PORT} is in use. Close other apps and try again.`
          : err.message,
      })
    })

    server.listen(GOOGLE_OAUTH.PORT, '127.0.0.1', () => {
      shell.openExternal(buildAuthUrl(clientId))
    })
  })
}

module.exports = {
  GOOGLE_OAUTH,
  startGoogleDriveConnect,
  cancelGoogleDriveConnect,
  closeOAuthServer,
}
