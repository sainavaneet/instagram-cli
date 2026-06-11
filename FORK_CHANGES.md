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

## Tests

- `tests/message-list-layout.test.tsx` — single-line layout + `me` label + `HH:MM`.
- `tests/chat-commands.test.ts` — `:ghost` toggle persists to config.

Run with `npm test` (prettier + xo + ava).
