import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { compose } from 'neovai-kernel/compose'
import { Session, type AgentEvent, type Hooks, type Message, type ModelAdapter, type Reasoning, type SendResult, type ToolDef } from 'neovai-kernel/cards/agent-loop'
import { makeFileTools } from 'neovai-kernel/cards/file-tools'
import { shellTools, ShellManager } from 'neovai-kernel/cards/shell'
import { webFetch } from 'neovai-kernel/cards/web-fetch'
import { PermissionGate } from 'neovai-kernel/cards/approval'
import { Store, type SessionRow } from 'neovai-kernel/cards/session-store'
import { loadSkills, makeSkillTool, skillsPrompt, type Skill } from 'neovai-kernel/cards/skills'
import { loadJobs } from 'neovai-kernel/cards/runtime-agent'
import { BLOCK_TYPES, makeCheckUiTool, type LiveUi } from 'neovai-kernel/cards/live-ui'

/** The kernel cards this app is built from. `compose` fails at start if one is missing. */
export const CARDS = ['agent-loop', 'model-providers', 'file-tools', 'shell', 'web-fetch', 'approval', 'session-store', 'settings', 'skills', 'chat-view', 'runtime-agent', 'live-ui']

/** Files in the workspace the agent may read but never change. */
export const READ_ONLY = ['goals.json', 'records/data/decisions.json']

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
}

export interface Agent {
  store: Store
  listChats(): SessionRow[]
  newChat(): SessionRow
  /** Saved messages of a chat, without the system prompt. */
  openChat(id: string): Message[]
  deleteChat(id: string): void
  send(chatId: string, prompt: string): Promise<SendResult>
  stop(chatId: string): void
  isBusy(chatId: string): boolean
  systemPrompt(): string
  /** The workspace skills, read from disk on every call. */
  skills(): Skill[]
  dispose(): void
}

const BASE_PROMPT = `You are Codify, the coding agent inside Neovai Investor, a desktop app that recommends stocks to its user. The user tells you how the app should look and behave, and you change the app's workspace so it does. Every change applies at once, without a new version.

# How the app works
- The Main App runs jobs with a separate runtime agent. Each run reads instructions/system.md, every skill in skills/ (in order) and the job file, fresh from disk. That agent may write only inside records/.
- Jobs: jobs/<name>.md, with title: and description: lines between two --- lines, then the prompt. A job saves what screens show with save_data(name, data), which writes records/data/<name>.json.
- Skills: skills/<name>/SKILL.md, with description: and order: lines between two --- lines. They say how to do the work.
- Screens: ui/screens/<name>.json. Each is a tab in the Main App: {"title", "order", "blocks": [...]}. Blocks: ${BLOCK_TYPES.join(', ')}.
  - heading {text}; markdown {text | data}; metrics {title?, data | items: [{label, value, change?, note?}]}; table {title?, data | rows, columns?}; list {title?, data | items}; alerts {title?, data | items: [{level: info|warn|bad|good, text}]}; recommendations {title?, data | items: [{ticker, action, reason, confidence, entry, target, stop}], decide?: true adds Accept and Decline buttons}; run {job, label?}; report {job, title?}; panel {file}; row {blocks}.
  - data is a path into records/data: "today.picks" reads records/data/today.json, key picks.
- Decisions: the user accepts or declines calls on screens; the app saves them in records/data/decisions.json as {items: [{id, date, ticker, action, decision: accepted|declined, at, ...}]}. It is read-only for both agents. Show it with data "decisions.items".
- Panels: when no block fits, write a React component in a .tsx file in ui/ and add a panel block. It gets props data (all saved data) and goals. It may import react and relative files in the workspace, nothing else. Style it with the app's classes or inline styles.

# How to work
- Act with your tools instead of describing what you would do. Call independent tools in parallel.
- You may read and change files only inside the workspace folder. goals.json is read-only: only the user changes it, in Settings.
- Shell commands run in the workspace folder without asking the user. Give each one a short description. Use an async shell for long jobs.
- After you change a screen or panel, call check_ui and fix every problem it reports. A broken file never blanks the app; it keeps showing the last version that worked, so check.
- To improve the skills, read decisions.json, records/data/review.json and the record files. Find patterns in what the user accepts, declines, and what worked, backed by at least three calls. Propose each change with its evidence, and edit a skill only after the user agrees.
- For a change in behavior, edit the skill or job that covers it. For a change in what is shown, edit the screen, and add to the job's save_data shape if new data is needed. Then say which files changed and what the user will see.
- Say one short sentence before a batch of tool calls.
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
  const tools: ToolDef[] = [...makeFileTools({ root: o.workspace, readOnly: READ_ONLY }), ...shellTools, webFetch, makeSkillTool({ dir: skillsDir })]
  if (o.ui) tools.push(makeCheckUiTool(o.ui))
  const sessions = new Map<string, Session>()

  const systemPrompt = () => [
    BASE_PROMPT,
    `# Instructions\n${readText(path.join(o.workspace, 'instructions', 'system.md')) || '(none yet)'}`,
    `# Skills\n${skillsPrompt(loadSkills(skillsDir))}`,
    `# Jobs\n${loadJobs(path.join(o.workspace, 'jobs')).map((j) => `- ${j.name}: ${j.description}`).join('\n') || '(none yet)'}`,
    `# Goals (read-only)\n${readText(path.join(o.workspace, 'goals.json')) || '(not set)'}`,
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
      },
      requestPermission: async () => 'allow',
      askUser: async () => ''
    }
    const session = new Session({
      adapter: o.adapter, hooks, gate: new PermissionGate(hooks, true),
      model: row.model || s.defaultModel, cwd: o.workspace,
      system: systemPrompt, tools, services: { shells },
      maxConcurrency: s.maxConcurrency, maxTurns: s.maxTurnsMain, maxOutputTokens: s.maxOutputTokens,
      reasoning: s.reasoning as Reasoning, history: store.loadMessages(chatId)
    })
    sessions.set(chatId, session)
    return session
  }

  return {
    store,
    systemPrompt,
    skills: () => loadSkills(skillsDir),
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
    async send(chatId, prompt) {
      const session = sessionFor(chatId)
      const s = o.settings()
      session.setModel(s.defaultModel)
      session.setReasoning(s.reasoning as Reasoning)
      if (store.getSession(chatId)?.title === 'New chat') {
        store.updateSession(chatId, { title: prompt.replace(/\s+/g, ' ').trim().slice(0, 60) || 'New chat', model: s.defaultModel })
      }
      const result = await session.send(prompt)
      if (result.status !== 'queued' && store.getSession(chatId)) {
        store.saveMessages(chatId, session.history)
        store.touchSession(chatId)
      }
      return result
    },
    stop: (chatId) => sessions.get(chatId)?.stop(),
    isBusy: (chatId) => sessions.get(chatId)?.isBusy ?? false,
    dispose() {
      for (const s of sessions.values()) s.stop()
      sessions.clear()
      shells.dispose()
      store.close()
    }
  }
}
