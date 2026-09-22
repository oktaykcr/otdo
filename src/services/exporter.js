import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

function isTextMime(mimeType) {
  return !!mimeType && (
    mimeType.startsWith('text/')
    || mimeType === 'application/json'
    || mimeType === 'application/javascript'
  )
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function fileExtension(name) {
  const match = String(name || '').match(/\.([^.]+)$/)
  return match?.[1] || 'bin'
}

async function saveFile(name, blob, mimeType) {
  if (isElectron && window.api?.dialog?.saveFile && window.api?.fs?.writeFile) {
    const ext = fileExtension(name)
    const filePath = await window.api.dialog.saveFile({
      defaultPath: name,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!filePath) return

    if (isTextMime(mimeType)) {
      await window.api.fs.writeFile(filePath, await blob.text())
    } else {
      await window.api.fs.writeFile(filePath, await blobToBase64(blob), { encoding: 'base64' })
    }
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportHTML(content, title = 'note') {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 4rem auto; padding: 0 2rem; color: #1e293b; line-height: 1.7; }
    h1,h2,h3 { margin-top: 2rem; color: #0f172a; }
    code { background: #f1f5f9; padding: .2em .4em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: .875em; }
    pre { background: #0f172a; color: #f1f5f9; padding: 1.5rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; color: #64748b; margin: 1.5rem 0; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
    a { color: #6366f1; }
    img { max-width: 100%; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e2e8f0; padding: .5rem 1rem; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  await saveFile(`${title}.html`, blob, 'text/html')
}

export async function exportPDF(elementId, title = 'note') {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  })

  const imgData = canvas.toDataURL('image/jpeg', 1.0)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width / 2, canvas.height / 2],
  })
  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2)

  const blob = pdf.output('blob')
  await saveFile(`${title}.pdf`, blob, 'application/pdf')
}

export async function exportPNG(elementId, title = 'note') {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#0f172a',
    useCORS: true,
  })

  canvas.toBlob(async (blob) => {
    await saveFile(`${title}.png`, blob, 'image/png')
  }, 'image/png')
}

export async function exportJPG(elementId, title = 'note') {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#0f172a',
    useCORS: true,
  })

  canvas.toBlob(async (blob) => {
    await saveFile(`${title}.jpg`, blob, 'image/jpeg')
  }, 'image/jpeg', 0.95)
}

export async function exportMarkdown(content, title = 'note') {
  const blob = new Blob([content], { type: 'text/markdown' })
  await saveFile(`${title}.md`, blob, 'text/markdown')
}

export async function exportJSON(content, title = 'note') {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  await saveFile(`${title}.canvas.json`, blob, 'application/json')
}

export async function exportBlob(blob, filename, mimeType) {
  await saveFile(filename, blob, mimeType)
}
