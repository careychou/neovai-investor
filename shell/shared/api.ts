import type { AgentEvent, Message } from 'neovai-kernel/cards/agent-loop'
import type { Settings } from 'neovai-kernel/cards/settings'
import type { ModelGroup } from 'neovai-kernel/cards/model-providers'
import type { SessionRow } from 'neovai-kernel/cards/session-store'
import type { PanelResult, ScreenState } from 'neovai-kernel/cards/live-ui'

export type { AgentEvent, Message, Settings, ModelGroup, PanelResult, ScreenState }
export type Chat = SessionRow

export interface SkillInfo { name: string; description: string }

export interface Goals { earningCapPct: number; lossLimitPct: number; budget: number }

export interface AppInfo { version: string; kernel: string; workspace: string }

export interface JobInfo { name: string; title: string; description: string }

export interface RunReport { status: string; text: string; started: string; finished: string }

/** Everything the Main App screens need, read in one call. */
export interface MainState {
  screens: ScreenState[]
  data: Record<string, unknown>
  jobs: JobInfo[]
  running: string[]
  reports: Record<string, RunReport | null>
}

export interface SendResult { status: 'completed' | 'failed' | 'cancelled' | 'queued'; text: string }

/** What the window can ask the main process to do. */
export interface Api {
  info(): Promise<AppInfo>
  /** Asks the OS key store, which can show a system prompt, so only Settings calls it. */
  secretsEncrypted(): Promise<boolean>
  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
  listModels(): Promise<ModelGroup[]>
  getGoals(): Promise<Goals>
  saveGoals(g: Goals): Promise<void>
  listChats(): Promise<Chat[]>
  newChat(): Promise<Chat>
  openChat(id: string): Promise<{ messages: Message[]; busy: boolean }>
  deleteChat(id: string): Promise<void>
  send(chatId: string, prompt: string): Promise<SendResult>
  stop(chatId: string): Promise<void>
  listSkills(): Promise<SkillInfo[]>
  mainState(): Promise<MainState>
  /** Starts a job; the result arrives through onRunEvent and mainState. */
  runJob(job: string): Promise<{ ok: boolean; error?: string }>
  stopJob(job: string): Promise<void>
  loadPanel(file: string): Promise<PanelResult>
  reportPanelError(file: string, message: string): Promise<void>
  /** Returns a function that stops listening. */
  onEvent(fn: (chatId: string, e: AgentEvent) => void): () => void
  /** Events of runtime-agent runs. */
  onRunEvent(fn: (job: string, e: AgentEvent) => void): () => void
  /** Something in the workspace changed: screens, data, panels or a run started or ended. */
  onMainChanged(fn: () => void): () => void
}

export const CHANNELS = [
  'info', 'secretsEncrypted', 'getSettings', 'saveSettings', 'listModels', 'getGoals', 'saveGoals',
  'listChats', 'newChat', 'openChat', 'deleteChat', 'send', 'stop', 'listSkills',
  'mainState', 'runJob', 'stopJob', 'loadPanel', 'reportPanelError'
] as const
export const EVENT_CHANNEL = 'agent-event'
export const RUN_EVENT_CHANNEL = 'run-event'
export const CHANGED_CHANNEL = 'main-changed'
