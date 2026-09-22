export const QUICK_REMINDER_PREFIX = 'quick:'

export function quickReminderId(id) {
  return id?.startsWith(QUICK_REMINDER_PREFIX) ? id : `${QUICK_REMINDER_PREFIX}${id}`
}

export function isQuickReminderId(id) {
  return String(id || '').startsWith(QUICK_REMINDER_PREFIX)
}

export function parseQuickReminderId(id) {
  return isQuickReminderId(id) ? id.slice(QUICK_REMINDER_PREFIX.length) : null
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildQuickReminderNotificationContent(item) {
  const title = item?.title?.trim() || 'Reminder'
  const notificationTitle = title
  const notificationSubtitle = 'Quick reminder'
  const notificationBody = title
  const telegramText =
    `⏰ <b>OTDO Reminder</b>\n\n` +
    `<b>${escapeHtml(title)}</b>\n` +
    escapeHtml('Quick reminder')

  return { notificationTitle, notificationSubtitle, notificationBody, telegramText }
}

export function buildQuickReminderScheduleConfig(item, settings = {}) {
  const { notificationTitle, notificationSubtitle, notificationBody, telegramText } =
    buildQuickReminderNotificationContent(item)

  return {
    scope: 'quick',
    type: item.reminder.type,
    time: item.reminder.time,
    dayOfWeek: item.reminder.dayOfWeek ?? new Date().getDay(),
    at: item.reminder.at || null,
    todoTitle: item.title,
    notificationTitle,
    notificationSubtitle,
    notificationBody,
    telegramText,
    telegramConfig: {
      enabled: !!item.reminder.telegram,
      botToken: settings.telegramBotToken || '',
      chatId: settings.telegramChatId || '',
    },
  }
}

export async function syncQuickReminder(item, settings = {}) {
  if (!window.api?.reminder || !item?.id) return
  const id = quickReminderId(item.id)
  if (item.reminder?.enabled) {
    await window.api.reminder.schedule(id, buildQuickReminderScheduleConfig(item, settings))
  } else {
    await window.api.reminder.cancel(id)
  }
}
