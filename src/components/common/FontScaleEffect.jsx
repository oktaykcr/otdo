import { useEffect } from 'react'
import useSettingsStore from '../../store/settingsStore'
import { applyAppFontSize } from '../../lib/fontScale'

export default function FontScaleEffect() {
  const appFontSize = useSettingsStore(s => s.appFontSize)

  useEffect(() => {
    applyAppFontSize(appFontSize)
  }, [appFontSize])

  return null
}
