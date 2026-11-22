# Neovai Investor

A desktop app that recommends stocks and improves itself over time. It carries a
small agent harness (the [Neovai kernel](https://github.com/careychou/neovai-kernel))
next to its own logic and screens, so the agent can change the app's
instructions, logic and UI from your feedback.

Not financial advice. The app never places trades or logs in to a brokerage.

## Status

Part 1 of 3: the app shell, Settings, and a chat with the agent. The daily
recommendation run, the ledger and the self-improvement loop come in part 2.
See `docs/design.md`.

## Layout

- `shell/` — the fixed Electron and React shell. The agent cannot edit it.
- `workspace/` — the only folder the agent edits: `instructions/`, `logic/`,
  `ui/`, `tests/`. `goals.json` is read-only to the agent; change it in Settings.
- `kernel.json` — the kernel tag this app is built against.

## Run

Needs Node 22.5 or later, and the kernel checked out next to this repo at the
tag in `kernel.json`.

```sh
git clone https://github.com/careychou/neovai-kernel ../neovai-kernel
git -C ../neovai-kernel checkout v0.1.0
npm install
npm run build && npx electron .
```

Then open Settings, add a model provider (any OpenAI-compatible endpoint, Azure
or Vertex), pick a default model and save.

## Install as a Mac app

```sh
npm run dist
```

This writes `dist/mac-arm64/Neovai Investor.app` and a `.dmg` next to it. Copy
the app to `/Applications`. It is signed ad hoc and not notarized, so it is
meant for the machine that built it.

The installed app works on its own copy of `workspace/`, made on first launch
at `~/Library/Application Support/Neovai Investor/workspace`. Reinstalling does
not replace that copy. The Today screen is compiled into the app, so changes
under `workspace/ui` do not show in the installed app yet.

## Check

```sh
npm run typecheck
npm test
npm run check:kernel
```
