const fs = require('fs')
const { execFile } = require('child_process')

const MACOS_REMINDER_SOUNDS = new Set([
  'Ping', 'Blow', 'Bottle', 'Funk', 'Glass', 'Hero', 'Morse', 'Pop', 'Purr', 'Sosumi', 'Submarine', 'Tink',
])

function resolveMacosSoundFile(soundName) {
  const name = String(soundName || 'Ping').trim()
  if (name === 'none') return null

  const fileName = name === 'default' ? 'Ping' : name
  if (!MACOS_REMINDER_SOUNDS.has(fileName)) return null

  const filePath = `/System/Library/Sounds/${fileName}.aiff`
  return fs.existsSync(filePath) ? filePath : null
}

function playMacosReminderSound(soundName) {
  if (process.platform !== 'darwin') return false

  const filePath = resolveMacosSoundFile(soundName)
  if (!filePath) return false

  execFile('afplay', [filePath], (err) => {
    if (err) console.warn('[reminder] Sound playback failed:', err.message)
  })

  return true
}

function previewReminderSound(soundName) {
  if (process.platform !== 'darwin') return { ok: false, error: 'unsupported_platform' }

  const name = String(soundName || '').trim()
  if (name === 'none' || name === 'default') {
    return { ok: false, error: 'invalid_sound' }
  }

  if (!playMacosReminderSound(name)) {
    return { ok: false, error: 'missing_file' }
  }

  return { ok: true }
}

function showReminderNotification({ title, body, subtitle, sound, resolveAppIcons, mainWindow }) {
  const { Notification, app } = require('electron')

  if (!Notification.isSupported()) {
    console.warn('[reminder] Desktop notifications are not supported')
    if (process.platform === 'darwin') playMacosReminderSound(sound)
    return false
  }

  try {
    const icons = resolveAppIcons()
    const todoTitle = String(title || '').trim() || 'Untitled'
    const soundName = String(sound || 'Ping').trim()
    const usesAfplay = process.platform === 'darwin' && soundName !== 'none'
    const opts = {
      title: todoTitle,
      body: body || '',
      silent: soundName === 'none' || usesAfplay,
    }

    if (process.platform === 'darwin') {
      opts.title = todoTitle
      opts.subtitle = String(subtitle || '').trim() || 'OTDO Reminder'
      if (icons.dock && !icons.dock.isEmpty()) opts.icon = icons.dock
    } else if (icons.window && !icons.window.isEmpty()) {
      opts.icon = icons.window
    }

    const notification = new Notification(opts)
    notification.on('failed', (_event, error) => {
      console.error('[reminder] Notification failed:', error)
    })
    notification.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })
    notification.show()

    if (usesAfplay) {
      playMacosReminderSound(soundName)
    }

    if (process.platform === 'darwin' && app.dock) {
      app.dock.show()
      app.dock.bounce('informational')
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(true)
    }

    return true
  } catch (err) {
    console.error('[reminder] Notification error:', err)
    return false
  }
}

module.exports = { showReminderNotification, previewReminderSound }
