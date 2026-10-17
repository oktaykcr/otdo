import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  HardDrive, Cloud, Send, Moon, Sun, Folder, PenLine, ListTodo,
  CheckCircle, XCircle, Loader, ExternalLink, Eye, EyeOff, ArrowLeft, Download, Bell, Volume2, Trash2, RefreshCw,
} from 'lucide-react'
import { TRASH_RETENTION_OPTIONS, DEFAULT_TRASH_RETENTION_DAYS } from '../../lib/noteTrash'
import { exportBackup, importBackup } from '../../lib/appBackup'
import useSettingsStore from '../../store/settingsStore'
import useNoteStore from '../../store/noteStore'
import { connectGoogleDrive, cancelGoogleDriveConnect } from '../../lib/googleDriveConnect'
import { clampPadding } from '../../lib/editorLayout'
import { delaySecondsToMs, formatDelaySecondsInput } from '../../lib/notePersistStatus'
import { FONT_SIZE_OPTIONS } from '../../lib/fontScale'
import { HELP_TELEGRAM_COMMANDS } from '../../lib/keyboardShortcuts'
import {
  REMINDER_SOUND_OPTIONS,
  canPreviewReminderSound,
  previewReminderSound,
} from '../../lib/reminderSounds'
import GoogleDriveSetupGuideModal, { GoogleDriveSetupGuideButton } from './GoogleDriveSetupGuide'
import TelegramSetupGuideModal, { TelegramSetupGuideButton } from './TelegramSetupGuide'
import { SidebarOpenButton } from '../layout/SidebarToggle'
import { isMac } from '../../lib/platform'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

function Section({ id, icon: Icon, title, children }) {
  return (
    <div id={id} className="card space-y-4 scroll-mt-6">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        <div className="w-8 h-8 bg-accent/15 rounded-lg flex items-center justify-center">
          <Icon size={16} className="text-accent" />
        </div>
        <h2 className="text-headline-sm text-text">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ connected }) {
  return connected ? (
    <span className="flex items-center gap-1.5 text-status-done text-body-sm font-medium">
      <CheckCircle size={14} /> Connected
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-text-faint text-body-sm">
      <XCircle size={14} /> Disconnected
    </span>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-body-md text-text">{label}</div>
        {description && (
          <div className="text-body-sm text-text-muted">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-none
          ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

function NumberField({ label, value, onChange, min = 0, max = 240, step = 8 }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(clampPadding(e.target.value, value))}
      />
    </div>
  )
}

function DelaySecondsField({ label, valueMs, onChange, disabled = false, description, max = 600 }) {
  const [draft, setDraft] = useState(() => formatDelaySecondsInput(valueMs))

  useEffect(() => {
    setDraft(formatDelaySecondsInput(valueMs))
  }, [valueMs])

  const commit = () => {
    const parsed = parseFloat(draft)
    if (Number.isNaN(parsed) || parsed < 0) {
      setDraft(formatDelaySecondsInput(valueMs))
      return
    }
    const clamped = parsed === 0 ? 0 : Math.min(parsed, max)
    const ms = delaySecondsToMs(clamped)
    onChange(ms)
    setDraft(formatDelaySecondsInput(ms))
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2 max-w-xs">
        <input
          type="number"
          className="input flex-1"
          min={0}
          max={max}
          step={0.1}
          value={draft}
          disabled={disabled}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
        <span className="text-body-sm text-text-muted flex-none">sec</span>
      </div>
      {description && (
        <p className="text-body-sm text-text-faint mt-1.5">{description}</p>
      )}
    </div>
  )
}

function FontSizeSelect({ label, description, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      {description && (
        <p className="text-body-sm text-text-muted mb-2">{description}</p>
      )}
      <select
        className="input max-w-xs"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {FONT_SIZE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.px}px)
          </option>
        ))}
      </select>
    </div>
  )
}

function SecretInput({ label, value, onChange, onBlur, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export const SETTINGS_SECTION_IDS = {
  googleDrive: 'settings-google-drive',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const loaded = useSettingsStore(s => s.loaded)
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen)
  const notesPath = useSettingsStore(s => s.notesPath)
  const exportFormat = useSettingsStore(s => s.exportFormat)
  const gdClientId = useSettingsStore(s => s.gdClientId)
  const gdClientSecret = useSettingsStore(s => s.gdClientSecret)
  const gdFolderPath = useSettingsStore(s => s.gdFolderPath)
  const gdConnected = useSettingsStore(s => s.gdConnected)
  const telegramBotToken = useSettingsStore(s => s.telegramBotToken)
  const telegramChatId = useSettingsStore(s => s.telegramChatId)
  const telegramConnected = useSettingsStore(s => s.telegramConnected)
  const editorLineNumbers = useSettingsStore(s => s.editorLineNumbers)
  const editorSpellCheck = useSettingsStore(s => s.editorSpellCheck)
  const appFontSize = useSettingsStore(s => s.appFontSize)
  const editorFontSize = useSettingsStore(s => s.editorFontSize)
  const editorAutoSaveMs = useSettingsStore(s => s.editorAutoSaveMs)
  const gdAutoSyncMs = useSettingsStore(s => s.gdAutoSyncMs)
  const editorPaddingTop = useSettingsStore(s => s.editorPaddingTop)
  const editorPaddingLeft = useSettingsStore(s => s.editorPaddingLeft)
  const editorPaddingRight = useSettingsStore(s => s.editorPaddingRight)
  const editorPaddingBottom = useSettingsStore(s => s.editorPaddingBottom)
  const editorMaxWidth = useSettingsStore(s => s.editorMaxWidth)
  const editorAlign = useSettingsStore(s => s.editorAlign)
  const editorShowBounds = useSettingsStore(s => s.editorShowBounds)
  const showDoneTodos = useSettingsStore(s => s.showDoneTodos)
  const showCancelledTodos = useSettingsStore(s => s.showCancelledTodos)
  const reminderSound = useSettingsStore(s => s.reminderSound)
  const trashRetentionDays = useSettingsStore(s => s.trashRetentionDays)
  const update = useSettingsStore(s => s.update)
  const flush = useSettingsStore(s => s.flush)
  const browseNotesPath = useSettingsStore(s => s.browseNotesPath)
  const syncNotePaths = useNoteStore(s => s.syncNotePaths)
  const importDriveNotes = useNoteStore(s => s.importDriveNotes)
  const testTelegram = useSettingsStore(s => s.testTelegram)

  const [telegramStatus, setTelegramStatus] = useState(null)
  const [telegramTesting, setTelegramTesting] = useState(false)
  const [gdConnecting, setGdConnecting] = useState(false)
  const [gdImporting, setGdImporting] = useState(false)
  const [gdImportStatus, setGdImportStatus] = useState(null)
  const [showGdGuide, setShowGdGuide] = useState(false)
  const [showTgGuide, setShowTgGuide] = useState(false)

  const handleTestTelegram = async () => {
    setTelegramTesting(true)
    setTelegramStatus(null)
    const result = await testTelegram()
    setTelegramStatus(result)
    setTelegramTesting(false)
  }

  const handleGoogleDriveConnect = async () => {
    if (!gdClientId || !gdClientSecret) {
      alert('Please enter OAuth2 Client ID and Client Secret first.')
      return
    }
    if (!isElectron) {
      alert('Google Drive connection is only available in the desktop app.')
      return
    }
    setGdConnecting(true)
    try {
      const result = await connectGoogleDrive({
        clientId: gdClientId,
        clientSecret: gdClientSecret,
      })
      if (result.ok) {
        await update({
          gdAccessToken: result.accessToken,
          gdRefreshToken: result.refreshToken,
          gdConnected: true,
        }, true)
      } else if (result.error !== 'Connection cancelled') {
        alert(result.error || 'Could not connect to Google Drive')
      }
    } finally {
      setGdConnecting(false)
    }
  }

  const handleGoogleDriveConnectCancel = async () => {
    await cancelGoogleDriveConnect()
    setGdConnecting(false)
  }

  useEffect(() => {
    return () => { cancelGoogleDriveConnect() }
  }, [])

  const handleGoogleDriveDisconnect = async () => {
    await update({
      gdAccessToken: null,
      gdRefreshToken: null,
      gdConnected: false,
    }, true)
    setGdImportStatus(null)
  }

  const handleDriveImport = async () => {
    if (!gdConnected) {
      alert('Connect Google Drive first.')
      return
    }
    if (!isElectron) {
      alert('Drive import is only available in the desktop app.')
      return
    }

    setGdImporting(true)
    setGdImportStatus(null)
    try {
      const result = await importDriveNotes()
      if (result.ok) {
        const parts = []
        if (result.imported) parts.push(`${result.imported} imported`)
        if (result.updated) parts.push(`${result.updated} updated`)
        if (result.removed) parts.push(`${result.removed} removed`)
        setGdImportStatus({
          ok: true,
          message: parts.length ? parts.join(', ') : 'Already up to date',
        })
      } else {
        setGdImportStatus({
          ok: false,
          message: result.error || 'Import failed',
        })
      }
    } finally {
      setGdImporting(false)
    }
  }

  const handleBrowseNotesPath = async () => {
    const path = await browseNotesPath()
    if (path) await syncNotePaths()
  }

  const [folderSyncing, setFolderSyncing] = useState(false)
  const [folderSyncStatus, setFolderSyncStatus] = useState(null)
  const handleSyncFolder = async () => {
    setFolderSyncing(true)
    try {
      await flush()
      const { added } = await syncNotePaths()
      setFolderSyncStatus(added ? `${added} item(s) imported` : 'Already up to date')
    } finally {
      setFolderSyncing(false)
    }
  }

  const [backupStatus, setBackupStatus] = useState(null)
  const handleBackup = async (restore) => {
    if (restore && !window.confirm('Restore replaces todos, notes metadata, settings and stats with the backup, then reloads the app. Continue?')) return
    const r = await (restore ? importBackup() : exportBackup())
    if (r.canceled) return
    if (!r.ok) return setBackupStatus({ ok: false, message: r.error || 'Failed' })
    if (restore) window.location.reload()
    else setBackupStatus({ ok: true, message: 'Backup saved' })
  }

  const handleNotesPathBlur = async () => {
    await flush()
    if (notesPath?.trim()) await syncNotePaths()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

  useEffect(() => {
    const section = searchParams.get('section')
    if (!section || !loaded) return

    const id = section === 'google-drive'
      ? SETTINGS_SECTION_IDS.googleDrive
      : null
    if (!id) return

    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    setSearchParams({}, { replace: true })
  }, [searchParams, loaded, setSearchParams])

  if (!loaded) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          {!sidebarOpen && (
            <SidebarOpenButton className={isMac ? 'ml-12' : ''} />
          )}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm
                       text-text-muted hover:bg-surface2 hover:text-text transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-headline-lg text-text font-semibold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Section icon={Moon} title="Appearance">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-body-md text-text">Theme</div>
                <div className="text-body-sm text-text-muted">Choose your preferred color scheme</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-body-sm font-medium"
                >
                  <Moon size={15} /> Dark
                </button>
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface2 text-text-faint text-body-sm cursor-not-allowed"
                  title="Coming soon"
                >
                  <Sun size={15} /> Light
                </button>
              </div>
            </div>
            <FontSizeSelect
              label="Interface font size"
              description="Sidebar, settings, dialogs, and other UI text"
              value={appFontSize}
              onChange={v => update({ appFontSize: v }, true)}
            />
          </Section>

          <Section icon={PenLine} title="Editor">
            <Toggle
              label="Line numbers"
              description="Show block numbers in the left margin"
              checked={editorLineNumbers}
              onChange={v => update({ editorLineNumbers: v }, true)}
            />
            <Toggle
              label="Spell check"
              description="Highlight spelling errors while typing"
              checked={editorSpellCheck}
              onChange={v => update({ editorSpellCheck: v }, true)}
            />
            <FontSizeSelect
              label="Editor font size"
              description="Text size for note content while writing"
              value={editorFontSize}
              onChange={v => update({ editorFontSize: v }, true)}
            />

            <div className="pt-2 border-t border-border space-y-4">
              <div>
                <div className="text-body-md text-text">Writing area</div>
                <div className="text-body-sm text-text-muted">
                  Distance from the editor edges to the writing column (top-left origin)
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <NumberField
                  label="Top (px)"
                  value={editorPaddingTop}
                  onChange={v => update({ editorPaddingTop: v }, true)}
                />
                <NumberField
                  label="Left (px)"
                  value={editorPaddingLeft}
                  onChange={v => update({ editorPaddingLeft: v }, true)}
                />
                <NumberField
                  label="Right (px)"
                  value={editorPaddingRight}
                  onChange={v => update({ editorPaddingRight: v }, true)}
                />
                <NumberField
                  label="Bottom (px)"
                  value={editorPaddingBottom}
                  onChange={v => update({ editorPaddingBottom: v }, true)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Max width</label>
                  <select
                    className="input"
                    value={editorMaxWidth}
                    onChange={e => update({ editorMaxWidth: e.target.value }, true)}
                  >
                    <option value="sm">Narrow (576px)</option>
                    <option value="md">Default (672px)</option>
                    <option value="lg">Wide (768px)</option>
                    <option value="xl">Extra wide (896px)</option>
                    <option value="full">Full width</option>
                  </select>
                </div>
                <div>
                  <label className="label">Horizontal align</label>
                  <select
                    className="input"
                    value={editorAlign}
                    onChange={e => update({ editorAlign: e.target.value }, true)}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left (from top-left)</option>
                  </select>
                </div>
              </div>

              <Toggle
                label="Show writing bounds"
                description="Display a dashed border around the writing area"
                checked={editorShowBounds}
                onChange={v => update({ editorShowBounds: v }, true)}
              />
            </div>
          </Section>

          <Section icon={Bell} title="Notifications">
            <div>
              <label className="label">Reminder sound</label>
              <p className="text-body-sm text-text-muted mb-2">
                Plays when a reminder notification appears
                {!isMac && ' (macOS only — other platforms use the system default)'}
              </p>
              <div className="flex items-center gap-2 max-w-xs">
                <select
                  className="input flex-1"
                  value={reminderSound}
                  onChange={e => update({ reminderSound: e.target.value }, true)}
                >
                  {REMINDER_SOUND_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => previewReminderSound(reminderSound)}
                  disabled={!isMac || !canPreviewReminderSound(reminderSound)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-body-sm font-medium
                             bg-surface2 text-text-muted hover:bg-border hover:text-text transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    !isMac
                      ? 'Sound preview is available on macOS'
                      : canPreviewReminderSound(reminderSound)
                        ? 'Play selected sound'
                        : 'No preview for this option'
                  }
                >
                  <Volume2 size={15} />
                  Preview
                </button>
              </div>
            </div>
          </Section>

          <Section icon={ListTodo} title="Tasks">
            <Toggle
              label="Show completed todos"
              description="When filter is All, hides done todos in notes"
              checked={showDoneTodos}
              onChange={v => update({ showDoneTodos: v }, true)}
            />
            <Toggle
              label="Show cancelled todos"
              description="When filter is All, hides cancelled todos in notes"
              checked={showCancelledTodos}
              onChange={v => update({ showCancelledTodos: v }, true)}
            />
          </Section>

          {/* Local Storage */}
          <Section icon={HardDrive} title="Local Storage">
            <div>
              <label className="label">Notes Folder Path</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono text-body-sm"
                  value={notesPath}
                  onChange={e => update({ notesPath: e.target.value })}
                  onBlur={handleNotesPathBlur}
                  placeholder="/Users/you/Documents/OTDO Notes"
                />
                {isElectron && (
                  <button onClick={handleBrowseNotesPath} className="btn-secondary flex-none">
                    <Folder size={15} />
                    Browse
                  </button>
                )}
              </div>
              <p className="text-body-sm text-text-faint mt-1.5">
                Notes are stored as <code className="font-mono text-accent bg-surface2 px-1 rounded">.md</code> files in this folder.
                Todos are stored in the app's data directory.
                The folder is scanned on every launch.
              </p>
              {isElectron && (
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={handleSyncFolder} disabled={folderSyncing || !notesPath?.trim()} className="btn-secondary btn-sm">
                    <RefreshCw size={14} className={folderSyncing ? 'animate-spin' : ''} />
                    Sync from folder
                  </button>
                  {folderSyncStatus && <span className="text-body-sm text-text-faint">{folderSyncStatus}</span>}
                </div>
              )}
            </div>

            {isElectron && (
              <div>
                <label className="label">Backup</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleBackup(false)} className="btn-secondary btn-sm">Export backup</button>
                  <button onClick={() => handleBackup(true)} className="btn-secondary btn-sm">Restore backup</button>
                  {backupStatus && (
                    <span className={`text-body-sm ${backupStatus.ok ? 'text-text-faint' : 'text-tag-important'}`}>{backupStatus.message}</span>
                  )}
                </div>
                <p className="text-body-sm text-text-faint mt-1.5">
                  Saves todos (status, dates, reminders), notes metadata, settings and XP/level stats to one file.
                  The file includes your Drive and Telegram credentials, so keep it private.
                </p>
              </div>
            )}

            <div>
              <label className="label">Default Export Format</label>
              <select
                className="input"
                value={exportFormat}
                onChange={e => update({ exportFormat: e.target.value }, true)}
              >
                <option value="html">HTML</option>
                <option value="pdf">PDF</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="md">Markdown</option>
              </select>
            </div>

            <DelaySecondsField
              label="Auto-save delay"
              valueMs={editorAutoSaveMs}
              onChange={ms => update({ editorAutoSaveMs: ms }, true)}
              description="Seconds after you stop typing before local notes are saved to disk. 0 = off. Drive notes use the same local save; set auto-sync in Google Drive for upload."
            />

            <div className="pt-2 border-t border-border">
              <label className="label flex items-center gap-1.5">
                <Trash2 size={13} className="text-text-faint" />
                Trash retention
              </label>
              <select
                className="input"
                value={trashRetentionDays ?? DEFAULT_TRASH_RETENTION_DAYS}
                onChange={e => update({ trashRetentionDays: Number(e.target.value) }, true)}
              >
                {TRASH_RETENTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-body-sm text-text-faint mt-1.5">
                Deleted notes stay in Trash for this long, then are permanently removed with orphan todos.
              </p>
            </div>
          </Section>

          {/* Google Drive */}
          <Section id={SETTINGS_SECTION_IDS.googleDrive} icon={Cloud} title="Google Drive">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusBadge connected={gdConnected} />
                <GoogleDriveSetupGuideButton onClick={() => setShowGdGuide(true)} />
              </div>
              {gdConnected ? (
                <button onClick={handleGoogleDriveDisconnect} className="btn-danger btn-sm">
                  Disconnect
                </button>
              ) : gdConnecting ? (
                <div className="flex items-center gap-2">
                  <button disabled className="btn-primary btn-sm opacity-80 cursor-wait">
                    <Loader size={14} className="animate-spin" /> Connecting…
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleDriveConnectCancel}
                    className="btn-ghost btn-sm text-text-faint"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={handleGoogleDriveConnect} className="btn-primary btn-sm">
                  <ExternalLink size={14} /> Connect
                </button>
              )}
            </div>

            <p className="text-body-sm text-text-muted mb-4">
              Connect with your own Google Cloud OAuth credentials. Use{' '}
              <button
                type="button"
                onClick={() => setShowGdGuide(true)}
                className="text-accent hover:underline"
              >
                Setup guide
              </button>
              {' '}for step-by-step instructions (project setup, Drive API, OAuth client, test users).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">OAuth2 Client ID</label>
                <input
                  className="input font-mono text-body-sm"
                  value={gdClientId}
                  onChange={e => update({ gdClientId: e.target.value })}
                  onBlur={() => flush()}
                  placeholder="*.apps.googleusercontent.com"
                />
              </div>
              <SecretInput
                label="Client Secret"
                value={gdClientSecret}
                onChange={v => update({ gdClientSecret: v })}
                onBlur={() => flush()}
                placeholder="GOCSPX-..."
              />
            </div>

            <div>
              <label className="label">Drive Folder Name</label>
              <input
                className="input"
                value={gdFolderPath}
                onChange={e => update({ gdFolderPath: e.target.value })}
                onBlur={() => flush()}
                placeholder="OTDO Notes"
              />
            </div>

            <DelaySecondsField
              label="Auto-sync delay"
              valueMs={gdAutoSyncMs}
              onChange={ms => update({ gdAutoSyncMs: ms }, true)}
              disabled={!gdConnected}
              description="Seconds after you stop typing before Drive-synced notes upload to Google Drive. 0 = off. Separate from local auto-save."
            />

            {gdConnected && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-status-done/10 border border-status-done/20 rounded-xl">
                  <CheckCircle size={16} className="text-status-done" />
                  <div>
                    <div className="text-body-sm font-medium text-status-done">Drive connected</div>
                    <div className="text-label text-text-faint">Notes with sync enabled will upload to "{gdFolderPath}"</div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleDriveImport}
                    disabled={gdImporting}
                    className="btn-secondary btn-sm"
                  >
                    {gdImporting ? (
                      <>
                        <Loader size={14} className="animate-spin" /> Importing…
                      </>
                    ) : (
                      <>
                        <Download size={14} /> Import from Drive folder
                      </>
                    )}
                  </button>
                  <p className="text-body-sm text-text-faint mt-1.5">
                    Downloads .md notes from the folder above. Trashed Drive files are skipped; local Drive notes deleted on Drive are removed.
                  </p>
                  {gdImportStatus && (
                    <p className={`text-body-sm mt-2 ${gdImportStatus.ok ? 'text-status-done' : 'text-tag-important'}`}>
                      {gdImportStatus.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* Telegram */}
          <Section icon={Send} title="Telegram Bot">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusBadge connected={telegramConnected} />
                <TelegramSetupGuideButton onClick={() => setShowTgGuide(true)} />
              </div>
            </div>

            <p className="text-body-sm text-text-muted mb-4">
              Connect your own Telegram bot for todo reminder messages and bot commands (
              <code className="text-xs bg-surface2 px-1 rounded">/list</code>,{' '}
              <code className="text-xs bg-surface2 px-1 rounded">/today</code>,{' '}
              <code className="text-xs bg-surface2 px-1 rounded">/search</code>).
              Not used for notes or Drive sync. See the{' '}
              <button
                type="button"
                onClick={() => setShowTgGuide(true)}
                className="text-accent hover:underline"
              >
                setup guide
              </button>
              {' '}for Bot Token, Chat ID, and troubleshooting.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <SecretInput
                label="Bot Token"
                value={telegramBotToken}
                onChange={v => update({ telegramBotToken: v, telegramConnected: false })}
                onBlur={() => flush()}
                placeholder="123456:ABC-DEF..."
              />
              <div>
                <label className="label">Chat ID</label>
                <input
                  className="input font-mono text-body-sm"
                  value={telegramChatId}
                  onChange={e => update({ telegramChatId: e.target.value, telegramConnected: false })}
                  onBlur={() => flush()}
                  placeholder="123456789"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestTelegram}
                disabled={telegramTesting || !telegramBotToken || !telegramChatId}
                className="btn-secondary flex items-center gap-2"
              >
                {telegramTesting ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
                {telegramTesting ? 'Sending...' : 'Send Test Message'}
              </button>

              {telegramStatus && (
                <span className={`flex items-center gap-1.5 text-body-sm ${
                  telegramStatus.ok ? 'text-status-done' : 'text-tag-important'
                }`}>
                  {telegramStatus.ok
                    ? <><CheckCircle size={14} /> Message sent!</>
                    : <><XCircle size={14} /> {telegramStatus.error}</>
                  }
                </span>
              )}
            </div>

            {telegramConnected && (
              <div className="space-y-2 p-3 bg-surface2 rounded-xl">
                <div className="text-body-sm font-medium text-text">Bot Commands Available</div>
                <div className="space-y-1 font-mono text-body-sm">
                  {HELP_TELEGRAM_COMMANDS.map(item => (
                    <div key={item.command}>
                      <span className="text-accent">{item.command.split(' ')[0]}</span>
                      {item.command.includes(' ') && (
                        <span className="text-text-muted"> {item.command.slice(item.command.indexOf(' '))}</span>
                      )}
                      {' '}
                      <span className="text-text-faint">— {item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-label text-text-faint">
          OTDO v1.0.0 · 2026 oktaykcr
        </div>
      </div>

      <GoogleDriveSetupGuideModal
        open={showGdGuide}
        onClose={() => setShowGdGuide(false)}
      />
      <TelegramSetupGuideModal
        open={showTgGuide}
        onClose={() => setShowTgGuide(false)}
      />
    </div>
  )
}
