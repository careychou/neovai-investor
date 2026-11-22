# Neovai Investor

A desktop app that recommends stocks and improves itself over time. It carries a
small agent harness (the [Neovai kernel](https://github.com/careychou/neovai-kernel))
next to its own logic and screens, so the agent can change the app's
skills, logic and UI from your feedback.

Not financial advice. The app never places trades or logs in to a brokerage.

## Status

Version 0.9.0. New in 0.9.0: panels can draw trading-style charts (`chart` block or `<Chart>`: candlesticks, line, area, bars, volume, last-price tag, hover O/H/L/C), fetch live data through the main process (`useFetch`, `fetchJson`), import plain `.css` files and split into many files; Market Scan ships a live symbol chart (`ui/SymbolChart.tsx`) that Codify built. The app has two halves:

- **Main App**: one tab per skill, each with its own job: Preferences
  (user-preference, first tab: the user's budget, limits and trading rules, saved to
  `goals.json`; Settings no longer has a Goals form), Market Scan (market-scan),
  Candidates (candidate-evaluation), Recommendations (recommendation: new stocks,
  sells and changes, with Refresh) and Performance (performance-review: outcomes and
  open positions). Each tab has "Change this
  screen" and a button per skill it is built on, which open Codify on it.
  A tab is a screen in `workspace/ui/screens/*.json`. A screen is a
  list of built-in blocks (metrics, tables, alerts, recommendations, run buttons,
  reports, markdown) that read data from `workspace/records/data/`. When no block
  fits, a `panel` block shows a React `.tsx` file from `workspace/ui/`, compiled
  while the app runs. A broken file keeps showing its last working version.
  Panels are interactive: from `@neovai/panel` they can start jobs with options
  (`run(job, {mode: ...})`), stop them and follow their progress, Accept or Decline
  calls, read and save the user's preferences (`prefs`, `savePrefs`), keep their
  own choices across restarts (`usePanelState`), draw any
  built-in block inside themselves, and open Codify. They may also import
  `recharts`, `lucide-react` and `date-fns`. A `run` block can carry options too
  (`"input": {...}`); the runtime agent gets them with the run.
- **Run buttons** start jobs (`workspace/jobs/*.md`) on a runtime agent. Each run
  reads the instructions, every skill in order and the job, fresh from disk, so an
  edit applies to the next run without a rebuild. That agent may write only in
  `workspace/records/`. While it runs, the button shows the elapsed time and the
  step it is on, with its thoughts and tool calls below. It uses the Codify model
  unless Settings picks a separate runtime model.
- **Recommendations**: Accept or Decline each call. Choices are saved in
  `workspace/records/data/decisions.json`, which only the app writes. The review
  job scores accepted against declined calls, and the next daily run reads them.
- **Codify**: the coding agent. Tell it how the app should look or behave; it edits
  screens, panels, jobs, skills and logic, checks its UI edits with `check_ui`, and
  the change shows at once. Click a skill to read it in full. "Improve skills from
  my picks" asks Codify to study your decisions and the review results and propose
  skill changes, which it makes only after you agree. Attach screenshots, mockups
  or text files to a request with the ＋ button, by pasting, or by dropping them on
  the input (the kernel chat-view `Composer`); images show as thumbnails in the chat.

See `docs/design.md`.

## Start a new app from this template

1. Copy this repo (and keep `neovai-kernel` next to it, checked out at the tag in `kernel.json`).
2. Rename it: `name`, `description`, `build.appId`, `build.productName` and `artifactName` in
   `package.json`; the window title in `shell/main/index.ts`, `shell/renderer/index.html` and the
   brand in `shell/renderer/src/App.tsx`; the app description at the top of Codify's `BASE_PROMPT`
   in `shell/main/agent.ts`.
3. Choose kernel cards: edit the imports in `shell/main` and the `CARDS` list; drop the ones the
   app does not need.
4. Replace `workspace/`: your own `instructions/system.md`, `skills/<name>/SKILL.md`, `jobs/*.md`,
   `ui/screens/*.json` (one screen per skill) and panels, and `goals.json` (the preferences shape).
5. `npm install`, `npm run dev`, then let Codify grow the screens and skills from inside the app.

## Layout

- `shell/` — the fixed Electron and React shell. The agent cannot edit it.
- `workspace/` — the only folder the agent edits: `instructions/`, `skills/`,
  `jobs/`, `records/`, `logic/`, `ui/` (screens and panels), `tests/`. `goals.json` holds the user's preferences: read-only to the agents, changed on the Preferences screen.
- `kernel.json` — the kernel tag this app is built against.

## Run

Needs Node 22.5 or later, and the kernel checked out next to this repo at the
tag in `kernel.json`.

```sh
git clone https://github.com/careychou/neovai-kernel ../neovai-kernel
git -C ../neovai-kernel checkout v0.9.0
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
not replace that copy. An update adds files and folders the app has never
shipped before, and replaces a shipped file only when it still matches what was
shipped (hashes in `.seeded.json`). Nothing you or Codify changed or deleted is
overwritten or brought back. Screens, panels, jobs and skills in that
copy apply live.

## Check

```sh
npm run typecheck
npm test
npm run check:kernel
```
