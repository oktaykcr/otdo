import { useState } from 'react'
import { Download, Image, FileImage, FileCode2 } from 'lucide-react'
import Modal from '../common/Modal'
import { exportJSON, exportBlob } from '../../services/exporter'
import { buildCanvasExportSvg, canvasSvgToBlob } from '../../lib/canvasExport'

const FORMATS = [
  { value: 'png', label: 'PNG', icon: Image, desc: 'Image snapshot of the diagram' },
  { value: 'jpg', label: 'JPG', icon: FileImage, desc: 'JPEG image of the diagram' },
  { value: 'json', label: 'JSON', icon: FileCode2, desc: 'Editable .canvas.json file' },
]

export default function CanvasExportModal({ open, onClose, content, title }) {
  const [format, setFormat] = useState('png')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const safeTitle = (title || 'canvas').replace(/[\\/:*?"<>|]/g, '-')
      if (format === 'json') {
        await exportJSON(content || '{}', safeTitle)
      } else {
        const { svg } = buildCanvasExportSvg(content)
        const type = format === 'jpg' ? 'image/jpeg' : 'image/png'
        const blob = await canvasSvgToBlob(svg, { type, scale: 2 })
        await exportBlob(blob, `${safeTitle}.${format}`, type)
      }
    } finally {
      setExporting(false)
      onClose()
    }
  }

  const previewSvg = (() => {
    try {
      return buildCanvasExportSvg(content, { padding: 32 }).svg
    } catch {
      return null
    }
  })()

  return (
    <Modal open={open} onClose={onClose} title="Export Canvas" size="md">
      <div className="space-y-5">
        <div>
          <label className="label">Format</label>
          <div className="grid grid-cols-3 gap-2">
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

        {format !== 'json' && previewSvg && (
          <div>
            <label className="label">Preview</label>
            <div className="rounded-xl border border-border bg-primary overflow-hidden max-h-48 flex items-center justify-center p-2">
              <div
                className="w-full h-40 [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5"
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : `Export as ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
