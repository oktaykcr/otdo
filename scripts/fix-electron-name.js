#!/usr/bin/env node
/**
 * Dev'de macOS menü çubuğu / Dock / About ikonu Info.plist + bundle Resources'tan okunur.
 * app.setName() / setAboutPanelOptions({ iconPath }) macOS'ta bunları değiştirmez.
 * CFBundleExecutable dokunulmaz (binary adı Electron kalmalı).
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const APP_NAME = 'OTDO'
const electronAppRoot = path.join(__dirname, '../node_modules/electron/dist/Electron.app')
const plistPath = path.join(electronAppRoot, 'Contents/Info.plist')
const electronIcnsPath = path.join(electronAppRoot, 'Contents/Resources/electron.icns')
const otdoIcnsCandidates = [
  path.join(__dirname, '../build/icon.icns'),
  path.join(__dirname, '../public/icon.icns'),
]

if (process.platform !== 'darwin') process.exit(0)
if (!fs.existsSync(plistPath)) process.exit(0)

function plistGet(key) {
  try {
    return execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plistPath], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return null
  }
}

function plistSet(key, value) {
  const current = plistGet(key)
  if (current === null) {
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plistPath])
  } else if (current !== value) {
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plistPath])
  }
}

function patchBundleIcon() {
  const source = otdoIcnsCandidates.find(p => fs.existsSync(p))
  if (!source || !fs.existsSync(path.dirname(electronIcnsPath))) return false

  fs.copyFileSync(source, electronIcnsPath)
  try {
    fs.utimesSync(electronAppRoot, new Date(), new Date())
  } catch {
    // ignore
  }
  return true
}

plistSet('CFBundleName', APP_NAME)
plistSet('CFBundleDisplayName', APP_NAME)
plistSet('CFBundleIconFile', 'electron.icns')

const iconPatched = patchBundleIcon()

console.log(`[OTDO] Electron.app display name → ${APP_NAME}`)
console.log(`[OTDO] Electron.app About/Dock icon → ${iconPatched ? 'OTDO' : 'skipped (missing icon.icns)'}`)
