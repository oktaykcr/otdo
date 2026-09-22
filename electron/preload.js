const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // electron-store
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    getAll: () => ipcRenderer.invoke('store:getAll'),
  },

  // File system
  fs: {
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, content, opts) => ipcRenderer.invoke('fs:writeFile', path, content, opts),
    deleteFile: (path) => ipcRenderer.invoke('fs:deleteFile', path),
    listDir: (path) => ipcRenderer.invoke('fs:listDir', path),
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
    exists: (path) => ipcRenderer.invoke('fs:exists', path),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  },

  // Dialog
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  },

  // Notifications
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  onNotificationPush: (callback) => {
    // Single subscriber — avoids duplicate history entries from StrictMode remount / HMR
    ipcRenderer.removeAllListeners('notification:push')
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('notification:push', handler)
    return () => ipcRenderer.removeListener('notification:push', handler)
  },
  onReminderExpired: (callback) => {
    ipcRenderer.removeAllListeners('reminder:expired')
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('reminder:expired', handler)
    return () => ipcRenderer.removeListener('reminder:expired', handler)
  },

  // Reminders
  reminder: {
    schedule: (id, config) => ipcRenderer.invoke('reminder:schedule', id, config),
    cancel: (id) => ipcRenderer.invoke('reminder:cancel', id),
    list: () => ipcRenderer.invoke('reminder:list'),
    previewSound: (sound) => ipcRenderer.invoke('reminder:previewSound', sound),
  },

  // Shell
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Dock badge (macOS)
  dock: {
    setBadge: (count) => ipcRenderer.invoke('dock:setBadge', count),
  },

  oauth: {
    googleDriveConnect: (creds) => ipcRenderer.invoke('oauth:googleDriveConnect', creds),
    googleDriveCancel: () => ipcRenderer.invoke('oauth:googleDriveCancel'),
  },

  googleDriveConnect: (creds) => ipcRenderer.invoke('oauth:googleDriveConnect', creds),
  googleDriveCancel: () => ipcRenderer.invoke('oauth:googleDriveCancel'),

  // Platform info
  platform: process.platform,
  isElectron: true,
})
