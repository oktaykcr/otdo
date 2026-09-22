export const FONT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small', px: 14 },
  { value: 'md', label: 'Medium', px: 16 },
  { value: 'lg', label: 'Large', px: 18 },
  { value: 'xl', label: 'Extra large', px: 20 },
]

const ROOT_PX = Object.fromEntries(FONT_SIZE_OPTIONS.map(o => [o.value, o.px]))

export function normalizeFontSize(size) {
  return ROOT_PX[size] ? size : 'md'
}

export function getAppFontRootPx(size) {
  return ROOT_PX[normalizeFontSize(size)]
}

export function getEditorBasePx(size) {
  return ROOT_PX[normalizeFontSize(size)]
}

export function applyAppFontSize(size) {
  if (typeof document === 'undefined') return
  document.documentElement.style.fontSize = `${getAppFontRootPx(size)}px`
}
