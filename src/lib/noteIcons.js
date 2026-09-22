import {
  FileText, StickyNote, BookOpen, Lightbulb, Star,
  Bookmark, Calendar, Code2, List, Pin, LayoutTemplate,
} from 'lucide-react'

export const NOTE_ICON_OPTIONS = [
  { value: 'file-text',  label: 'Note',     Icon: FileText },
  { value: 'layout',     label: 'Canvas',   Icon: LayoutTemplate },
  { value: 'sticky-note', label: 'Sticky',   Icon: StickyNote },
  { value: 'book-open',  label: 'Book',     Icon: BookOpen },
  { value: 'lightbulb',  label: 'Idea',     Icon: Lightbulb },
  { value: 'star',       label: 'Star',     Icon: Star },
  { value: 'bookmark',   label: 'Bookmark', Icon: Bookmark },
  { value: 'calendar',   label: 'Calendar', Icon: Calendar },
  { value: 'code',       label: 'Code',     Icon: Code2 },
  { value: 'list',       label: 'List',     Icon: List },
  { value: 'pin',        label: 'Pin',      Icon: Pin },
]

export function getNoteIcon(iconValue) {
  return NOTE_ICON_OPTIONS.find(i => i.value === iconValue)?.Icon || FileText
}
