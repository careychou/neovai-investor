import type { Settings } from 'neovai-kernel/cards/settings'

export interface AppSettings extends Settings {
  /** Model for the runtime agent that runs jobs. Empty means the same model as Codify. */
  runtimeModel: string
}

export const APP_DEFAULTS: Partial<AppSettings> = { runtimeModel: '' }

/** The model the runtime agent uses: its own when set, else Codify's. */
export const runtimeModelOf = (s: Pick<AppSettings, 'defaultModel' | 'runtimeModel'>) => s.runtimeModel || s.defaultModel
