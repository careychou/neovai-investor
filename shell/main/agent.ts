import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { compose } from 'neovai-kernel/compose'
import { PLAIN_LANGUAGE_RULES, Session, type AgentEvent, type Attachment, type Hooks, type Message, type ModelAdapter, type Reasoning, type SendResult, type ToolDef } from 'neovai-kernel/cards/agent-loop'
import { makeFileTools } from 'neovai-kernel/cards/file-tools'
import { shellTools, ShellManager } from 'neovai-kernel/cards/shell'
import { webFetch } from 'neovai-kernel/cards/web-fetch'
import { PermissionGate } from 'neovai-kernel/cards/approval'
import { Store, type SessionRow } from 'neovai-kernel/cards/session-store'
import { loadSkillSources, makeSkillTool, skillsPrompt, type Skill, type SkillSource } from 'neovai-kernel/cards/skills'
import { loadJobs } from 'neovai-kernel/cards/runtime-agent'
import { SubAgents } from 'neovai-kernel/cards/sub-agents'
import { BLOCK_TYPES, makeCheckUiTool, type LiveUi } from 'neovai-kernel/cards/live-ui'

/** The kernel cards this app is built from. `compose` fails at start if one is missing. */
export const CARDS = ['agent-loop', 'model-providers', 'file-tools', 'shell', 'web-fetch', 'approval', 'session-store', 'settings', 'skills', 'chat-view', 'runtime-agent', 'live-ui', 'sub-agents', 'git-publish']

/** Files in the workspace the agent may read but never change. */
export const READ_ONLY = ['goals.json', 'records/data/decisions.json', 'records/data/holdings.json']

export interface AgentSettings {
  defaultModel: string
  maxTurnsMain: number
  maxOutputTokens: number
  reasoning: string
  maxConcurrency: number
}

export interface AgentOptions {
  /** Where chats and usage are saved. Outside the workspace. */
  dataDir: string
  /** The only folder the agent may edit. */
  workspace: string
  adapter: ModelAdapter
  /** Read before every run, so a change in Settings applies to the next prompt. */
  settings: () => AgentSettings
  onEvent: (chatId: string, e: AgentEvent) => void
  /** The live screens, so the agent can check its UI edits. */
  ui?: LiveUi
  /** Shared skill folders the agent may use but not change, after the workspace's own. */
  sharedSkills?: () => SkillSource[]
}

export interface Agent {
  store: Store
  listChats(): SessionRow[]
  newChat(): SessionRow
  /** Saved messages of a chat, without the system prompt. */
  openChat(id: string): Message[]
  deleteChat(id: string): void
  renameChat(id: string, title: string): void
  send(chatId: string, prompt: string, attachments?: Attachment[]): Promise<SendResult>
  stop(chatId: string): void
  isBusy(chatId: string): boolean
  /** Adds finished turns (such as a publish run's steps) to a chat and saves it. */
  append(chatId: string, messages: Message[]): void
  systemPrompt(): string
  /** Every skill: the workspace's (editable) then the shared ones (read-only), read from disk on every call. */
  skills(): Skill[]
  /** The workspace skills folder, then the shared folders. */
  skillSources(): SkillSource[]
  dispose(): void
}

const BASE_PROMPT = `You are Codify, the coding agent inside Neovai Investor, a desktop app that recommends stocks to its user. The user tells you how the app should look and behave, and you change the app's workspace so it does. Every change applies at once, without a new version.

# How the app works
- The Main App runs jobs with a separate runtime agent. Each run reads instructions/system.md, every skill in skills/ (in order) and the job file, fresh from disk. That agent may write only inside records/.
- Jobs: jobs/<name>.md, with title: and description: lines between two --- lines, then the prompt. A job saves what screens show with save_data(name, data), which writes records/data/<name>.json.
- Skills: skills/<name>/SKILL.md, with description: and order: lines between two --- lines. They say how to do the work.
- Screens: ui/screens/<name>.json. Each is a tab in the Main App: {"title", "order", "skills": ["<skill>"], "blocks": [...]}. Blocks: ${BLOCK_TYPES.join(', ')}.
  - Each screen is built on the skills listed in "skills" and runs its own job: Today = market-scan (job scan, data market), Candidates = candidate-evaluation (job evaluate, data candidates), Recommendations = recommendation (job recommend, data picks with buys, sells and changes; job daily runs the whole loop), Performance = performance-review (job review, data review), Preferences = user-preference (job preferences, data preferences). When the user asks to change a screen, decide whether it is the look (edit the screen or its panel), the data shown (edit the job's save_data shape and the screen), or the reasoning (edit the skill). Keep "skills" accurate when you add or change a screen.
  - A request starting "On the <title> screen (ui/screens/<name>.json)" came from that screen's "Change this screen" button.
  - heading {text}; markdown {text | data}; metrics {title?, data | items: [{label, value, change?, note?}]}; table {title?, data | rows, columns?}; list {title?, data | items}; alerts {title?, data | items: [{level: info|warn|bad|good, text}]}; recommendations {title?, data | items: [{ticker, action, reason, confidence, entry, target, stop}], decide?: true adds Accept and Decline buttons}; run {job, label?}; report {job, title?}; panel {file}; skill {name, title?} shows a skill's text; chart {title?, data | rows, kind?: line|area|bar|candlestick, x?, y?: field or [fields], volume?, height?} draws a price chart (candlestick rows need open, high, low, close; volume adds a volume pane; x defaults to date); row {blocks}.
  - data is a path into records/data: "today.picks" reads records/data/today.json, key picks.
- Decisions: the user accepts or declines calls on screens; the app saves them in records/data/decisions.json as {items: [{id, date, ticker, action, decision: accepted|declined, at, ...}]}. It is read-only for both agents. Show it with data "decisions.items".
  - run {job, label?, input?}: input is text or an object of options sent to the runtime agent with the run, for example {"mode": "reuse-scan"}. The job file must say what each option means.
- Holdings added by hand: records/data/holdings.json holds {items: [{id, ticker, shares, avgCost, buyDate?, name?, kind?, note?, addedAt, updatedAt}]}, stocks and funds the user bought outside the app's calls. Only the app writes it, from the Performance screen; it is read-only for both agents. They count as positions (marked "Added by you") but are extra money, so they never change cash. Show it with data "holdings.items".
- Preferences: goals.json holds the user's preferences (budget, profit and loss limits, position sizes, trading rules…). It is any JSON object; earningCapPct, lossLimitPct and budget are always there and other fields are yours to design. Only the user changes it, on the Preferences screen (first tab), through a panel that calls savePrefs. There is no goals form in Settings. Both agents read it every run; jobs and skills must follow it.
- Panels: when no block fits, write a React component in a .tsx file in ui/ and add a panel block. Panels are full interactive UI, not just display. A panel gets props data (all saved data) and goals (the preferences), and may import:
  - react, and relative files in the workspace.
  - @neovai/panel, the app API:
    - useApp() returns { data, get(path), props, prefs, savePrefs?(prefs), run(job, input?), stop(job), isRunning(job), step(job), started(job), lastRun(job) -> {text, finished, status} | null, decide?(rec, 'accepted' | 'declined' | null), decisionOf(rec), codify?(text) }. prefs is goals.json; savePrefs(whole object) saves it (keep fields you do not edit: savePrefs({...prefs, budget: 5000})) and every screen and agent sees it at once. run starts a job with options, exactly like a run block; the panel's own buttons, selects and radios can drive it. decide records Accept or Decline the same way recommendation blocks do; decisionOf(rec) returns the recorded choice.
    - usePanelState(key, initial) is useState that survives reloads and restarts. Use it for a picked option, tab or filter.
    - <Blocks blocks={[...]} /> draws any built-in blocks inside the panel (tables, metrics, recommendations with Accept and Decline, run buttons with live progress, reports, charts). <RunButton job input? label? /> is a run block. <Markdown text /> draws markdown. show(value), direction(change), resolveData(data, path) and recKey(rec) are helpers.
    - <Chart kind="candlestick" | "line" | "area" | "bar" rows={[...]} x? y? volume? height? /> is a trading-style SVG chart: green and red candles, volume pane, last-price tag, hover crosshair with O H L C. Use it for symbol charts; recharts is for other charts.
    - Live data: useFetch(url, refreshSecs?) returns { data, error, loading, reload } with parsed JSON and refreshes on a timer; useApp().fetchJson(url) and fetchText(url) fetch once (GET, http/https, through the app). Daily or intraday prices for a symbol: https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?range=<1d|5d|1mo|6mo|1y|5y>&interval=<5m|15m|1h|1d|1wk>; the answer is chart.result[0] with timestamp[] (seconds) and indicators.quote[0].open/high/low/close/volume[] (may hold nulls), and meta.regularMarketPrice and meta.chartPreviousClose. Show a short message when a fetch fails; never invent numbers.
  - recharts (any chart), lucide-react (icons), date-fns (dates) and react-dom (portals, for example a modal or tooltip over the page).
  - Styling: inline styles, or a plain .css file next to the panel imported with import './MyPanel.css' (scope its classes with a unique prefix). Use the app's classes (button, button.primary, .lu-* block classes) and variables var(--text), var(--muted), var(--line), var(--panel), var(--accent), var(--ok), var(--bad).
  - Split big panels into several .tsx files and shared helpers (for example ui/lib/*.ts, logic/*.ts) imported by relative path.
  - Nothing else: no other packages.
  - Panels cannot write files other than preferences through savePrefs, and holdings through the saveHoldings(items) prop (the whole list; it returns the cleaned list and throws a plain message on a bad item). Jobs change data.

# How to work
- Act with your tools instead of describing what you would do. Call independent tools in parallel.
- For big work with independent parts (research several stocks, or build a panel while you edit a skill), hand each part to a helper with the task tool, several in one reply so they run at the same time. Give each a complete prompt; they do not see this chat. Use mode "background" for long research you do not need right away; you are told when it ends.
- The user may attach screenshots, mockups or files to a request. Treat an attached image as the reference for how a screen should look, and say which parts you matched.
- You may read and change files only inside the workspace folder. goals.json is read-only for you: only the user changes it, on the Preferences screen.
- Shell commands run in the workspace folder without asking the user. Give each one a short description. Use an async shell for long jobs.
- After you change a screen or panel, call check_ui and fix every problem it reports. A broken file never blanks the app; it keeps showing the last version that worked, so check.
- To improve the skills, read decisions.json, records/data/review.json and the record files. Find patterns in what the user accepts, declines, and what worked, backed by at least three calls. Propose each change with its evidence, and edit a skill only after the user agrees.
- For a change in behavior, edit the skill or job that covers it. For a change in what is shown, edit the screen, and add to the job's save_data shape if new data is needed. Then say what the user will see.
- Say one short plain sentence before a batch of tool calls.
- Never print secrets such as API keys.
- You cannot place trades or log in to a brokerage. Nothing you say is financial advice.`

function readText(file: string): string {
  try { return fs.readFileSync(file, 'utf8').trim() } catch { return '' }
}

export function createAgent(o: AgentOptions): Agent {
  compose(CARDS)
  const store = new Store(o.dataDir)
  const shells = new ShellManager()
  const skillsDir = path.join(o.workspace, 'skills')
  const skillSources = (): SkillSource[] => [{ dir: skillsDir, label: 'Workspace', editable: true }, ...(o.sharedSkills?.() ?? [])]
  const tools: ToolDef[] = [...makeFileTools({ root: o.workspace, readOnly: READ_ONLY }), ...shellTools, webFetch, makeSkillTool({ sources: skillSources })]
  if (o.ui) tools.push(makeCheckUiTool(o.ui))
  const sessions = new Map<string, Session>()

  const systemPrompt = () => [
    BASE_PROMPT,
    PLAIN_LANGUAGE_RULES,
    `# Instructions\n${readText(path.join(o.workspace, 'instructions', 'system.md')) || '(none yet)'}`,
    `# Skills (workspace skills/ first; shared ones are read-only, outside the workspace)\n${skillsPrompt(loadSkillSources(skillSources()))}`,
    `# Jobs\n${loadJobs(path.join(o.workspace, 'jobs')).map((j) => `- ${j.name}: ${j.description}`).join('\n') || '(none yet)'}`,
    `# Preferences (goals.json, read-only)\n${readText(path.join(o.workspace, 'goals.json')) || '(not set)'}`,
    `# Environment\n- Workspace: ${o.workspace}\n- Platform: ${os.platform()} ${os.arch()}\n- Date: ${new Date().toISOString().slice(0, 10)}`
  ].join('\n\n')

  function sessionFor(chatId: string): Session {
    const have = sessions.get(chatId)
    if (have) return have
    const row = store.getSession(chatId)
    if (!row) throw new Error(`unknown chat "${chatId}"`)
    const s = o.settings()
    const hooks: Hooks = {
      onEvent: (e) => {
        if (e.kind === 'usage') {
          store.addUsage({
            ts: Date.now(), session_id: chatId, agent_id: e.agentId, model: e.model ?? o.settings().defaultModel,
            prompt: e.prompt, cached: e.cached ?? 0, cache_write: e.cacheWrite ?? 0, completion: e.completion
          })
        }
        o.onEvent(chatId, e)
        // A background helper can wake the chat after send() returned; save that turn too.
        if (e.kind === 'agent_end' && e.agentId === 'main') { store.saveMessages(chatId, session.history); store.touchSession(chatId) }
      },
      requestPermission: async () => 'allow',
      askUser: async () => ''
    }
    const gate = new PermissionGate(hooks, true)
    const subs = new SubAgents({
      adapter: o.adapter, hooks, gate, cwd: o.workspace, tools, services: { shells },
      model: () => o.settings().defaultModel, maxTurns: () => o.settings().maxTurnsMain,
      maxOutputTokens: () => o.settings().maxOutputTokens, reasoning: () => o.settings().reasoning as Reasoning,
      system: () => `${BASE_PROMPT}\n\n${PLAIN_LANGUAGE_RULES}\n\n# Environment\n- Workspace: ${o.workspace}\n- Date: ${new Date().toISOString().slice(0, 10)}`
    })
    const session: Session = new Session({
      adapter: o.adapter, hooks, gate,
      model: row.model || s.defaultModel, cwd: o.workspace,
      system: systemPrompt, tools: () => [...tools, ...subs.tools()], services: { shells },
      maxConcurrency: s.maxConcurrency, maxTurns: s.maxTurnsMain, maxOutputTokens: s.maxOutputTokens,
      reasoning: s.reasoning as Reasoning, history: store.loadMessages(chatId)
    })
    subs.attach(session)
    sessions.set(chatId, session)
    return session
  }

  return {
    store,
    systemPrompt,
    skills: () => loadSkillSources(skillSources()),
    skillSources,
    listChats: () => store.listSessions(),
    newChat() {
      const now = Date.now()
      const row: SessionRow = { id: randomUUID(), title: 'New chat', cwd: o.workspace, model: '', created_at: now, updated_at: now }
      store.createSession(row)
      return row
    },
    openChat: (id) => sessions.get(id)?.history ?? store.loadMessages(id),
    deleteChat(id) {
      sessions.get(id)?.stop()
      sessions.delete(id)
      store.deleteSession(id)
    },
    renameChat(id, title) {
      const t = title.replace(/\s+/g, ' ').trim().slice(0, 120)
      if (t && store.getSession(id)) store.updateSession(id, { title: t })
    },
    async send(chatId, prompt, attachments = []) {
      const session = sessionFor(chatId)
      const s = o.settings()
      session.setModel(s.defaultModel)
      session.setReasoning(s.reasoning as Reasoning)
      if (store.getSession(chatId)?.title === 'New chat') {
        store.updateSession(chatId, { title: prompt.replace(/\s+/g, ' ').trim().slice(0, 60) || (attachments.length ? `Attached: ${attachments.map((a) => a.name).join(', ')}`.slice(0, 60) : 'New chat'), model: s.defaultModel })
      }
      const result = await session.send(prompt, attachments)
      if (result.status !== 'queued' && store.getSession(chatId)) {
        store.saveMessages(chatId, session.history)
        store.touchSession(chatId)
      }
      return result
    },
    stop: (chatId) => sessions.get(chatId)?.stop(),
    isBusy: (chatId) => sessions.get(chatId)?.isBusy ?? false,
    append(chatId, messages) {
      if (!store.getSession(chatId)) return
      const session = sessions.get(chatId)
      if (session) session.messages.push(...messages)
      if (store.getSession(chatId)?.title === 'New chat') store.updateSession(chatId, { title: 'Publish changes' })
      store.saveMessages(chatId, session ? session.history : [...store.loadMessages(chatId), ...messages])
      store.touchSession(chatId)
    },
    dispose() {
      for (const s of sessions.values()) s.stop()
      sessions.clear()
      shells.dispose()
      store.close()
    }
  }
}
