import { useMemo } from 'react'
import { parseInlineMarkdown } from '../../lib/inlineFormat'
import { openExternalLink } from '../../lib/openExternalLink'
import { isNoteMentionHref, getNoteIdFromMention } from '../../lib/noteMentions'

function plainTextFromParts(parts) {
  if (!parts?.length) return ''
  return parts.map(p => {
    if (p.type === 'text') return p.value || ''
    return plainTextFromParts(p.children)
  }).join('')
}

function openLinkEdit(part, onLinkEdit, e) {
  onLinkEdit?.({
    start: part.sourceStart,
    end: part.sourceEnd,
    label: plainTextFromParts(part.children),
    href: part.href,
    top: e.clientY,
    left: e.clientX,
  })
}

function renderParts(parts, keyPrefix, onLinkEdit, onNoteMention) {
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`

    if (part.type === 'text') {
      return <span key={key}>{part.value}</span>
    }

    const children = part.children ? renderParts(part.children, key, onLinkEdit, onNoteMention) : null

    switch (part.type) {
      case 'bold':
        return <strong key={key} className="font-semibold">{children}</strong>
      case 'italic':
        return <em key={key} className="italic">{children}</em>
      case 'strike':
        return <s key={key} className="line-through opacity-80">{children}</s>
      case 'code':
        return (
          <code key={key} className="px-1 py-0.5 rounded bg-surface2 text-accent font-mono text-[0.9em]">
            {children}
          </code>
        )
      case 'color':
        return (
          <span key={key} style={{ color: `#${part.color}` }}>
            {children}
          </span>
        )
      case 'link':
        if (isNoteMentionHref(part.href)) {
          const noteId = getNoteIdFromMention(part.href)
          return (
            <button
              key={key}
              type="button"
              title="Open linked note"
              className="inline-flex items-center gap-0.5 text-accent bg-accent/10 hover:bg-accent/20
                         px-1 py-0.5 rounded-md font-medium cursor-pointer align-baseline"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (noteId) onNoteMention?.(noteId)
              }}
            >
              <span className="opacity-70">@</span>
              {children}
            </button>
          )
        }
        return (
          <a
            key={key}
            href={part.href}
            title={part.href}
            className="text-accent underline underline-offset-2 hover:text-accent-hover cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openExternalLink(part.href)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openLinkEdit(part, onLinkEdit, e)
            }}
          >
            {children}
          </a>
        )
      default:
        return <span key={key}>{children}</span>
    }
  })
}

export default function InlineMarkdown({ text, className = '', onLinkEdit, onNoteMention }) {
  const parts = useMemo(() => parseInlineMarkdown(text), [text])
  return <span className={className}>{renderParts(parts, 'r', onLinkEdit, onNoteMention)}</span>
}
