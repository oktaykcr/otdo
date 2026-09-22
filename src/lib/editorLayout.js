export const EDITOR_MAX_WIDTH = {
  sm: 576,
  md: 672,
  lg: 768,
  xl: 896,
  full: null,
}

export const MAC_TITLEBAR_HEIGHT = 40
export const APP_HEADER_HEIGHT = 52
export const SIDEBAR_BRAND_HEIGHT = APP_HEADER_HEIGHT
export const EDITOR_TOOLBAR_HEIGHT = APP_HEADER_HEIGHT
export const EDITOR_META_HEIGHT = 36

export function buildEditorViewportStyle({
  paddingTop,
  paddingLeft,
  paddingRight,
  paddingBottom,
  align,
}) {
  return {
    paddingTop: `${paddingTop}px`,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    paddingBottom: `${paddingBottom}px`,
    minHeight: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: align === 'center' ? 'center' : 'flex-start',
  }
}

export function buildEditorColumnStyle({ maxWidth }) {
  const widthPx = EDITOR_MAX_WIDTH[maxWidth] ?? EDITOR_MAX_WIDTH.md

  return {
    width: '100%',
    maxWidth: widthPx ? `${widthPx}px` : '100%',
    boxSizing: 'border-box',
  }
}

export function clampPadding(value, fallback) {
  const n = Number(value)
  if (Number.isNaN(n)) return fallback
  return Math.min(240, Math.max(0, Math.round(n)))
}
