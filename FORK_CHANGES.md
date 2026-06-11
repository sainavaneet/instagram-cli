# Fork customizations

This fork of [`supreme-gg-gg/instagram-cli`](https://github.com/supreme-gg-gg/instagram-cli)
adds two things on top of upstream. Both are gated by config so they merge
cleanly with future `git pull upstream main`.

## 1. Single-line chat layout

Text messages render on one line as `name: message            HH:MM`
(outgoing messages are labeled `me`). Media, shares, links, and replies keep
the original multi-line rendering.

- Controlled by `chat.layout`:
  - `oneline` (this fork's default) — the single-line view.
  - `compact` — the original two-line view (name + time, then body).
- Switch back anytime: `instagram-cli config chat.layout compact`
- Code: `source/ui/components/message-list.tsx`

## 2. Read-receipt toggle (silent read)

Reading a conversation can send a "Seen" receipt — or not. This is now a
runtime toggle, off by default (so it behaves like the normal app and marks
seen when you open a chat).

- Toggle live inside the chat with the `:ghost` command.
  - `🚫 Silent mode ON` — reading does NOT send "Seen".
  - `👁 Silent mode OFF` — opening a chat marks messages seen (default).
- The status bar shows the current mode (`👁 Seen-on` / `🚫 Silent`).
- Persisted to `privacy.invisibleMode` in config; also settable via
  `instagram-cli config privacy.invisibleMode true`.
- Code: guarded seen-calls in `source/ui/views/chat-view.tsx`
  (`markThreadAsSeen` on open, `markItemAsSeen` on incoming), the `:ghost`
  command in `source/utils/chat-commands.ts`, and the indicator in
  `source/ui/components/status-bar.tsx`.

## 3. Import an existing session (avoid a second login)

Instagram soft-blocks doing a _fresh_ password login from a new client when
another app recently logged in from the same IP. `scripts/import-igdm-session.mjs`
sidesteps that by reusing the `sessionid` from an existing
[instagrapi](https://github.com/subzeroid/instagrapi) session — it builds this
tool's `instagram-private-api` session file offline (no Instagram request) so
`loginBySession()` just resumes it.

```bash
node scripts/import-igdm-session.mjs <username> [path-to-igdm-session.json]
node dist/cli.js config login.currentUsername <username>
node dist/cli.js chat   # resumes the imported session, no login
```

Reads work immediately via the Bearer token. The first authenticated request
lets Instagram issue any remaining cookies.

## 4. Highlight new / unread messages

- Unread threads now stand out in the thread list: a bright `●` marker, a
  `NEW` badge, a bold bright-white title, and a non-dimmed message preview
  (`source/ui/components/thread-item.tsx`).
- When a new DM arrives in real time, the terminal bell rings and a banner
  shows `📨 New message from @username` (`source/ui/views/chat-view.tsx`).

## 5. Open shared reels/posts in the browser

Shared reels/clips/posts (Instagram `xma_*` attachments) used to render as
`[Unsupported Type: xma_clip]`. They now show as a row like
`🎬 Reel by @author ↗` with two ways to open the real content in your browser:

- **cmd/ctrl-click** the highlighted link (OSC 8 hyperlink; works in iTerm2,
  Kitty, WezTerm, etc.).
- **keyboard**: `:select`, pick the message with `j`/`k`, press **`o`** — or run
  **`:open`**. Both launch the URL via the `open` package.

Code: `xma` parsing in `source/utils/message-parser.ts`, the `xma` message type
in `source/types/instagram.ts`, rendering in `source/ui/components/message-list.tsx`,
URL helpers in `source/utils/links.ts`, the `:open` command in
`source/utils/chat-commands.ts`, and the `o` key in `source/ui/views/chat-view.tsx`.

## 6. Delivery ticks + custom names

- **WhatsApp-style ticks** next to the time on outgoing messages: `✓` sent,
  `✓✓` delivered, `✓✓` **green** once the recipient has seen the chat (driven
  by the realtime `threadSeen` signal). Incoming messages show no ticks.
  (`deliveryStatus` on messages, `recipientHasSeen` prop on `MessageList`.)
- **Custom names (aliases)** per person, stored in config (`aliases` map keyed
  by username) and shown in the thread list, the chat title, and message
  sender labels. Set one while in a chat with **`:nick <name>`** (empty name
  clears it). Code in `source/utils/aliases.ts`, wired into `thread-item.tsx`,
  `message-list.tsx`, `status-bar.tsx`, and the `:nick` command in
  `chat-commands.ts`.

## Tests

- `tests/message-list-layout.test.tsx` — single-line layout, `me` label, `HH:MM`, xma row, delivery ticks.
- `tests/chat-commands.test.ts` — `:ghost` toggle and `:nick` alias persist to config.
- `tests/message-parser.test.ts` — `xma_clip` parses into an openable `xma` message.
- `tests/links.test.ts` — OSC 8 hyperlink + `getOpenableUrl`.
- `tests/thread-item.test.tsx` — unread `NEW` badge.

Run with `npm test` (prettier + xo + ava).
