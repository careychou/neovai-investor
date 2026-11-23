import type { Settings } from 'neovai-kernel/cards/settings'

export interface AppSettings extends Settings {
  /** Model for the runtime agent that runs jobs. Empty means the same model as Codify. */
  runtimeModel: string
  /** Where the publish button sends the workspace: a remote repository address (downloaded to a temporary folder each
   * time, no local copy kept) or a local repository folder. Its workspace/ folder receives the app's workspace. */
  publishRepo: string
}

export const APP_DEFAULTS: Partial<AppSettings> = { runtimeModel: '', publishRepo: 'git@github.com:careychou/neovai-investor.git' }

/** The model the runtime agent uses: its own when set, else Codify's. */
export const runtimeModelOf = (s: Pick<AppSettings, 'defaultModel' | 'runtimeModel'>) => s.runtimeModel || s.defaultModel
