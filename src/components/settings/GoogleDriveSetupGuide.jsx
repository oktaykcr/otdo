import { Info, ExternalLink } from 'lucide-react'
import Modal from '../common/Modal'

const LINKS = {
  console: 'https://console.cloud.google.com',
  apisLibrary: 'https://console.cloud.google.com/apis/library',
  driveApi: 'https://console.cloud.google.com/apis/library/drive.googleapis.com',
  oauthConsent: 'https://console.cloud.google.com/auth/audience',
  credentials: 'https://console.cloud.google.com/apis/credentials',
}

function openUrl(url) {
  if (window.api?.shell?.openExternal) {
    window.api.shell.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

function GuideLink({ href, children }) {
  return (
    <button
      type="button"
      onClick={() => openUrl(href)}
      className="text-accent hover:underline inline-flex items-center gap-1"
    >
      {children}
      <ExternalLink size={12} className="inline opacity-70" />
    </button>
  )
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="flex-none w-7 h-7 rounded-full bg-accent/15 text-accent text-label font-semibold
                         flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="flex-1 min-w-0 space-y-2 pb-6 border-b border-border last:border-0 last:pb-0">
        <h3 className="text-body-md font-semibold text-text">{title}</h3>
        <div className="text-body-sm text-text-muted space-y-2 leading-relaxed">{children}</div>
      </div>
    </li>
  )
}

function GuideBody() {
  return (
    <div className="space-y-6">
      <p className="text-body-sm text-text-muted leading-relaxed">
        OTDO uses <strong className="text-text">your own</strong> Google Cloud project and OAuth credentials.
        Nothing is shared with other OTDO users — you create a free project, connect once, and Drive sync works
        from the desktop app.
      </p>

      <ol className="space-y-0 list-none p-0 m-0">
        <Step n="1" title="Create a Google Cloud project">
          <p>
            Open the{' '}
            <GuideLink href={LINKS.console}>Google Cloud Console</GuideLink>
            {' '}and sign in with the Google account you want to use for Drive.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Click the project dropdown (top bar) → <strong>New Project</strong></li>
            <li>Enter a name (e.g. <em>OTDO Drive</em>) → <strong>Create</strong></li>
            <li>Make sure the new project is selected in the top bar</li>
          </ul>
        </Step>

        <Step n="2" title="Configure the OAuth consent screen">
          <p>
            Go to{' '}
            <GuideLink href={LINKS.oauthConsent}>APIs &amp; Services → OAuth consent screen</GuideLink>.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Choose <strong>External</strong> user type (unless you only use a Google Workspace org internally)
            </li>
            <li>Fill in required fields: <strong>App name</strong>, <strong>User support email</strong>,
              and <strong>Developer contact email</strong></li>
            <li>On <strong>Scopes</strong>, you can skip adding scopes manually — OTDO requests Drive file
              access when you connect</li>
            <li>
              On <strong>Test users</strong>, click <strong>Add users</strong> and add the{' '}
              <strong>same Gmail address</strong> you will use to sign in when connecting OTDO
            </li>
            <li>Save. The app stays in <strong>Testing</strong> mode — that is fine for personal use</li>
          </ul>
          <p className="text-label text-tag-warning bg-tag-warning/10 border border-tag-warning/20 rounded-lg px-3 py-2">
            If you skip Test users, Google returns <strong>403 access_denied</strong> when you click Connect.
          </p>
        </Step>

        <Step n="3" title="Enable the Google Drive API">
          <p>
            Open{' '}
            <GuideLink href={LINKS.driveApi}>Google Drive API</GuideLink>
            {' '}(or APIs &amp; Services → Library → search “Google Drive API”).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirm your OTDO project is selected</li>
            <li>Click <strong>Enable</strong></li>
          </ul>
        </Step>

        <Step n="4" title="Create OAuth 2.0 credentials">
          <p>
            Go to{' '}
            <GuideLink href={LINKS.credentials}>APIs &amp; Services → Credentials</GuideLink>
            {' '}→ <strong>Create credentials</strong> → <strong>OAuth client ID</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Application type: <strong>Desktop app</strong> (recommended — no redirect URI setup needed)
            </li>
            <li>Name it (e.g. <em>OTDO Desktop</em>) → <strong>Create</strong></li>
            <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the dialog
              (you can reopen them anytime from the Credentials page)</li>
          </ul>
          <p className="text-label text-text-faint">
            Already created a <strong>Web application</strong> client? It can still work if you added OTDO’s
            redirect URI in Google Console — but Desktop app is simpler for most users.
          </p>
        </Step>

        <Step n="5" title="Connect in OTDO">
          <ul className="list-disc pl-5 space-y-1">
            <li>Paste <strong>Client ID</strong> and <strong>Client Secret</strong> in this Settings page</li>
            <li>Optional: set <strong>Drive Folder Name</strong> (default: <em>OTDO Notes</em>) — synced notes
              go into this folder on your Drive</li>
            <li>Click <strong>Connect</strong> — your browser opens for Google sign-in</li>
            <li>Choose the same Google account you added as a Test user</li>
            <li>If you see “This app isn’t verified”, click <strong>Advanced</strong> →{' '}
              <strong>Go to … (unsafe)</strong> — normal for apps in Testing mode</li>
            <li>When the browser shows success, return to OTDO — status should show <strong>Connected</strong></li>
          </ul>
          <p className="text-label text-text-faint">
            Use <strong>Cancel</strong> if Connect stays on “Connecting…” (e.g. you closed the browser
            without finishing).
          </p>
        </Step>

        <Step n="6" title="Sync notes to Drive">
          <ul className="list-disc pl-5 space-y-1">
            <li>In the sidebar, use <strong>Google Drive → +</strong> to create a Drive-backed note, or</li>
            <li>Right-click a local note → <strong>Move to Google Drive</strong></li>
            <li>Edits auto-save locally; cloud notes upload to your Drive folder on save</li>
          </ul>
        </Step>
      </ol>

      <div className="rounded-xl border border-border bg-surface2/50 p-4 space-y-3">
        <h3 className="text-body-sm font-semibold text-text">Troubleshooting</h3>
        <dl className="text-body-sm text-text-muted space-y-2">
          <div>
            <dt className="font-medium text-text">403 / access_denied</dt>
            <dd>Add your Gmail under OAuth consent screen → Test users. Sign in with that exact account.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Connecting… never finishes</dt>
            <dd>Click Cancel, complete or close the browser sign-in, then try Connect again.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">invalid_client</dt>
            <dd>Check Client ID and Secret for typos. Create new Desktop app credentials if needed.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Connect button does nothing</dt>
            <dd>Quit OTDO completely and restart with <code className="text-xs bg-primary px-1 rounded">npm run dev</code>.</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default function GoogleDriveSetupGuideModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Google Drive setup guide" size="lg">
      <GuideBody />
    </Modal>
  )
}

export function GoogleDriveSetupGuideButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label
                 text-text-faint hover:text-accent hover:bg-accent/10 transition-colors"
      title="Google Drive setup guide"
    >
      <Info size={14} />
      Setup guide
    </button>
  )
}
