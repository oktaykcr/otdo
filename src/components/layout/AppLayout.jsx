import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import XpToastStack from '../common/XpToastStack'
import useSettingsStore from '../../store/settingsStore'

export default function AppLayout() {
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <div
        className={`flex-none shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${
          sidebarOpen ? 'w-60' : 'w-0'
        }`}
      >
        <Sidebar />
      </div>
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Outlet />
      </main>
      <CommandPalette />
      <XpToastStack />
    </div>
  )
}
