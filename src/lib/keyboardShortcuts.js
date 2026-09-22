import { isMac } from './platform'

export function shortcutLabel({ mac, win }) {
  return isMac ? mac : win
}

export const EMPTY_TAB_SHORTCUTS = [
  { description: 'Search notes or create', mac: '⌘⇧P', win: 'Ctrl+Shift+P' },
  { description: 'Find in note', mac: '⌘F', win: 'Ctrl+F' },
  { description: 'Save', mac: '⌘S', win: 'Ctrl+S' },
  { description: 'Undo', mac: '⌘Z', win: 'Ctrl+Z' },
  { description: 'Redo', mac: '⌘⇧Z', win: 'Ctrl+Shift+Z' },
]

export const HELP_SHORTCUTS = [
  { description: 'Command palette', mac: '⌘⇧P', win: 'Ctrl+Shift+P' },
  { description: 'Find in note', mac: '⌘F', win: 'Ctrl+F' },
  { description: 'Save note', mac: '⌘S', win: 'Ctrl+S' },
  { description: 'Undo', mac: '⌘Z', win: 'Ctrl+Z' },
  { description: 'Redo', mac: '⌘⇧Z', win: 'Ctrl+Shift+Z' },
  { description: 'Bold', mac: '⌘B', win: 'Ctrl+B' },
  { description: 'Italic', mac: '⌘I', win: 'Ctrl+I' },
  { description: 'Strikethrough', mac: '⌘⇧X', win: 'Ctrl+Shift+X' },
  { description: 'Inline code', mac: '⌘⇧E', win: 'Ctrl+Shift+E' },
  { description: 'Insert / edit link', mac: '⌘K', win: 'Ctrl+K' },
]

export const HELP_COMMAND_PALETTE = [
  {
    example: 'remind 15:00 call mom',
    description: 'One-time reminder today (or tomorrow if the time has passed)',
  },
  {
    example: 'remind next monday standup',
    description: 'One-time reminder next Monday at 09:00',
  },
  {
    example: 'remind tomorrow 9am dentist',
    description: 'One-time reminder tomorrow at a specific time',
  },
  {
    example: 'remind every day 08:00 meds',
    description: 'Daily recurring reminder',
  },
  {
    example: 'remind every monday 10:00 sync',
    description: 'Weekly recurring reminder',
  },
  {
    example: 'remind in 30 minutes stretch',
    description: 'Reminder relative to now',
  },
  {
    example: 'hatırlat 15:00 ara',
    description: 'Turkish alias for remind',
  },
]

export const HELP_EDITOR_TIPS = [
  {
    trigger: '/',
    description: 'Open the slash menu for headings, lists, todos, tables, and date inserts',
  },
  {
    trigger: '- + space',
    description: 'Markdown shortcuts: - or * (bullet), 1. (numbered), # ## ### (headings), > (quote), --- (divider), ``` (code), [] (todo)',
  },
  {
    trigger: '@',
    description: 'Mention and link another note',
  },
  {
    trigger: 'Esc',
    description: 'Close overlays (settings, graph, notifications, menus)',
  },
]

export const HELP_TELEGRAM_COMMANDS = [
  { command: '/list', description: 'List pending todos' },
  { command: '/today', description: 'Todos due today' },
  { command: '/search <query>', description: 'Search todos' },
  { command: '/help', description: 'Show bot help' },
]
