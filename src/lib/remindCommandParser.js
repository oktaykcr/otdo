import {
  addDays,
  addHours,
  addMinutes,
  format,
  nextDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isBefore,
} from 'date-fns'

const WEEKDAY_MAP = {
  sunday: 0, sun: 0, pazar: 0, paz: 0,
  monday: 1, mon: 1, pazartesi: 1, pzt: 1,
  tuesday: 2, tue: 2, tues: 2, sali: 2, salı: 2, sal: 2,
  wednesday: 3, wed: 3, carsamba: 3, çarşamba: 3, car: 3, çar: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, persembe: 4, perşembe: 4, per: 4,
  friday: 5, fri: 5, cuma: 5, cum: 5,
  saturday: 6, sat: 6, cumartesi: 6, cmt: 6,
}

const REMIND_PREFIX = /^(?:remind(?:er)?|hatirlat|hatırlat)\b\s*/i

function atTime(date, hours, minutes) {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0)
}

function parseTimeToken(token) {
  if (!token) return null
  const m = String(token).trim().match(/^(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?$/i)
  if (!m) return null
  let hours = Number(m[1])
  const minutes = m[2] != null ? Number(m[2]) : 0
  const ampm = m[3]?.toLowerCase()
  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null
  if (ampm === 'pm' && hours < 12) hours += 12
  if (ampm === 'am' && hours === 12) hours = 0
  if (!ampm && (hours > 23 || hours < 0)) return null
  if (ampm && hours > 23) return null
  return { hours, minutes, time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` }
}

function nextWeekdayDate(dayOfWeek, from = new Date()) {
  const candidate = nextDay(from, dayOfWeek)
  return candidate
}

function upcomingWeekdayDate(dayOfWeek, hours, minutes, from = new Date()) {
  const today = atTime(from, hours, minutes)
  if (from.getDay() === dayOfWeek && !isBefore(today, from)) {
    return today
  }
  return atTime(nextWeekdayDate(dayOfWeek, from), hours, minutes)
}

function formatPreview(at, type, time, dayOfWeek) {
  if (type === 'once' && at) {
    return format(new Date(at), 'EEE, MMM d · HH:mm')
  }
  if (type === 'weekly') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `Every ${dayNames[dayOfWeek] || 'day'} · ${time}`
  }
  if (type === 'daily') return `Every day · ${time}`
  return time || ''
}

/**
 * Parse command-palette remind queries.
 * Examples:
 *   remind 15:00 call mom
 *   remind next monday standup
 *   remind tomorrow 9am dentist
 *   remind every day 08:00 meds
 *   remind every monday 10:00 weekly sync
 */
export function parseRemindCommand(query) {
  const raw = String(query || '').trim()
  if (!REMIND_PREFIX.test(raw)) return null

  let rest = raw.replace(REMIND_PREFIX, '').trim()
  if (!rest) {
    return {
      incomplete: true,
      title: '',
      preview: 'remind <time|day> <message>',
      hint: 'e.g. remind 15:00 call mom · remind next monday review',
    }
  }

  const now = new Date()
  let at = null
  let time = '09:00'
  let dayOfWeek = now.getDay()
  let hours = 9
  let minutes = 0

  // every day / daily
  let m = rest.match(/^(?:every\s+day|daily|her\s+gun|her\s+gün)\b\s*/i)
  if (m) {
    type = 'daily'
    rest = rest.slice(m[0].length).trim()
    const timeMatch = rest.match(/^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b\s*/i)
    if (timeMatch) {
      const parsed = parseTimeToken(timeMatch[1])
      if (parsed) {
        hours = parsed.hours
        minutes = parsed.minutes
        time = parsed.time
        rest = rest.slice(timeMatch[0].length).trim()
      }
    }
    const title = rest.trim()
    if (!title) {
      return {
        incomplete: true,
        title: '',
        preview: `Daily · ${time}`,
        hint: 'Add a message after the time',
        reminder: { enabled: true, type, time, dayOfWeek, at: null, telegram: false },
      }
    }
    return {
      incomplete: false,
      title,
      preview: formatPreview(null, type, time, dayOfWeek),
      reminder: { enabled: true, type, time, dayOfWeek, at: null, telegram: false },
    }
  }

  // every <weekday>
  m = rest.match(/^(?:every|her)\s+(\w+)\b\s*/i)
  if (m && WEEKDAY_MAP[m[1].toLowerCase()] != null) {
    type = 'weekly'
    dayOfWeek = WEEKDAY_MAP[m[1].toLowerCase()]
    rest = rest.slice(m[0].length).trim()
    const timeMatch = rest.match(/^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b\s*/i)
    if (timeMatch) {
      const parsed = parseTimeToken(timeMatch[1])
      if (parsed) {
        hours = parsed.hours
        minutes = parsed.minutes
        time = parsed.time
        rest = rest.slice(timeMatch[0].length).trim()
      }
    }
    const title = rest.trim()
    if (!title) {
      return {
        incomplete: true,
        title: '',
        preview: formatPreview(null, type, time, dayOfWeek),
        hint: 'Add a message after the schedule',
        reminder: { enabled: true, type, time, dayOfWeek, at: null, telegram: false },
      }
    }
    return {
      incomplete: false,
      title,
      preview: formatPreview(null, type, time, dayOfWeek),
      reminder: { enabled: true, type, time, dayOfWeek, at: null, telegram: false },
    }
  }

  // in N minutes/hours
  m = rest.match(/^in\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|dk|dakika|sa|saat)\b\s*/i)
  if (m) {
    const amount = Number(m[1])
    const unit = m[2].toLowerCase()
    rest = rest.slice(m[0].length).trim()
    const when = /^(h|hr|hrs|hour|hours|sa|saat)$/.test(unit)
      ? addHours(now, amount)
      : addMinutes(now, amount)
    at = when.toISOString()
    time = format(when, 'HH:mm')
    const title = rest.trim()
    if (!title) {
      return {
        incomplete: true,
        title: '',
        preview: formatPreview(at, 'once', time, dayOfWeek),
        hint: 'Add a message',
        reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
      }
    }
    return {
      incomplete: false,
      title,
      preview: formatPreview(at, 'once', time, dayOfWeek),
      reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
    }
  }

  // tomorrow / yarın
  m = rest.match(/^(?:tomorrow|yarin|yarın)\b\s*/i)
  if (m) {
    rest = rest.slice(m[0].length).trim()
    const timeMatch = rest.match(/^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b\s*/i)
    if (timeMatch) {
      const parsed = parseTimeToken(timeMatch[1])
      if (parsed) {
        hours = parsed.hours
        minutes = parsed.minutes
        time = parsed.time
        rest = rest.slice(timeMatch[0].length).trim()
      }
    }
    const when = atTime(addDays(now, 1), hours, minutes)
    at = when.toISOString()
    const title = rest.trim()
    if (!title) {
      return {
        incomplete: true,
        title: '',
        preview: formatPreview(at, 'once', time, dayOfWeek),
        hint: 'Add a message',
        reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
      }
    }
    return {
      incomplete: false,
      title,
      preview: formatPreview(at, 'once', time, dayOfWeek),
      reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
    }
  }

  // next <weekday> / gelecek <weekday>
  m = rest.match(/^(?:next|gelecek)\s+(\w+)\b\s*/i)
  if (m && WEEKDAY_MAP[m[1].toLowerCase()] != null) {
    dayOfWeek = WEEKDAY_MAP[m[1].toLowerCase()]
    rest = rest.slice(m[0].length).trim()
    const timeMatch = rest.match(/^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b\s*/i)
    if (timeMatch) {
      const parsed = parseTimeToken(timeMatch[1])
      if (parsed) {
        hours = parsed.hours
        minutes = parsed.minutes
        time = parsed.time
        rest = rest.slice(timeMatch[0].length).trim()
      }
    }
    const when = atTime(nextWeekdayDate(dayOfWeek, now), hours, minutes)
    at = when.toISOString()
    const title = rest.trim()
    if (!title) {
      return {
        incomplete: true,
        title: '',
        preview: formatPreview(at, 'once', time, dayOfWeek),
        hint: 'Add a message',
        reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
      }
    }
    return {
      incomplete: false,
      title,
      preview: formatPreview(at, 'once', time, dayOfWeek),
      reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
    }
  }

  // bare weekday (monday / pazartesi)
  m = rest.match(/^(\w+)\b\s*/i)
  if (m && WEEKDAY_MAP[m[1].toLowerCase()] != null) {
    dayOfWeek = WEEKDAY_MAP[m[1].toLowerCase()]
    rest = rest.slice(m[0].length).trim()
    const timeMatch = rest.match(/^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b\s*/i)
    if (timeMatch) {
      const parsed = parseTimeToken(timeMatch[1])
      if (parsed) {
        hours = parsed.hours
        minutes = parsed.minutes
        time = parsed.time
        rest = rest.slice(timeMatch[0].length).trim()
      }
    }
    const when = upcomingWeekdayDate(dayOfWeek, hours, minutes, now)
    at = when.toISOString()
    const title = rest.trim()
    if (!title) {
      return {
        incomplete: true,
        title: '',
        preview: formatPreview(at, 'once', time, dayOfWeek),
        hint: 'Add a message',
        reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
      }
    }
    return {
      incomplete: false,
      title,
      preview: formatPreview(at, 'once', time, dayOfWeek),
      reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
    }
  }

  // leading time: remind 15:00 message / remind 9am message
  m = rest.match(/^(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b\s*/i)
  if (m) {
    const parsed = parseTimeToken(m[1])
    if (parsed) {
      hours = parsed.hours
      minutes = parsed.minutes
      time = parsed.time
      rest = rest.slice(m[0].length).trim()
      let when = atTime(now, hours, minutes)
      if (isBefore(when, now) || when.getTime() === now.getTime()) {
        when = addDays(when, 1)
      }
      at = when.toISOString()
      const title = rest.trim()
      if (!title) {
        return {
          incomplete: true,
          title: '',
          preview: formatPreview(at, 'once', time, dayOfWeek),
          hint: 'Add a message after the time',
          reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
        }
      }
      return {
        incomplete: false,
        title,
        preview: formatPreview(at, 'once', time, dayOfWeek),
        reminder: { enabled: true, type: 'once', time, dayOfWeek, at, telegram: false },
      }
    }
  }

  return {
    incomplete: true,
    title: rest,
    preview: 'Could not parse schedule',
    hint: 'Try: remind 15:00 … · remind next monday … · remind tomorrow 9am …',
    error: true,
  }
}

export function isRemindQuery(query) {
  return REMIND_PREFIX.test(String(query || '').trim())
}
