import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { ChatRequest, ModelAdapter } from 'neovai-kernel/cards/agent-loop'
import { setToolLimits } from 'neovai-kernel/cards/agent-loop'
import { ProviderRouter } from 'neovai-kernel/cards/model-providers'
import { createSettings, type SecretBox } from 'neovai-kernel/cards/settings'
import { webFetch } from 'neovai-kernel/cards/web-fetch'
import { createRuntime, type Runtime } from 'neovai-kernel/cards/runtime-agent'
import { createLiveUi, type LiveUi, type Screen } from 'neovai-kernel/cards/live-ui'
import { createAgent, type Agent } from './agent'
import { loadGoals, saveGoals } from './goals'
import { seedWorkspace } from './seed'
import { APP_DEFAULTS, runtimeModelOf, type AppSettings } from './app-settings'
import { CHANGED_CHANNEL, CHANNELS, EVENT_CHANNEL, RUN_EVENT_CHANNEL, type Api, type AppInfo, type MainState } from '../shared/api'

app.setName('Neovai Investor')

let win: BrowserWindow | null = null
let agent: Agent
let settings: AppSettings
let router: ProviderRouter
let runtime: Runtime
let ui: LiveUi

/** Shown until the workspace has its own screens. */
const FALLBACK: Record<string, Screen> = {
  today: { title: 'Today', order: 1, blocks: [{ type: 'heading', text: 'Today' }, { type: 'markdown', text: 'This workspace has no screens yet. Ask Codify to add one in ui/screens.' }] }
}

function repoRoot(): string {
  return app.isPackaged ? process.resourcesPath : app.getAppPath()
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 820, minHeight: 560,
    title: 'Neovai Investor',
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 14, y: 16 },
    backgroundColor: '#ffffff',
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win?.webContents.getURL()) e.preventDefault()
  })
  win.on('closed', () => { win = null })
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  const dataDir = app.getPath('userData')
  // The installed app is read-only, so it works on a copy in the data folder.
  const bundled = path.join(repoRoot(), 'workspace')
  const own = path.join(dataDir, 'workspace')
  // An update adds new top-level folders (such as skills) without touching what is already there.
  if (app.isPackaged && !process.env.NEOVAI_WORKSPACE) seedWorkspace(bundled, own)
  const workspace = path.resolve(process.env.NEOVAI_WORKSPACE || (app.isPackaged ? own : bundled))
  if (!fs.existsSync(workspace)) {
    dialog.showErrorBox('Neovai Investor', `Workspace folder not found: ${workspace}`)
    app.quit()
    return
  }

  const box: SecretBox = {
    available: () => safeStorage.isEncryptionAvailable(),
    seal: (v) => safeStorage.encryptString(v).toString('base64'),
    open: (v) => safeStorage.decryptString(Buffer.from(v, 'base64'))
  }
  const store = createSettings<AppSettings>({ dir: dataDir, box, defaults: APP_DEFAULTS })
  const apply = (s: AppSettings) => {
    settings = s
    router = new ProviderRouter(s.providers.filter((p) => p.enabled !== false))
    setToolLimits(s)
  }
  apply(store.load())

  // The router is rebuilt when Settings are saved, so the agent always calls through the current one
  const adapter: ModelAdapter = { stream: (req: ChatRequest, signal: AbortSignal) => router.stream(req, signal) }
  const changed = () => win?.webContents.send(CHANGED_CHANNEL)
  ui = createLiveUi({ workspace, fallback: FALLBACK, onChange: changed })
  ui.watch()
  runtime = createRuntime({
    workspace, adapter,
    settings: () => ({
      model: runtimeModelOf(settings), reasoning: settings.reasoning as never, maxTurns: settings.maxTurnsMain,
      maxOutputTokens: settings.maxOutputTokens, maxConcurrency: settings.maxConcurrency
    }),
    // Accept and decline are the user's; the agent reads them to learn but never rewrites them.
    readOnly: ['goals.json', 'records/data/decisions.json'],
    tools: [webFetch],
    onEvent: (_runId, job, e) => win?.webContents.send(RUN_EVENT_CHANNEL, job, e)
  })
  agent = createAgent({
    dataDir, workspace, adapter, ui,
    settings: () => settings,
    onEvent: (chatId, e) => win?.webContents.send(EVENT_CHANNEL, chatId, e)
  })

  const readSkillFile = (name: string) => { try { return fs.readFileSync(path.join(workspace, 'skills', name, 'SKILL.md'), 'utf8') } catch { return '' } }
  const started: Record<string, number> = {}
  const mainState = (): MainState => {
    const jobs = runtime.jobs()
    const reports: MainState['reports'] = {}
    for (const j of jobs) {
      const r = runtime.lastRun(j.name)
      reports[j.name] = r && { status: r.status, text: r.text, started: r.started, finished: r.finished }
    }
    return {
      screens: ui.screens(), data: ui.data(), running: runtime.running(), reports,
      started: Object.fromEntries(runtime.running().map((j) => [j, started[j] ?? Date.now()])),
      jobs: jobs.map((j) => ({ name: j.name, title: j.title, description: j.description })),
      skills: Object.fromEntries(agent.skills().map((s) => [s.name, readSkillFile(s.name)]))
    }
  }

  let kernel = ''
  try { kernel = JSON.parse(fs.readFileSync(path.join(repoRoot(), 'kernel.json'), 'utf8')).tag } catch { /* shown as unknown */ }

  const handlers: Omit<Api, 'onEvent' | 'onRunEvent' | 'onMainChanged'> = {
    info: async (): Promise<AppInfo> => ({ version: app.getVersion(), kernel: kernel || 'unknown', workspace }),
    secretsEncrypted: async () => box.available(),
    getSettings: async () => settings,
    saveSettings: async (s) => { store.save(s); apply(store.load()) },
    listModels: () => router.listGroups(),
    getGoals: async () => loadGoals(workspace),
    saveGoals: async (g) => { saveGoals(workspace, g) },
    listChats: async () => agent.listChats(),
    newChat: async () => agent.newChat(),
    openChat: async (id) => ({ messages: agent.openChat(id), busy: agent.isBusy(id) }),
    deleteChat: async (id) => agent.deleteChat(id),
    send: async (chatId, prompt) => {
      if (!settings.defaultModel) return { status: 'failed', text: 'Choose a model in Settings first.' }
      return agent.send(chatId, prompt)
    },
    stop: async (chatId) => agent.stop(chatId),
    listSkills: async () => agent.skills().map((s) => ({ name: s.name, description: s.description })),
    readSkill: async (name) => {
      const s = agent.skills().find((x) => x.name === name)
      if (!s) return null
      const file = path.join(workspace, 'skills', s.name, 'SKILL.md')
      try { return { name: s.name, path: path.relative(workspace, file), text: fs.readFileSync(file, 'utf8') } } catch { return null }
    },
    decide: async (rec, decision) => { ui.decide(rec, decision); changed() },
    mainState: async () => mainState(),
    runJob: async (job) => {
      if (!runtimeModelOf(settings)) return { ok: false, error: 'Choose a model in Settings first.' }
      if (runtime.running().includes(job)) return { ok: false, error: `"${job}" is already running` }
      // Runs in the background; the window follows it through run events and a change notice at each end.
      started[job] = Date.now()
      runtime.run(job).catch((e) => win?.webContents.send(RUN_EVENT_CHANNEL, job, { kind: 'error', message: String(e?.message ?? e) })).finally(changed)
      changed()
      return { ok: true }
    },
    stopJob: async (job) => runtime.stop(job),
    loadPanel: async (file) => ui.panel(file),
    reportPanelError: async (file, message) => ui.reportError(file, message)
  }
  for (const c of CHANNELS) ipcMain.handle(c, (_e, ...args: unknown[]) => (handlers[c] as (...a: unknown[]) => unknown)(...args))

  createWindow()
  app.on('activate', () => { if (!win) createWindow() })
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => { runtime?.dispose(); ui?.dispose(); agent?.dispose() })
