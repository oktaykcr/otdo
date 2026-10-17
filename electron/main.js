const { app, BrowserWindow, ipcMain, Notification, dialog, shell, nativeImage, Menu, powerMonitor } = require('electron')
const path = require('path')
const fs = require('fs')
const { startGoogleDriveConnect, cancelGoogleDriveConnect, closeOAuthServer } = require('./googleOAuth')

// electron-store for persistent settings
let Store
let store

async function loadStore() {
  Store = (await import('electron-store')).default
  store = new Store()
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const APP_NAME = 'OTDO'
const APP_COPYRIGHT = 'Copyright © 2026 Oktay Kocer'

// Internal Electron name (userData path, About menu text on some platforms).
// macOS menü çubuğu adı Info.plist'ten gelir; dev'de scripts/fix-electron-name.js bunu ayarlar.
app.setName(APP_NAME)

let mainWindow

function resolveAboutIconPath() {
  const candidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../build/icon.icns'),
  ]
  return candidates.find(p => fs.existsSync(p)) || undefined
}

function setupAboutPanel() {
  const iconPath = resolveAboutIconPath()
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: APP_COPYRIGHT,
    credits: 'Simple Todo & Note App',
    ...(iconPath ? { iconPath } : {}),
  })
}

function createAppMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    ...(isMac
      ? [{
          label: APP_NAME,
          submenu: [
            { role: 'about', label: `About ${APP_NAME}` },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide', label: `Hide ${APP_NAME}` },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit', label: `Quit ${APP_NAME}` },
          ],
        }]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' },
            ]),
      ],
    },
    {
      label: 'View',
      submenu: [
        ...(isDev
          ? [
              { role: 'reload' },
              { role: 'forceReload' },
              { role: 'toggleDevTools' },
              { type: 'separator' },
            ]
          : []),
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
            ]
          : [{ role: 'close' }]),
      ],
    },
  ]

  if (!isMac) {
    template.unshift({
      label: 'File',
      submenu: [{ role: 'quit', label: `Quit ${APP_NAME}` }],
    })
    template.push({
      label: 'Help',
      submenu: [
        {
          label: `About ${APP_NAME}`,
          click: () => app.showAboutPanel(),
        },
      ],
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function resolveAppIcons() {
  const buildDir = path.join(__dirname, '../build')
  const publicDir = path.join(__dirname, '../public')
  const pngCandidates = [
    path.join(buildDir, 'icon.png'),
    path.join(publicDir, 'icon.png'),
  ]
  const icnsPath = path.join(buildDir, 'icon.icns')

  let png = null
  for (const candidate of pngCandidates) {
    if (fs.existsSync(candidate)) {
      png = nativeImage.createFromPath(candidate)
      if (png && !png.isEmpty()) break
      png = null
    }
  }

  const icns = fs.existsSync(icnsPath) ? nativeImage.createFromPath(icnsPath) : null

  const pngOk = png && !png.isEmpty()
  const icnsOk = icns && !icns.isEmpty()

  return {
    window: icnsOk ? icns : (pngOk ? png : null),
    dock: pngOk ? png : (icnsOk ? icns : null),
  }
}

function createWindow() {
  const isMac = process.platform === 'darwin'
  const icons = resolveAppIcons()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 12, y: 14 } : undefined,
    backgroundColor: '#0F172A',
    ...(icons.window ? { icon: icons.window } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await loadStore()
  setupAboutPanel()
  createAppMenu()

  if (process.platform === 'darwin') {
    const { dock } = resolveAppIcons()
    if (dock) {
      try {
        app.dock.setIcon(dock)
      } catch {
        // PNG fallback is handled in resolveAppIcons
      }
    }
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Sleep / App Nap can make setTimeout fire early or drift. Re-arm from wall clock.
  powerMonitor.on('resume', () => recalibrateAllReminders('resume'))
  powerMonitor.on('unlock-screen', () => recalibrateAllReminders('unlock'))
  app.on('browser-window-focus', () => recalibrateAllReminders('focus'))
})

app.on('window-all-closed', () => {
  closeOAuthServer()
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: electron-store ───────────────────────────────────────────────────
ipcMain.handle('store:get', (_e, key) => store.get(key))
ipcMain.handle('store:set', (_e, key, value) => store.set(key, value))
ipcMain.handle('store:delete', (_e, key) => store.delete(key))
ipcMain.handle('store:getAll', () => store.store)

// ─── IPC: File System ─────────────────────────────────────────────────────
ipcMain.handle('fs:readFile', async (_e, filePath) => {
  try {
    return { ok: true, data: fs.readFileSync(filePath, 'utf-8') }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('fs:writeFile', async (_e, filePath, content, opts = {}) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    if (opts?.encoding === 'base64') {
      fs.writeFileSync(filePath, Buffer.from(content, 'base64'))
    } else {
      fs.writeFileSync(filePath, content, 'utf-8')
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('fs:deleteFile', async (_e, filePath) => {
  try {
    fs.unlinkSync(filePath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('fs:listDir', async (_e, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { ok: true, data: [] }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return {
      ok: true,
      data: entries.map(e => ({
        name: e.name,
        isDir: e.isDirectory(),
        path: path.join(dirPath, e.name),
      })),
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('fs:mkdir', async (_e, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('fs:exists', async (_e, filePath) => {
  return fs.existsSync(filePath)
})

ipcMain.handle('fs:rename', async (_e, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ─── IPC: Dialog ──────────────────────────────────────────────────────────
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openFile', async (_e, opts) => {
  const result = await dialog.showOpenDialog(mainWindow, { ...opts, properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_e, opts) => {
  const result = await dialog.showSaveDialog(mainWindow, opts)
  return result.canceled ? null : result.filePath
})

// ─── IPC: Notifications ────────────────────────────────────────────────────
const { showReminderNotification, previewReminderSound } = require('./reminderNotify')

function getReminderSoundFromSettings() {
  const settings = store?.get('settings') || {}
  return settings.reminderSound || 'Ping'
}

ipcMain.handle('notify', (_e, title, body) => {
  showReminderNotification({
    title,
    body,
    subtitle: 'OTDO',
    sound: getReminderSoundFromSettings(),
    resolveAppIcons,
    mainWindow,
  })
})

ipcMain.handle('reminder:previewSound', (_e, sound) => previewReminderSound(sound))

const { computeNextReminderDate } = require('./reminderSchedule')
const { sendTelegramMessage } = require('./telegramSend')
const { buildTelegramTextFromScheduleConfig, buildNotificationFromScheduleConfig } = require('./reminderMessages')

// ─── IPC: Reminders ────────────────────────────────────────────────────────
const activeReminders = new Map()
const reminderMeta = new Map()
const reminderGenerations = new Map()
const firingReminders = new Set()
const lastTelegramSentAt = new Map()
const lastInAppNotificationAt = new Map()
const TELEGRAM_DEDUP_MS = 55_000
const IN_APP_DEDUP_MS = 55_000
const MIN_REMINDER_DELAY_MS = 1_000
// setTimeout delay is a 32-bit signed int; longer waits must be chained.
const MAX_TIMEOUT_MS = 2_147_483_647
// Ignore coalesced/App Nap wake-ups that fire before the wall-clock schedule.
const EARLY_SKEW_MS = 2_000

function pushInAppNotification(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('notification:push', payload)
  }
}

function pushReminderExpired(id, config) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reminder:expired', {
      id,
      scope: config.scope || 'todo',
      noteId: config.noteId || null,
    })
  }
}

function nextReminderGeneration(id) {
  const gen = (reminderGenerations.get(id) || 0) + 1
  reminderGenerations.set(id, gen)
  return gen
}

function clearReminderTimeout(id) {
  if (activeReminders.has(id)) {
    clearTimeout(activeReminders.get(id))
    activeReminders.delete(id)
  }
}

function cancelReminderTimer(id) {
  clearReminderTimeout(id)
  reminderMeta.delete(id)
  reminderGenerations.delete(id)
  lastTelegramSentAt.delete(id)
  lastInAppNotificationAt.delete(id)
}

function armTimer(id, config, nextFireAt) {
  clearReminderTimeout(id)
  const remaining = nextFireAt.getTime() - Date.now()
  const delay = Math.max(MIN_REMINDER_DELAY_MS, Math.min(MAX_TIMEOUT_MS, remaining))
  const gen = nextReminderGeneration(id)
  const timeout = setTimeout(() => { runReminder(id, config, gen) }, delay)
  activeReminders.set(id, timeout)
  reminderMeta.set(id, { config, nextFireAt })
  return true
}

function scheduleNextFire(id, config) {
  const { type, time, dayOfWeek, at } = config
  const next = computeNextReminderDate(type, time, dayOfWeek, new Date(), at)
  if (!next) {
    if (type === 'once') pushReminderExpired(id, config)
    return false
  }
  return armTimer(id, config, next)
}

function recalibrateAllReminders(reason = 'recalibrate') {
  for (const [id, meta] of [...reminderMeta.entries()]) {
    if (firingReminders.has(id)) continue
    const { config, nextFireAt } = meta
    if (!(nextFireAt instanceof Date) || Number.isNaN(nextFireAt.getTime())) {
      scheduleNextFire(id, config)
      continue
    }

    const remaining = nextFireAt.getTime() - Date.now()
    if (remaining > EARLY_SKEW_MS) {
      // Re-arm from wall clock so sleep/App Nap cannot leave a bogus timeout.
      armTimer(id, config, nextFireAt)
      continue
    }

    // Due (or overdue while backgrounded): fire once, then recurring reschedule.
    const gen = nextReminderGeneration(id)
    clearReminderTimeout(id)
    reminderMeta.set(id, { config, nextFireAt })
    console.info(`[reminder] Firing due reminder on ${reason}: ${id}`)
    void runReminder(id, config, gen)
  }
}

async function runReminder(id, config, gen) {
  // Stale callback: reminder was cancelled/rescheduled after this timer was queued.
  // Must not touch activeReminders — otherwise we orphan the newer timer
  // (delete without clearTimeout) and it fires again → duplicate notifications.
  if (reminderGenerations.get(id) !== gen) return

  const scheduledAt = reminderMeta.get(id)?.nextFireAt
  if (scheduledAt instanceof Date && !Number.isNaN(scheduledAt.getTime())) {
    const remaining = scheduledAt.getTime() - Date.now()
    if (remaining > EARLY_SKEW_MS) {
      // Timer woke early (common after App Nap / coming back to foreground).
      console.warn(
        `[reminder] Early wake for ${id}, re-arming (${Math.round(remaining / 1000)}s left)`
      )
      armTimer(id, config, scheduledAt)
      return
    }
  }

  if (firingReminders.has(id)) return
  firingReminders.add(id)

  try {
    if (reminderGenerations.get(id) === gen && activeReminders.has(id)) {
      activeReminders.delete(id)
    }

    const isOnce = config.type === 'once'
    const stillCurrent = reminderGenerations.get(id) === gen

    // Only the current generation may reschedule. A concurrent note sync may have
    // already installed a newer timer — leave it alone.
    if (stillCurrent) {
      if (!isOnce) {
        scheduleNextFire(id, config)
      } else {
        reminderMeta.delete(id)
        reminderGenerations.delete(id)
      }
    }

    const { telegramConfig } = config
    const { notificationTitle, notificationSubtitle, notificationBody } =
      buildNotificationFromScheduleConfig(config)

    const now = Date.now()
    const lastInApp = lastInAppNotificationAt.get(id) || 0
    const shouldNotify = now - lastInApp >= IN_APP_DEDUP_MS

    if (shouldNotify) {
      lastInAppNotificationAt.set(id, now)

      showReminderNotification({
        title: notificationTitle,
        body: notificationBody,
        subtitle: notificationSubtitle,
        sound: getReminderSoundFromSettings(),
        resolveAppIcons,
        mainWindow,
      })

      pushInAppNotification({
        type: 'reminder',
        todoId: config.scope === 'note' ? null : id,
        noteId: config.noteId || null,
        title: notificationTitle,
        subtitle: notificationSubtitle,
        body: notificationBody,
      })
    } else {
      console.warn(`[reminder] Skipped duplicate in-app notification for ${id}`)
    }

    if (telegramConfig?.enabled && telegramConfig.botToken && telegramConfig.chatId) {
      const lastSent = lastTelegramSentAt.get(id) || 0
      if (now - lastSent >= TELEGRAM_DEDUP_MS) {
        const telegramText = buildTelegramTextFromScheduleConfig(config)
        if (telegramText.trim()) {
          try {
            await sendTelegramMessage(
              telegramConfig.botToken,
              telegramConfig.chatId,
              telegramText
            )
            lastTelegramSentAt.set(id, now)
          } catch (err) {
            console.error('[reminder] Telegram failed:', err.message)
          }
        }
      } else {
        console.warn(`[reminder] Skipped duplicate Telegram for ${id}`)
      }
    }

    if (isOnce && stillCurrent) pushReminderExpired(id, config)
  } finally {
    firingReminders.delete(id)
  }
}

function scheduleReminder(id, config) {
  clearReminderTimeout(id)
  reminderMeta.delete(id)
  scheduleNextFire(id, config)
}

ipcMain.handle('reminder:schedule', (_e, id, config) => {
  scheduleReminder(id, config)
  return { ok: true }
})

ipcMain.handle('reminder:cancel', (_e, id) => {
  cancelReminderTimer(id)
  return { ok: true }
})

ipcMain.handle('reminder:list', () => {
  return Array.from(reminderMeta.entries()).map(([id, { config, nextFireAt }]) => ({
    id,
    scope: config.scope || 'todo',
    noteId: config.noteId || null,
    todoTitle: config.noteTitle || config.todoTitle || config.notificationTitle || 'Untitled',
    type: config.type,
    time: config.time,
    at: config.at || null,
    dayOfWeek: config.dayOfWeek ?? null,
    nextFireAt: nextFireAt.toISOString(),
    telegramEnabled: !!config.telegramConfig?.enabled,
  }))
})

// ─── IPC: OAuth ─────────────────────────────────────────────────────────────
ipcMain.handle('oauth:googleDriveConnect', (_e, creds) => startGoogleDriveConnect(creds))
ipcMain.handle('oauth:googleDriveCancel', () => cancelGoogleDriveConnect())

// ─── IPC: Dock badge (macOS) ───────────────────────────────────────────────
ipcMain.handle('dock:setBadge', (_e, count) => {
  if (process.platform !== 'darwin' || !app.dock) return
  const n = Math.max(0, Number(count) || 0)
  app.dock.setBadge(n > 0 ? (n > 99 ? '99+' : String(n)) : '')
})

// ─── IPC: Shell ────────────────────────────────────────────────────────────
ipcMain.handle('shell:openExternal', (_e, url) => {
  shell.openExternal(url)
})
