const iconSrc = `${import.meta.env.BASE_URL}icon.png`

export default function AppLogo({ size = 24, className = '' }) {
  return (
    <img
      src={iconSrc}
      alt="OTDO"
      width={size}
      height={size}
      className={`rounded-md object-cover flex-none ${className}`}
      draggable={false}
    />
  )
}
