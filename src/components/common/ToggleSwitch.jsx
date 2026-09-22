export default function ToggleSwitch({ checked, onChange, className = '', size = 'md' }) {
  const sizes = {
    md: {
      track: 'h-5 w-9',
      knob: 'h-4 w-4 top-0.5 translate-x-0.5',
      on: 'translate-x-[18px]',
    },
    sm: {
      track: 'h-4 w-8',
      knob: 'h-3 w-3 top-0.5 translate-x-0.5',
      on: 'translate-x-[14px]',
    },
  }

  const s = sizes[size] || sizes.md

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex flex-none shrink-0 rounded-full transition-colors overflow-hidden ${
        checked ? 'bg-accent' : 'bg-surface2 border border-border'
      } ${s.track} ${className}`}
    >
      <span
        className={`pointer-events-none absolute left-0 rounded-full bg-white shadow transition-transform ${s.knob} ${
          checked ? s.on : ''
        }`}
      />
    </button>
  )
}
