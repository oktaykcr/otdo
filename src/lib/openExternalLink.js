export function normalizeLinkUrl(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function openExternalLink(url) {
  const href = normalizeLinkUrl(url)
  if (!href) return
  if (typeof window !== 'undefined' && window.api?.shell?.openExternal) {
    window.api.shell.openExternal(href)
    return
  }
  window.open(href, '_blank', 'noopener,noreferrer')
}
