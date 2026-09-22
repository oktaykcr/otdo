/**
 * Telegram Bot API service.
 * User configures their own bot token + chat ID in Settings.
 */

import useTodoStore from '../store/todoStore'
import useNoteStore from '../store/noteStore'
import {
  collectLinkedTodoIds,
  filterTodosForTelegram,
  filterTodosDueToday,
  buildTelegramTodoListMessage,
} from '../lib/telegramTodos'

let pollInterval = null

export function sendMessage(botToken, chatId, text, parseMode = 'HTML') {
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  }).then(r => r.json())
}

export function startPolling(botToken, chatId, onCommand) {
  if (pollInterval) stopPolling()

  let offset = 0
  const expectedChatId = String(chatId)

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=5`
      )
      const data = await res.json()
      if (!data.ok) return

      for (const update of data.result) {
        offset = update.update_id + 1
        const message = update.message
        if (!message?.text?.startsWith('/')) continue
        if (String(message.chat?.id) !== expectedChatId) continue

        const [cmd, ...args] = message.text.split(' ')
        onCommand(cmd, args.join(' '), botToken, chatId)
      }
    } catch {
      // network error, ignore
    }
  }, 5000)
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function getVisibleTodos() {
  const todos = useTodoStore.getState().todos
  const { notes, activeNoteId, activeContent } = useNoteStore.getState()
  const linkedIds = await collectLinkedTodoIds(notes, activeNoteId, activeContent)
  return filterTodosForTelegram(todos, linkedIds)
}

export async function handleCommand(cmd, args, botToken, chatId) {
  if (cmd === '/list') {
    const pending = await getVisibleTodos()
    const text = buildTelegramTodoListMessage(pending, {
      title: '📋 <b>Your Todos</b>',
      emptyText: 'No pending todos linked to your notes.',
    })
    sendMessage(botToken, chatId, text)
  } else if (cmd === '/today') {
    const visible = await getVisibleTodos()
    const today = filterTodosDueToday(visible)
    const text = buildTelegramTodoListMessage(today, {
      title: '📅 <b>Due Today</b>',
      emptyText: 'No todos due today.',
      sortByDue: true,
    })
    sendMessage(botToken, chatId, text)
  } else if (cmd === '/search') {
    const q = args.trim().toLowerCase()
    const visible = await getVisibleTodos()
    const results = q
      ? visible.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        )
      : visible
    const text = buildTelegramTodoListMessage(results, {
      title: q ? `🔍 <b>Search:</b> ${escapeHtmlArg(args.trim())}` : '🔍 <b>Search</b>',
      emptyText: q ? 'No matching todos.' : 'No pending todos linked to your notes.',
    })
    sendMessage(botToken, chatId, text)
  } else if (cmd === '/help') {
    sendMessage(botToken, chatId,
      '🤖 <b>OTDO Bot Commands</b>\n\n' +
      '/list — Pending todos from your notes\n' +
      '/today — Todos due today\n' +
      '/search &lt;query&gt; — Search todos\n' +
      '/help — Show this help'
    )
  }
}

function escapeHtmlArg(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
