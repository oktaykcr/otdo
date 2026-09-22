const MIRROR_PROPS = [
  'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
  'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
  'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize',
  'whiteSpace', 'wordWrap', 'wordBreak',
]

export function getTextareaCaretClientRect(textarea, position) {
  if (!textarea || typeof document === 'undefined') {
    return { top: 0, left: 0 }
  }

  const div = document.createElement('div')
  const style = window.getComputedStyle(textarea)

  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.overflow = 'hidden'

  for (const prop of MIRROR_PROPS) {
    div.style[prop] = style[prop]
  }

  const textBefore = textarea.value.substring(0, position)
  const textAfter = textarea.value.substring(position)
  div.textContent = textBefore

  const span = document.createElement('span')
  span.textContent = textAfter.length ? textAfter[0] : '.'
  div.appendChild(span)

  document.body.appendChild(div)

  const taRect = textarea.getBoundingClientRect()
  const spanRect = span.getBoundingClientRect()
  const divRect = div.getBoundingClientRect()

  const top = spanRect.top - divRect.top + taRect.top - textarea.scrollTop
  const left = spanRect.left - divRect.left + taRect.left - textarea.scrollLeft

  document.body.removeChild(div)

  return {
    top: top + parseFloat(style.lineHeight || style.fontSize || '16') + 4,
    left,
  }
}
