# Neovai Investor and the Neovai kernel: design

Date: 2026-11-22
Status: approved

## 1. Purpose

Neovai (neo-evolution-ai) is a pattern for desktop apps that improve themselves.
Each app carries a small agent harness, the kernel, next to its own logic and UI.
The agent reads the app's track record and the user's feedback, then changes the
app's instructions, logic code and UI screens, so the user does not have to go
back to a coding agent to rebuild the app.

Neovai Investor is the first app. Each morning it recommends stocks to buy and,
for picks the user holds, whether to hold or sell, against the user's goals
(earning cap, loss limit, budget). It records what it recommended, what the user
did, and what the price did afterwards, and uses that record to correct itself.

The app gives recommendations only. It never places trades and never logs in to
a brokerage. It shows a standing note that recommendations are not financial
advice and that the user makes all decisions.

## 2. Repositories

Two private GitHub repos under `careychou`.

### 2.1 `careychou/neovai-kernel`

The card inventory. Tagged releases; apps pin a tag.

```
cards/<card>/index.ts    public interface, the only import point
cards/<card>/card.json   name, description, cards it depends on
cards/<card>/*.test.ts   unit tests
compose.ts               an app lists cards; compose checks dependencies and wires them
tests/regression/        regression suite, run by hand before each tag
```

Cards import other cards only through `index.ts`. Code is ported from the
an earlier desktop agent engine where it exists. No employer or personal
content goes into either repo.

### 2.2 `careychou/neovai-investor`

```
shell/        fixed Electron + React + TypeScript shell. The agent cannot edit it.
workspace/    the only folder the agent edits
  instructions/   prompts and investing rules (markdown)
  logic/          TypeScript: screen candidates, fetch prices, score, recommend, exit review
  ui/             React screens: Today, Ledger, Performance
  tests/          tests for logic
  goals.json      earning cap, loss limit, budget. Edited only by the user in Settings.
```

The app runs against a local clone of this repo. The ledger database lives
outside the clone, in the app's data folder, and is never pushed.

## 3. Card inventory

All 27 cards are built in the kernel. An app chooses which to compose.

| # | Card | What it does | Investor v1 |
|---|------|--------------|-------------|
| 1 | agent-loop | Model/tool loop with step and spend caps | yes |
| 2 | model-providers | Custom model config | yes |
| 3 | file-tools | Read, write, edit; rejects paths outside the workspace | yes |
| 4 | shell | Runs commands with the workspace as working folder | yes |
| 5 | web-fetch | Read-only HTTP fetch | yes |
| 6 | approval | Asks the user before an action | yes |
| 7 | session-store | Saves every agent run (SQLite) | yes |
| 8 | settings | Settings and limits | yes |
| 9 | snapshots | Commit per applied change; rollback | yes |
| 10 | build-runner | Builds the workspace and hot-reloads it | yes |
| 11 | simulate | Replays past days for two workspace versions and compares them | yes |
| 12 | ledger | Recommendations, user actions, outcomes, saved prices | yes |
| 13 | feedback | Captures user comments and rejected-proposal reasons | yes |
| 14 | scheduler | Daily job at a set time | yes |
| 15 | change-proposal | Finding, summary, diff, simulation table, Apply/Reject | yes |
| 16 | goals | Typed access to the user's goals | yes |
| 17 | git-sync | Pushes applied changes to a remote branch | yes |
| 18 | sub-agents | Child agents | no |
| 19 | compaction | Context compaction | no |
| 20 | skills-loader | Loads skills and agents from the project and home folders | no |
| 21 | mcp | MCP servers with OAuth | no |
| 22 | memory | Long-term notes across runs | no |
| 23 | notifications | macOS notifications | no |
| 24 | attachments | Image and document attachments | no |
| 25 | chat-view | Shared chat timeline (kernel v0.3.0): messages, a collapsible thoughts block, tool calls grouped and collapsed, as data plus React and CSS. Used by Codify and the run log | yes |
| 26 | runtime-agent | Runs workspace jobs (`jobs/<name>.md`) for the Main App; every skill is appended in full, in order, to its instruction and re-read each run; writes only under `records/`; `save_data` feeds the screens | yes |
| 27 | live-ui | Main App screens described in `ui/screens/*.json` with built-in blocks; `panel` blocks compile workspace `.tsx` files at runtime and keep the last good build; `check_ui` tool for Codify. Since v0.4.0: `decide` on recommendation blocks (Accept/Decline saved to `records/data/decisions.json`, read-only to agents) and live run status (elapsed time, current step, activity). Since v0.5.0: a screen lists the `skills` it is built on, a `skill` block shows a skill's text, and every screen has a Codify bar (change the screen, or open one of its skills) | yes |

## 4. The daily loop

Runs every morning at the time set in Settings, and whenever the user clicks
"Run now". The scheduler runs only while the app is open; if the app was closed
at the scheduled time, the job runs on next launch.

1. **Score.** For each open recommendation, fetch the latest price and update
   its outcome: hit target, hit stop-loss, or still open, with gain/loss %.
2. **Exit review.** For each pick the user accepted and still holds, give Hold
   or Sell with a reason (target reached, stop-loss hit, outlook changed). The
   user clicks Sold, entering the price, or Keep.
3. **Recommend.** `workspace/logic` screens candidates and fetches prices and
   news. The model writes each pick using `workspace/instructions` and
   `goals.json`. A pick has: ticker, entry price, target, stop-loss, suggested
   amount, and a plain-English reason.
4. **Act.** The Today screen lists the picks. The user clicks Accept or Skip on
   each, with an optional comment.

Prices come from a free public source through one adapter in `workspace/logic`,
so the agent can replace the source if it breaks. If a price cannot be fetched,
the pick is marked "no data" for that day. Prices are never guessed.

If the model or network fails, the job is marked failed with the reason and a
Retry button. Partial results are not shown as complete.

## 5. Ledger

Local SQLite, outside the workspace. Rollback never erases it, and the agent's
code cannot write to it except through the ledger card's interface.

- `recommendations`: every buy pick and exit call, with the workspace commit that produced it
- `actions`: Accept, Skip, Keep, Sold (with price), and comments
- `outcomes`: daily price track and final result per pick
- `prices`: every price fetched, by ticker and date, so simulations replay real past data

Two results are reported separately:

- **All picks**: how good the app's judgement is.
- **Accepted picks**: what the user acted on, measured against the earning cap and loss limit.

## 6. The evolve loop

Runs after the morning job, and whenever the user types feedback or clicks
"Improve".

1. **Review.** The agent reads the ledger: losing picks, skipped picks and the
   reasons, early or late Sell calls, comments, and results against `goals.json`.
2. **Diagnose.** It writes a short plain-English finding.
3. **Change.** It edits a scratch copy of `workspace/` (a git worktree), using
   the file-tools and shell cards.
4. **Check.** The scratch copy must build and pass `workspace/tests`.
5. **Simulate.** The current and the changed version are both replayed over past
   days from saved prices and compared on gain/loss, how often the loss limit
   was broken, and hit rate.
6. **Propose.** The user sees the finding, a summary of the change, the diff and
   the comparison table, then clicks Apply or Reject. The running app does not
   change before Apply.
7. **Apply.** Commit, hot-reload, push to the `evolved` branch.

Rules:

- If build, tests or simulation fail, the agent has 3 attempts to fix it, then
  stops and reports what failed.
- A change that simulates worse is still shown, labelled as worse.
- Rejected proposals and the user's reason are saved and given to the agent on
  later runs, so it does not repeat them.
- The proposal states how many days and picks the simulation covered.

Known limits of the simulation:

- It shows how a change would have done on past days. It does not prove the
  change will do better in future. With a few weeks of history the comparison
  is weak.
- The model's written judgement can differ between runs, so small differences
  are noise. The table marks a difference as meaningful only above a threshold,
  set in Settings.

## 7. Versions, rollback and sync

- Every applied change is one commit in the local clone.
- Rollback is a new commit that restores an earlier version. History is not rewritten.
- git-sync pushes to the `evolved` branch. `main` changes only when the user merges.
- If a push fails, the change still applies locally and the push is retried on
  the next apply or launch.
- A second machine gets the evolved code by pulling, but not the ledger. History
  starts empty there.

## 8. Safety

- file-tools rejects any path outside `workspace/`.
- The agent cannot edit the shell, the kernel, the ledger, or `goals.json`.
- **Shell commands are auto-approved.** They run with `workspace/` as the
  working folder and do not ask the user. This is not a sandbox: a command can
  still read or write outside the workspace, use the network, or run git. The
  step and spend caps, the saved run log, and rollback of the workspace are the
  only controls. Rollback does not undo effects outside the workspace.
- Web access is read-only fetching.
- Per-run caps on steps and model spend are set in Settings. A run that hits a
  cap stops and says so.
- If a workspace change crashes the app at start, the shell rolls back to the
  last commit that started cleanly and tells the user.
- Every agent run is saved and can be opened to see what it did and why.

## 9. Testing

- Unit tests for each kernel card.
- Kernel regression suite, run by hand before each tag. Not in CI.
- Investor: tests for scoring and ledger maths, and a replay test using a fixed
  set of saved prices with a fake model, so results are repeatable.
- One end-to-end test: a fake model proposes a change; it builds, simulates, is
  applied, then rolled back.

## 10. Build order

Three implementation plans, each producing working software.

1. **Kernel core and shell.** Cards 1 to 8, `compose.ts`, both repos created,
   the Investor shell running a trivial workspace with a chat panel.
2. **Evolve and Investor.** Cards 9 to 17, the Investor logic and UI, the daily
   loop and the evolve loop.
3. **Ported cards.** Cards 18 to 24, each with tests, unused by Investor.

## 11. Out of scope

- Placing trades or connecting a brokerage.
- Running the morning job while the app is closed.
- Syncing the ledger between machines.
- Agent edits to the shell or the kernel.
- CI.
