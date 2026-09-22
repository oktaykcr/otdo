const TAG_CONFIG = {
  important: { label: 'Important', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  warning:   { label: 'Warning',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  info:      { label: 'Info',      color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  temp:      { label: 'Temp',      color: '#64748B', bg: 'rgba(100,116,139,0.15)' },
}

export const TAG_OPTIONS = Object.entries(TAG_CONFIG).map(([value, cfg]) => ({
  value,
  ...cfg,
}))

export default function ColorTag({ tag, size = 'sm' }) {
  if (!tag) return null
  const cfg = TAG_CONFIG[tag]
  if (!cfg) return null

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding}`}
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}

export { TAG_CONFIG }
