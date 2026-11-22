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

/** The kernel cards this app is built from. `compose` fails at start if one is missing. */
export const CARDS = ['agent-loop', 'model-providers', 'file-tools', 'shell', 'web-fetch', 'approval', 'session-store', 'settings', 'skills']

/** Files in the workspace the agent may read but never change. */
export const READ_ONLY = ['goals.json']

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

const BASE_PROMPT = `You are the agent inside Neovai Investor, a desktop app that recommends stocks to its user and improves itself over time.

# How to work
- Act with your tools instead of describing what you would do. Call independent tools in parallel.
- You may read and change files only inside the workspace folder. goals.json is read-only: only the user changes it, in Settings.
- Shell commands run in the workspace folder without asking the user. Give each one a short description. Use an async shell for long jobs.
- How to do each job is written in skills: skills/<name>/SKILL.md in the workspace. The Skills section below lists them. Load a skill with the skill tool before you do the work it covers. A full daily run uses the skills in the listed order.
- When the user asks for the app to behave differently, edit the SKILL.md that covers it, then say which file and which rule changed. For a new kind of job, add a folder with a SKILL.md that starts with a description: line and an order: line between two --- lines. Changes apply from the next message.
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
  const sessions = new Map<string, Session>()

  const systemPrompt = () => [
    BASE_PROMPT,
    `# Instructions\n${readText(path.join(o.workspace, 'instructions', 'system.md')) || '(none yet)'}`,
    `# Skills\n${skillsPrompt(loadSkills(skillsDir))}`,
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
