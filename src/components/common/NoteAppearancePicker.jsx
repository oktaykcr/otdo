import { TAG_CONFIG, TAG_OPTIONS } from './ColorTag'
import { NOTE_ICON_OPTIONS, getNoteIcon } from '../../lib/noteIcons'

const DEFAULT_COLOR = '#E2E8F0'

const COLOR_OPTIONS = [
  { value: null, label: 'Default', color: DEFAULT_COLOR },
  ...TAG_OPTIONS.map(t => ({ value: t.value, label: t.label, color: t.color })),
]

function ColorSwatches({ tag, onChange, Icon }) {
  const PreviewIcon = Icon || getNoteIcon(null)

  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_OPTIONS.map(opt => {
        const selected = tag === opt.value
        return (
          <button
            key={opt.value ?? 'default'}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              selected
                ? 'border-accent bg-accent/10 ring-1 ring-accent/50'
                : 'border-border bg-surface2 hover:border-text-faint hover:bg-surface'
            }`}
          >
            <PreviewIcon size={16} style={{ color: opt.color }} />
          </button>
        )
      })}
    </div>
  )
}

export function NoteAppearancePicker({ icon, tag, onIconChange, onTagChange }) {
  const activeColor = tag ? TAG_CONFIG[tag]?.color : DEFAULT_COLOR
  const currentIcon = icon || 'file-text'

  return (
    <div className="space-y-4">
      <div>
        <span className="label block mb-2">Icon</span>
        <div className="grid grid-cols-5 gap-1.5">
          {NOTE_ICON_OPTIONS.map(opt => {
            const selected = currentIcon === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onIconChange(opt.value)}
                title={opt.label}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
                  selected
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/50'
                    : 'border-border bg-surface2 hover:border-text-faint hover:bg-surface'
                }`}
              >
                <opt.Icon size={18} style={{ color: activeColor }} />
                <span className={`text-[10px] leading-none ${
                  selected ? 'text-accent font-medium' : 'text-text-faint'
                }`}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="label block mb-2">Color</span>
        <ColorSwatches
          tag={tag}
          onChange={onTagChange}
          Icon={getNoteIcon(currentIcon)}
        />
      </div>
    </div>
  )
}

export function TagColorPicker({ tag, onChange, Icon }) {
  return (
    <div>
      <span className="label block mb-2">Color</span>
      <ColorSwatches tag={tag} onChange={onChange} Icon={Icon} />
    </div>
  )
}
