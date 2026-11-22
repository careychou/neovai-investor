import type { AgentEvent, Attachment, Message } from 'neovai-kernel/cards/agent-loop'
import type { Settings } from 'neovai-kernel/cards/settings'
import type { ModelGroup } from 'neovai-kernel/cards/model-providers'
import type { SessionRow } from 'neovai-kernel/cards/session-store'
import type { Decision, PanelResult, Recommendation, RunInput, ScreenState } from 'neovai-kernel/cards/live-ui'
import type { AppSettings } from '../main/app-settings'

export type { AgentEvent, Message, Settings, AppSettings, ModelGroup, PanelResult, ScreenState, Decision, Recommendation }
export type Chat = SessionRow

export interface SkillInfo { name: string; description: string }

export interface SkillText { name: string; path: string; text: string }

/** The user's preferences (goals.json): any fields the Preferences screen sets. */
export interface Goals { earningCapPct?: number; lossLimitPct?: number; budget?: number; [key: string]: unknown }

export interface AppInfo { version: string; kernel: string; workspace: string }

export interface JobInfo { name: string; title: string; description: string }

export interface RunReport { status: string; text: string; started: string; finished: string; input?: string }

/** Everything the Main App screens need, read in one call. */
export interface MainState {
  screens: ScreenState[]
  data: Record<string, unknown>
  jobs: JobInfo[]
  running: string[]
  /** When each running job started, ms since epoch. */
  started: Record<string, number>
  reports: Record<string, RunReport | null>
  /** SKILL.md text of every skill, by name, for skill blocks. */
  skills: Record<string, string>
}

export interface SendResult { status: 'completed' | 'failed' | 'cancelled' | 'queued'; text: string }

/** What the window can ask the main process to do. */
export interface Api {
  info(): Promise<AppInfo>
  /** Asks the OS key store, which can show a system prompt, so only Settings calls it. */
  secretsEncrypted(): Promise<boolean>
  getSettings(): Promise<AppSettings>
  saveSettings(s: AppSettings): Promise<void>
  listModels(): Promise<ModelGroup[]>
  getGoals(): Promise<Goals>
  saveGoals(g: Goals): Promise<void>
  listChats(): Promise<Chat[]>
  newChat(): Promise<Chat>
  openChat(id: string): Promise<{ messages: Message[]; busy: boolean }>
  deleteChat(id: string): Promise<void>
  /** Images and files go to the model with the prompt (see the kernel chat-view Composer). */
  send(chatId: string, prompt: string, attachments?: Attachment[]): Promise<SendResult>
  stop(chatId: string): Promise<void>
  listSkills(): Promise<SkillInfo[]>
  /** The full SKILL.md of one skill, read from disk. */
  readSkill(name: string): Promise<SkillText | null>
  /** Records accepting or declining a recommendation in records/data/decisions.json; null undoes it. */
  decide(rec: Recommendation, decision: Decision | null): Promise<void>
  mainState(): Promise<MainState>
  /** Starts a job; `input` holds options picked on the screen. The result arrives through onRunEvent and mainState. */
  runJob(job: string, input?: RunInput): Promise<{ ok: boolean; error?: string }>
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

/** Libraries code panels may import besides react and @neovai/panel. The renderer supplies them. */
export const PANEL_LIBRARIES = ['recharts', 'lucide-react', 'date-fns'] as const

export const CHANNELS = [
  'info', 'secretsEncrypted', 'getSettings', 'saveSettings', 'listModels', 'getGoals', 'saveGoals',
  'listChats', 'newChat', 'openChat', 'deleteChat', 'send', 'stop', 'listSkills', 'readSkill', 'decide',
  'mainState', 'runJob', 'stopJob', 'loadPanel', 'reportPanelError'
] as const
export const EVENT_CHANNEL = 'agent-event'
export const RUN_EVENT_CHANNEL = 'run-event'
export const CHANGED_CHANNEL = 'main-changed'
