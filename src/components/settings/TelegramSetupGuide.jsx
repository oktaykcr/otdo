import { Info, ExternalLink } from 'lucide-react'
import Modal from '../common/Modal'

const LINKS = {
  botFather: 'https://t.me/BotFather',
  userInfoBot: 'https://t.me/userinfobot',
}

function openUrl(url) {
  if (window.api?.shell?.openExternal) {
    window.api.shell.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

function GuideLink({ href, children }) {
  return (
    <button
      type="button"
      onClick={() => openUrl(href)}
      className="text-accent hover:underline inline-flex items-center gap-1"
    >
      {children}
      <ExternalLink size={12} className="inline opacity-70" />
    </button>
  )
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="flex-none w-7 h-7 rounded-full bg-accent/15 text-accent text-label font-semibold
                         flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="flex-1 min-w-0 space-y-2 pb-6 border-b border-border last:border-0 last:pb-0">
        <h3 className="text-body-md font-semibold text-text">{title}</h3>
        <div className="text-body-sm text-text-muted space-y-2 leading-relaxed">{children}</div>
      </div>
    </li>
  )
}

function GuideBody() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface2/50 p-4 space-y-2">
        <h3 className="text-body-sm font-semibold text-text">What is Telegram used for in OTDO?</h3>
        <p className="text-body-sm text-text-muted leading-relaxed">
          Telegram is <strong className="text-text">not</strong> for notes or Google Drive sync.
          It is only for <strong className="text-text">todos</strong>:
        </p>
        <ul className="list-disc pl-5 text-body-sm text-text-muted space-y-1">
          <li>
            <strong className="text-text">Reminder notifications</strong> — when a todo reminder fires,
            OTDO can send a message to your Telegram chat (in addition to a desktop notification)
          </li>
          <li>
            <strong className="text-text">Bot commands</strong> — while the app is open, message your bot
            with <code className="text-xs bg-primary px-1 rounded">/list</code>,{' '}
            <code className="text-xs bg-primary px-1 rounded">/today</code>,{' '}
            <code className="text-xs bg-primary px-1 rounded">/search</code>, or{' '}
            <code className="text-xs bg-primary px-1 rounded">/help</code> to query todos from your phone
          </li>
        </ul>
        <p className="text-body-sm text-text-muted">
          You use <strong className="text-text">your own</strong> bot from{' '}
          <GuideLink href={LINKS.botFather}>@BotFather</GuideLink>
          {' '}— credentials stay on your machine, not shared with other OTDO users.
        </p>
      </div>

      <ol className="space-y-0 list-none p-0 m-0">
        <Step n="1" title="Create a bot and get the Bot Token">
          <p>
            Open{' '}
            <GuideLink href={LINKS.botFather}>@BotFather</GuideLink>
            {' '}in Telegram (mobile or desktop).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Send <code className="text-xs bg-primary px-1 rounded">/newbot</code></li>
            <li>Choose a display name (e.g. <em>OTDO Reminders</em>)</li>
            <li>Choose a username ending in <code className="text-xs bg-primary px-1 rounded">bot</code>{' '}
              (e.g. <em>my_otdo_bot</em>)</li>
            <li>BotFather replies with a <strong>Bot Token</strong> like{' '}
              <code className="text-xs bg-primary px-1 rounded">123456789:AAH…</code></li>
            <li>Copy it into OTDO Settings → Telegram → <strong>Bot Token</strong></li>
          </ul>
          <p className="text-label text-tag-warning bg-tag-warning/10 border border-tag-warning/20 rounded-lg px-3 py-2">
            Treat the token like a password — anyone with it can control your bot.
          </p>
        </Step>

        <Step n="2" title="Get your Chat ID">
          <p>
            <strong className="text-text">Chat ID</strong> is the numeric ID of the chat where the bot
            should send messages. For personal use, this is usually <strong>your Telegram user ID</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Open{' '}
              <GuideLink href={LINKS.userInfoBot}>@userinfobot</GuideLink>
              {' '}in Telegram
            </li>
            <li>Send <code className="text-xs bg-primary px-1 rounded">/start</code> (or any message)</li>
            <li>The bot replies with your info — copy the <strong>Id</strong> number
              (e.g. <code className="text-xs bg-primary px-1 rounded">987654321</code>)</li>
            <li>Paste it into OTDO Settings → Telegram → <strong>Chat ID</strong></li>
          </ul>
          <p className="text-label text-text-faint">
            You do <strong>not</strong> get Chat ID by messaging your own OTDO bot.
            @userinfobot tells you <em>your</em> user ID directly.
          </p>
          <p className="text-label text-text-faint">
            If you see a <strong>negative</strong> number (e.g.{' '}
            <code className="text-xs bg-primary px-1 rounded">-1001234567890</code>), that is a{' '}
            <strong>group</strong> ID. For most setups, use your positive personal user ID instead.
          </p>
        </Step>

        <Step n="3" title="Start a chat with your bot (required)">
          <p>
            Telegram only allows a bot to message you after you have talked to it first.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Open your new bot in Telegram (link from BotFather, or search its @username)</li>
            <li>Tap <strong>Start</strong> or send <code className="text-xs bg-primary px-1 rounded">/start</code></li>
          </ul>
          <p className="text-label text-tag-warning bg-tag-warning/10 border border-tag-warning/20 rounded-lg px-3 py-2">
            Skip this step and “Send Test Message” may fail with{' '}
            <strong>bot can&apos;t initiate conversation</strong> or <strong>403 Forbidden</strong>.
          </p>
        </Step>

        <Step n="4" title="Connect and test in OTDO">
          <ul className="list-disc pl-5 space-y-1">
            <li>Paste <strong>Bot Token</strong> and <strong>Chat ID</strong> in Settings → Telegram</li>
            <li>Click <strong>Send Test Message</strong></li>
            <li>You should receive <em>“✅ OTDO connected! Your reminders will be sent here.”</em> in Telegram</li>
            <li>Status shows <strong>Connected</strong> when the test succeeds</li>
          </ul>
        </Step>

        <Step n="5" title="Enable Telegram on todo reminders">
          <ul className="list-disc pl-5 space-y-1">
            <li>Open a todo in the Tasks page or create one from the editor slash menu</li>
            <li>Set a reminder (hourly, daily, weekly, or monthly)</li>
            <li>Toggle <strong>TG</strong> on the reminder — messages go to the Chat ID above</li>
            <li>OTDO must be running for reminders to fire (same as desktop notifications)</li>
          </ul>
        </Step>

        <Step n="6" title="Use bot commands (app must be open)">
          <p>Message your bot in Telegram:</p>
          <ul className="list-disc pl-5 space-y-1 font-mono text-body-sm">
            <li><span className="text-accent">/list</span> — pending todos</li>
            <li><span className="text-accent">/today</span> — todos due today</li>
            <li><span className="text-accent">/search</span> &lt;query&gt; — search todos</li>
            <li><span className="text-accent">/help</span> — command list</li>
          </ul>
          <p className="text-label text-text-faint">
            Polling runs every ~5 seconds while OTDO is open. Commands do not work when the app is quit.
            Only todos still linked in your notes appear in /list (orphaned entries are hidden).
          </p>
        </Step>
      </ol>

      <div className="rounded-xl border border-border bg-surface2/50 p-4 space-y-3">
        <h3 className="text-body-sm font-semibold text-text">FAQ</h3>
        <dl className="text-body-sm text-text-muted space-y-3">
          <div>
            <dt className="font-medium text-text">What is Telegram used for?</dt>
            <dd>
              Todo reminder messages and optional bot commands — not notes, not Drive sync.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text">How do I get Chat ID?</dt>
            <dd>
              Message <GuideLink href={LINKS.userInfoBot}>@userinfobot</GuideLink>, send /start,
              copy the <strong>Id</strong> number. Then send /start to your own bot once.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text">What is the difference between Bot Token and Chat ID?</dt>
            <dd>
              <strong>Bot Token</strong> identifies your bot (from @BotFather).
              <strong> Chat ID</strong> is where messages are delivered (usually your user ID).
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text">Test message fails / 403 / bot blocked</dt>
            <dd>
              Open your bot in Telegram and press Start first. Check token and Chat ID for typos
              (Chat ID is digits only, no spaces).
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text">Reminders not arriving on Telegram</dt>
            <dd>
              Confirm Connected status, TG toggle is on for that todo, and OTDO is running.
              Desktop notification may still appear even if Telegram fails.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text">/list shows todos I did not create</dt>
            <dd>
              /list only includes todos still referenced in a note (todo blocks).
              Old orphaned todos from deleted blocks are excluded. Save your notes after adding todos.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text">/list does not respond</dt>
            <dd>
              OTDO must be open on your computer. Commands are handled locally via polling, not on a server.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default function TelegramSetupGuideModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Telegram setup guide" size="lg">
      <GuideBody />
    </Modal>
  )
}

export function TelegramSetupGuideButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label
                 text-text-faint hover:text-accent hover:bg-accent/10 transition-colors"
      title="Telegram setup guide"
    >
      <Info size={14} />
      Setup guide
    </button>
  )
}
