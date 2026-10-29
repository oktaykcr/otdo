import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const report = (m) => window.api?.log?.error(m)
window.addEventListener('error', (e) => report(e.error?.stack || e.message))
window.addEventListener('unhandledrejection', (e) => report(e.reason?.stack || String(e.reason)))
const origError = console.error
console.error = (...args) => {
  origError(...args)
  report(args.map(a => a?.stack || String(a)).join(' '))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
