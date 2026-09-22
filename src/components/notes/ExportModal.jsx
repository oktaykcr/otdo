import { useState } from 'react'
import { Download, FileText, Image, FileImage } from 'lucide-react'
import Modal from '../common/Modal'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'
import { exportHTML, exportPDF, exportPNG, exportJPG, exportMarkdown } from '../../services/exporter'
import { inlineMarkdownToHtml } from '../../lib/inlineFormat'

const FORMATS = [
  { value: 'html', label: 'HTML', icon: FileText, desc: 'Styled web page' },
  { value: 'pdf', label: 'PDF', icon: Download, desc: 'Print-ready document' },
  { value: 'png', label: 'PNG', icon: Image, desc: 'Image snapshot' },
  { value: 'jpg', label: 'JPG', icon: FileImage, desc: 'JPEG image' },
  { value: 'md', label: 'Markdown', icon: FileText, desc: 'Raw .md file' },
]

export default function ExportModal({ open, onClose, content, title }) {
  const [format, setFormat] = useState('html')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      if (format === 'html') {
        // Render markdown to HTML string via a temp div
        const div = document.createElement('div')
        div.id = 'export-temp'
        div.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;background:#fff;padding:40px;'
        document.body.appendChild(div)

        // Simple MD to HTML conversion via innerHTML of rendered component
        // We'll just pass the markdown content and let exportHTML create a styled page
        document.body.removeChild(div)

        // Build rendered HTML
        await exportHTML(markdownToHtmlSimple(content), title)
      } else if (format === 'pdf') {
        await exportPDF('note-preview-export', title)
      } else if (format === 'png') {
        await exportPNG('note-preview-export', title)
      } else if (format === 'jpg') {
        await exportJPG('note-preview-export', title)
      } else if (format === 'md') {
        await exportMarkdown(content, title)
      }
    } finally {
      setExporting(false)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export Note" size="md">
      <div className="space-y-5">
        {/* Format selector */}
        <div>
          <label className="label">Format</label>
          <div className="grid grid-cols-5 gap-2">
            {FORMATS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  format === f.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-surface2 text-text-muted hover:border-accent/50 hover:text-text'
                }`}
              >
                <f.icon size={20} />
                <span className="text-label font-medium">{f.label}</span>
              </button>
            ))}
          </div>
          <p className="text-body-sm text-text-faint mt-2">
            {FORMATS.find(f => f.value === format)?.desc}
          </p>
        </div>

        {/* Preview */}
        <div>
          <label className="label">Preview</label>
          <div
            id="note-preview-export"
            className="bg-white text-gray-900 rounded-xl p-6 max-h-48 overflow-y-auto text-sm"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ExportPreview content={content} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary flex-1"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ExportPreview({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {content?.slice(0, 500) || ''}
    </ReactMarkdown>
  )
}
function markdownToHtmlSimple(md) {
  const lines = md.split('\n')
  const htmlLines = lines.map(line => {
    if (/^# (.+)$/.test(line)) return `<h1>${inlineMarkdownToHtml(line.slice(2))}</h1>`
    if (/^## (.+)$/.test(line)) return `<h2>${inlineMarkdownToHtml(line.slice(3))}</h2>`
    if (/^### (.+)$/.test(line)) return `<h3>${inlineMarkdownToHtml(line.slice(4))}</h3>`
    if (/^> (.+)$/.test(line)) return `<blockquote>${inlineMarkdownToHtml(line.slice(2))}</blockquote>`
    if (/^[-*] (.+)$/.test(line)) return `<li>${inlineMarkdownToHtml(line.replace(/^[-*] /, ''))}</li>`
    if (/^\d+\. (.+)$/.test(line)) return `<li>${inlineMarkdownToHtml(line.replace(/^\d+\. /, ''))}</li>`
    return inlineMarkdownToHtml(line) || '<br>'
  })
  return `<div class="markdown-body">${htmlLines.join('<br>')}</div>`
}
