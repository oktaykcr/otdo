# OTDO - Claude Code Instructions

## Overview
OTDO is a desktop todo & note-taking app built with **React + Electron + Tailwind CSS**.
- Markdown notes (`.md`) and canvas notes (`.canvas.json`) on the filesystem under `notesPath`
- Soft-deleted notes in `notesPath/.otdo-trash` (retention configurable)
- Todos, settings, notifications, quick reminders, gamification in Electron `userData` via `electron-store`
- Dark theme only (light mode planned)
- No auth/login/user profiles
- Google Drive and Telegram integrations are generic (user provides own credentials)

## Dev Commands
```bash
npm install               # Install dependencies
npm run dev               # Vite + Electron
npm run build             # Vite production + electron-builder (current platform)
npm run build:mac         # macOS signed build
npm run build:mac:unsigned  # macOS unsigned (local test)
npm run electron          # Electron against built dist
npm run icons:mac         # Generate build/icon.icns
```

## Architecture

### Process Model
- **Main process**: `electron/main.js` — fs I/O, electron-store, notifications, reminder timers (wall-clock), OAuth callback, dock badge
- **Preload**: `electron/preload.js` — exposes `window.api` via contextBridge
- **Renderer**: `src/` — React SPA (HashRouter)

### Routes
| Path | Page |
|------|------|
| `/` | EditorPage (block/canvas editor, tabs, split) |
| `/dashboard` | DashboardPage (stats, XP, activity report) |
| `/notifications` | NotificationsPage (active reminders + history) |
| `/graph` | GraphPage (`@mention` note graph) |
| `/help` | HelpPage (XP, shortcuts, remind examples) |
| `/settings` | SettingsPage (appearance, editor, notifications, storage, Drive, Telegram) |

### State Management (Zustand)
- `src/store/noteStore.js` — notes (`type`: markdown\|canvas), folders, tabs/split, drafts, note reminders, trash
- `src/store/todoStore.js` — todos CRUD + reminder sync
- `src/store/settingsStore.js` — theme, editor, reminder sound, trash retention, paths, integrations
- `src/store/notificationStore.js` — notification history + active reminder list
- `src/store/quickReminderStore.js` — standalone quick reminders
- `src/store/gamificationStore.js` — XP, level, streak, titles, toasts

### IPC API (`window.api`)
```js
window.api.store.get/set/delete/getAll
window.api.fs.readFile/writeFile/listDir/mkdir/deleteFile/exists/rename
// writeFile(path, content, { encoding: 'base64' }) for binary export
window.api.dialog.openDirectory()
window.api.dialog.saveFile(opts)
window.api.notify(title, body)
window.api.onNotificationPush(cb)
window.api.onReminderExpired(cb)
window.api.reminder.schedule(id, config)
window.api.reminder.cancel(id)
window.api.reminder.list()
window.api.reminder.previewSound(sound)
window.api.oauth.googleDriveConnect(creds)
window.api.oauth.googleDriveCancel()
window.api.dock.setBadge(count)
window.api.shell.openExternal(url)
window.api.platform / isElectron
```

### Services
- `src/services/exporter.js` — HTML/PDF/PNG/JPG/MD export (html2canvas + jsPDF)
- `src/services/googleDrive.js` — Generic OAuth2 + Drive API
- `src/services/telegram.js` — Bot API send + polling + command handler

### Important libs
- `src/lib/noteTrash.js` — soft delete paths, retention, purge helpers
- `src/lib/noteCanvas.js` / `canvasExport.js` — canvas model + export
- `src/lib/reminderSchedule.js` (+ `electron/reminderSchedule.js`) — next fire date
- `src/lib/reminderSounds.js` — macOS sound options
- `src/lib/noteReminders.js` / `quickReminders.js` / `remindCommandParser.js`
- `src/lib/gamification.js` — XP rules, titles
- `src/lib/noteGraph.js` — mention graph
- `src/lib/driveSync.js` / `driveAuth.js` — Drive sync helpers

## Design Tokens
```
bg-primary:    #0F172A   (main background)
bg-surface:    #1E293B   (cards/panels)
bg-surface2:   #2D3748   (elevated/hover)
border:        #334155
text:          #F1F5F9
text-muted:    #94A3B8
text-faint:    #64748B
accent:        #6366F1   (indigo)
tag-important: #EF4444
tag-warning:   #F59E0B
tag-info:      #3B82F6
tag-temp:      #64748B
```

## Key Files
```
electron/main.js                 Main process (IPC, reminders, OAuth, dock)
electron/preload.js              contextBridge API
electron/reminderNotify.js       Desktop notification + macOS sound
electron/reminderSchedule.js     computeNextReminderDate (main)
electron/googleOAuth.js          Local OAuth callback server
src/App.jsx                      Router + store init + Telegram polling
src/index.css                    Tailwind base + editor overrides
src/components/layout/           AppLayout, Sidebar (+ Trash), CommandPalette, calendar
src/components/editor/           EditorPage, BlockEditor, tabs/split, SlashMenu, tags
src/components/canvas/           CanvasEditor, CanvasExportModal
src/components/todos/            TodoBlock UI, ReminderForm, TodoDetail
src/components/notes/            NewNoteModal, ExportModal, FolderTree
src/components/dashboard/        DashboardPage, XP, activity report
src/components/notifications/    NotificationsPage
src/components/graph/            GraphPage, NoteGraphCanvas
src/components/help/             HelpPage
src/components/settings/         SettingsPage + setup guides
src/components/common/           Modal, ColorTag, XpToastStack, …
src/store/                       note/todo/settings/notification/quickReminder/gamification
src/services/                    exporter, googleDrive, telegram
src/lib/                         blocks, trash, canvas, reminders, gamification, …
tailwind.config.js               Custom design tokens
```

## Color Tags / Labels
| Tag | Color | Use |
|-----|-------|-----|
| important | `#EF4444` | Critical items |
| warning | `#F59E0B` | Attention needed |
| info | `#3B82F6` | Reference/FYI |
| temp | `#64748B` | Temporary/draft |

Free-form `#tags` on notes are separate from these color labels.

## Notes & Trash
- Note types: `markdown` (`.md`) and `canvas` (`.canvas.json`)
- Delete → soft delete (`deletedAt` + move under `.otdo-trash`); restore / permanent delete / empty trash in Sidebar
- Retention: settings `trashRetentionDays` (7|14|30|60, default 14); `purgeExpiredTrash` on init
- Todo blocks in markdown link via `<!--todo:uuid-->`

## Todo Status Flow
`pending` → `in-progress` → `done` (or `cancelled`)
Status controls live on the embedded TodoBlock / TodoDetail in the editor.

## Reminders
Three scopes: **todo**, **note** (`note:{id}`), **quick** (`quick:{id}`).
Types: `once | hourly | daily | weekly | monthly`.
- Scheduled in main via `setTimeout`, keyed by generation to avoid stale callbacks
- Wall-clock gate: early App Nap/sleep wakes re-arm instead of notifying
- Recalibrate on `powerMonitor` resume/unlock and `browser-window-focus`
- App must be open; on startup stores re-`schedule` enabled reminders
- Optional Telegram; macOS sound from settings (`reminderSound`) + `previewSound`
- Once reminders emit `reminder:expired` → renderer disables them

## Gamification
XP in `gamificationStore` (electron-store key `gamification`).
Earn XP: todo complete (+high / +on-time), in-progress, note create, char milestones, pin, folder, reminder set, daily streak.
Titles: Novice → Legend. Dashboard + sidebar level bar; `XpToastStack` for +XP / level-up toasts.

## Google Drive Integration
Generic OAuth2 — user provides Client ID / Secret from their Google Cloud project.
Tokens stored after connect; notes with `cloudSync: true` sync to configured Drive folder.
Supports `.md` + `.canvas.json`; Import from Drive folder; Local ↔ Drive move.

## Telegram Integration
Generic Bot API — user Bot Token (@BotFather) + Chat ID.
Used for reminder delivery + commands (not note/Drive sync).
Commands: `/list`, `/today`, `/search <q>`, `/help`.
Polling ~5s while app is open and bot is connected.

## Docs
- `README.md` — English project/developer overview
- `USER_GUIDE.md` — Turkish end-user guide
