async function sendTelegramMessage(botToken, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: String(chatId),
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(data.description || 'Telegram send failed')
  }
  return data
}

module.exports = { sendTelegramMessage }
