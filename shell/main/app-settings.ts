import type { Settings } from 'neovai-kernel/cards/settings'

export interface AppSettings extends Settings {
  /** Model for the runtime agent that runs jobs. Empty means the same model as Codify. */
  runtimeModel: string
  /** The git repository the publish button commits and pushes to; its workspace/ folder receives the app's workspace. */
  publishRepo: string
}

export const APP_DEFAULTS: Partial<AppSettings> = { runtimeModel: '', publishRepo: '' }

/** The model the runtime agent uses: its own when set, else Codify's. */
export const runtimeModelOf = (s: Pick<AppSettings, 'defaultModel' | 'runtimeModel'>) => s.runtimeModel || s.defaultModel
