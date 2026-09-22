export const REMINDER_SOUND_OPTIONS = [
  { value: 'default', label: 'System default' },
  { value: 'none', label: 'None (silent)' },
  { value: 'Ping', label: 'Ping' },
  { value: 'Blow', label: 'Blow' },
  { value: 'Bottle', label: 'Bottle' },
  { value: 'Funk', label: 'Funk' },
  { value: 'Glass', label: 'Glass' },
  { value: 'Hero', label: 'Hero' },
  { value: 'Morse', label: 'Morse' },
  { value: 'Pop', label: 'Pop' },
  { value: 'Purr', label: 'Purr' },
  { value: 'Sosumi', label: 'Sosumi' },
  { value: 'Submarine', label: 'Submarine' },
  { value: 'Tink', label: 'Tink' },
]

export function canPreviewReminderSound(sound) {
  return sound && sound !== 'none' && sound !== 'default'
}

export function previewReminderSound(sound) {
  if (!canPreviewReminderSound(sound)) return
  window.api?.reminder?.previewSound?.(sound)
}
