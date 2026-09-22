import { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Link2, Palette,
  Type, Heading1, Heading2, Heading3, List, ListOrdered, ChevronDown,
} from 'lucide-react'
import { TEXT_FORMAT_COLORS } from '../../lib/inlineFormat'

const BLOCK_TYPE_OPTIONS = [
  { value: 'p', label: 'Text', icon: Type },
  { value: 'h1', label: 'Heading 1', icon: Heading1 },
  { value: 'h2', label: 'Heading 2', icon: Heading2 },
  { value: 'h3', label: 'Heading 3', icon: Heading3 },
  { value: 'bullet', label: 'Bullet list', icon: List },
  { value: 'numbered', label: 'Numbered list', icon: ListOrdered },
]

export default function InlineFormatToolbar({
  position,
  onFormat,
  onLink,
  onTypeChange,
  blockType = 'p',
  activeFormats,
  hasTextSelection = false,
}) {
  const [showColors, setShowColors] = useState(false)
  const [showBlockTypes, setShowBlockTypes] = useState(false)
  const ref = useRef(null)

  const bold = activeFormats?.bold ?? false
  const italic = activeFormats?.italic ?? false
  const strike = activeFormats?.strike ?? false
  const code = activeFormats?.code ?? false
  const link = activeFormats?.link ?? false
  const activeColor = activeFormats?.color ?? null

  const currentBlockType = BLOCK_TYPE_OPTIONS.find(o => o.value === blockType) || BLOCK_TYPE_OPTIONS[0]

  useEffect(() => {
    if (!hasTextSelection) {
      setShowColors(false)
      setShowBlockTypes(false)
    }
  }, [hasTextSelection])

  useEffect(() => {
    if (!showColors && !showBlockTypes) return
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowColors(false)
        setShowBlockTypes(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showColors, showBlockTypes])

  if (!position || !hasTextSelection) return null

  return (
    <div
      ref={ref}
      data-inline-format-toolbar
      className="no-drag fixed z-[10000] flex items-center gap-0.5 px-1.5 py-1 rounded-xl
                 bg-surface border border-border shadow-modal animate-fade-in"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        WebkitAppRegion: 'no-drag',
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {onTypeChange && (
        <div className="relative">
          <button
            type="button"
            title="Block type"
            onClick={() => {
              setShowBlockTypes(s => !s)
              setShowColors(false)
            }}
            className={`flex items-center gap-0.5 pl-1.5 pr-1 py-1 rounded-lg transition-colors ${
              showBlockTypes ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-surface2 hover:text-text'
            }`}
          >
            <currentBlockType.icon size={15} strokeWidth={2} />
            <ChevronDown size={12} strokeWidth={2} className="opacity-70" />
          </button>
          {showBlockTypes && (
            <div className="absolute bottom-full left-0 mb-2 py-1 min-w-[10.5rem] rounded-xl
                            bg-surface border border-border shadow-modal">
              {BLOCK_TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon
                const isActive = blockType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onTypeChange(opt.value)
                      setShowBlockTypes(false)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-body-sm transition-colors ${
                      isActive ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-surface2 hover:text-text'
                    }`}
                  >
                    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <span className="w-px h-5 bg-border mx-0.5" />

      <ToolbarBtn icon={Bold} title="Bold (⌘B)" active={bold} onClick={() => onFormat('bold')} />
      <ToolbarBtn icon={Italic} title="Italic (⌘I)" active={italic} onClick={() => onFormat('italic')} />
      <ToolbarBtn icon={Strikethrough} title="Strikethrough (⌘⇧X)" active={strike} onClick={() => onFormat('strike')} />
      <ToolbarBtn icon={Code} title="Inline code (⌘⇧E)" active={code} onClick={() => onFormat('code')} />

      {(hasTextSelection || link) && onLink && (
        <ToolbarBtn icon={Link2} title="Link (⌘K)" active={!!link} onClick={onLink} />
      )}

      <span className="w-px h-5 bg-border mx-0.5" />

      <div className="relative">
        <ToolbarBtn
          icon={Palette}
          title="Text color"
          active={!!activeColor || showColors}
          onClick={() => {
            setShowColors(s => !s)
            setShowBlockTypes(false)
          }}
        />
        {showColors && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-xl
                          bg-surface border border-border shadow-modal flex gap-1.5">
            {TEXT_FORMAT_COLORS.map(c => {
              const isActive = c.hex
                ? activeColor === c.hex.toUpperCase()
                : !activeColor
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => {
                    onFormat('color', c.hex)
                    setShowColors(false)
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    isActive ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface scale-110' : ''
                  } ${c.hex ? '' : 'bg-text border-border'}`}
                  style={c.hex ? { backgroundColor: `#${c.hex}`, borderColor: `#${c.hex}` } : undefined}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolbarBtn({ icon: Icon, title, onClick, active = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        active ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-surface2 hover:text-text'
      }`}
    >
      <Icon size={15} strokeWidth={active ? 2.5 : 2} />
    </button>
  )
}
