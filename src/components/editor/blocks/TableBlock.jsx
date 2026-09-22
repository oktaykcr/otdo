import { useState, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { normalizeTableRows } from '../../../lib/tableData'

export default function TableBlock({
  block, onChange, onDelete, focused, onFocus, onEnter, onArrowUp, onArrowDown,
}) {
  const [hovered, setHovered] = useState(false)
  const rows = normalizeTableRows(block.rows)
  const cellRefs = useRef({})

  const updateRows = (nextRows) => {
    onChange({ ...block, rows: normalizeTableRows(nextRows) })
  }

  const setCell = (ri, ci, value) => {
    const next = rows.map((row, r) =>
      row.map((cell, c) => (r === ri && c === ci ? value : cell))
    )
    updateRows(next)
  }

  const addRow = () => {
    const cols = rows[0]?.length || 1
    updateRows([...rows, Array(cols).fill('')])
  }

  const addColumn = () => {
    updateRows(rows.map(row => [...row, '']))
  }

  const focusCell = (ri, ci) => {
    cellRefs.current[`${ri}-${ci}`]?.focus()
  }

  const handleCellKeyDown = (e, ri, ci) => {
    const ta = e.target
    const cols = rows[0]?.length || 1
    const isLastRow = ri === rows.length - 1

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnter?.()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const delta = e.shiftKey ? -1 : 1
      const flat = ri * cols + ci + delta
      if (flat >= 0 && flat < rows.length * cols) {
        focusCell(Math.floor(flat / cols), flat % cols)
      }
      return
    }

    if (e.key === 'ArrowUp' && ta.selectionStart === 0 && ta.selectionEnd === 0 && ri === 0) {
      e.preventDefault()
      onArrowUp?.()
      return
    }

    if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length && isLastRow) {
      e.preventDefault()
      onArrowDown?.()
    }
  }

  const showToolbar = hovered || focused

  return (
    <div
      className="relative py-2 pt-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onFocus}
    >
      {showToolbar && (
        <div className="absolute -top-1 left-0 right-0 z-10 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={addRow}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-label
                         bg-surface border border-border text-text-muted
                         hover:text-text hover:bg-surface2 transition-colors"
            >
              <Plus size={12} /> Row
            </button>
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={addColumn}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-label
                         bg-surface border border-border text-text-muted
                         hover:text-text hover:bg-surface2 transition-colors"
            >
              <Plus size={12} /> Column
            </button>
          </div>
          {focused && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-label
                         text-text-faint hover:text-tag-important hover:bg-tag-important/10 transition-colors"
              title="Delete table"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      <div className={`overflow-x-auto rounded-xl border transition-colors ${
        focused ? 'border-accent/50 ring-1 ring-accent/20' : 'border-border'
      }`}>
        <table className="w-full border-collapse text-[0.875em] min-w-[200px]">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border border-border p-0 align-top ${
                      ri === 0 ? 'bg-surface2/80' : 'bg-surface/40'
                    }`}
                  >
                    <textarea
                      ref={el => { cellRefs.current[`${ri}-${ci}`] = el }}
                      value={cell}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      onKeyDown={e => handleCellKeyDown(e, ri, ci)}
                      onFocus={onFocus}
                      rows={1}
                      placeholder={ri === 0 ? 'Header' : ''}
                      className={`w-full min-w-[80px] bg-transparent px-2.5 py-2 resize-none outline-none
                        placeholder:text-text-faint/40 leading-relaxed
                        ${ri === 0 ? 'font-medium text-text' : 'text-text'}
                      `}
                      style={{ height: 'auto' }}
                      onInput={e => {
                        e.target.style.height = 'auto'
                        e.target.style.height = `${e.target.scrollHeight}px`
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
