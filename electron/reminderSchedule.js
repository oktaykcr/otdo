function computeNextReminderDate(type, time, dayOfWeek, from = new Date(), at = null) {
  const now = from

  if (type === 'once') {
    if (!at) return null
    const next = new Date(at)
    if (Number.isNaN(next.getTime()) || next <= now) return null
    return next
  }

  const [hours, minutes] = (time || '09:00').split(':').map(Number)
  const targetDay = dayOfWeek != null ? Number(dayOfWeek) : now.getDay()

  if (type === 'hourly') {
    const next = new Date(now)
    next.setMinutes(minutes, 0, 0)
    if (next <= now) next.setHours(next.getHours() + 1)
    return next
  }

  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  if (type === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  if (type === 'weekly') {
    let daysUntil = (targetDay - next.getDay() + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next
  }

  if (type === 'monthly') {
    let daysUntil = (targetDay - next.getDay() + 7) % 7
    next.setDate(next.getDate() + daysUntil)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(1)
      next.setHours(hours, minutes, 0, 0)
      daysUntil = (targetDay - next.getDay() + 7) % 7
      next.setDate(next.getDate() + daysUntil)
    }
    return next
  }

  if (next <= now) next.setDate(next.getDate() + 1)
  return next
}

module.exports = { computeNextReminderDate }
