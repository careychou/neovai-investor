import type { AgentEvent, Message } from 'neovai-kernel/cards/agent-loop'
import type { Settings } from 'neovai-kernel/cards/settings'
import type { ModelGroup } from 'neovai-kernel/cards/model-providers'
import type { SessionRow } from 'neovai-kernel/cards/session-store'

export type { AgentEvent, Message, Settings, ModelGroup }
export type Chat = SessionRow

export interface Goals { earningCapPct: number; lossLimitPct: number; budget: number }

export interface AppInfo { version: string; kernel: string; workspace: string; secretsEncrypted: boolean }

export interface SendResult { status: 'completed' | 'failed' | 'cancelled' | 'queued'; text: string }

/** What the window can ask the main process to do. */
export interface Api {
  info(): Promise<AppInfo>
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
  /** Returns a function that stops listening. */
  onEvent(fn: (chatId: string, e: AgentEvent) => void): () => void
}

export const CHANNELS = [
  'info', 'getSettings', 'saveSettings', 'listModels', 'getGoals', 'saveGoals',
  'listChats', 'newChat', 'openChat', 'deleteChat', 'send', 'stop'
] as const
export const EVENT_CHANNEL = 'agent-event'
