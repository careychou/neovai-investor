import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { ChatRequest, Message, ModelAdapter } from 'neovai-kernel/cards/agent-loop'
import { setToolLimits } from 'neovai-kernel/cards/agent-loop'
import { ProviderRouter } from 'neovai-kernel/cards/model-providers'
import { createSettings, type SecretBox } from 'neovai-kernel/cards/settings'
import { webFetch } from 'neovai-kernel/cards/web-fetch'
import { createRuntime, type Runtime } from 'neovai-kernel/cards/runtime-agent'
import { createLiveUi, DEFAULT_EXTERNALS, panelFetch, type LiveUi, type Screen } from 'neovai-kernel/cards/live-ui'
import { createAgent, type Agent } from './agent'
import { loadGoals, saveGoals } from './goals'
import { HOLDINGS_FILE, saveHoldings } from './holdings'
import { seedWorkspace } from './seed'
import { commitMessageWriter, publish } from 'neovai-kernel/cards/git-publish'
import { publishContext } from './publish-context'
import { writeSkill, type SkillSource } from 'neovai-kernel/cards/skills'
import { APP_DEFAULTS, runtimeModelOf, type AppSettings } from './app-settings'
import { CHANGED_CHANNEL, CHANNELS, PANEL_LIBRARIES, EVENT_CHANNEL, RUN_EVENT_CHANNEL, type Api, type AppInfo, type MainState } from '../shared/api'

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

/** What publish leaves out of the repo: run output, the user's own preferences and build caches. */
const PUBLISH_EXCLUDE = ['records/**', '!records/README.md', 'goals.json', '.seeded.json', '.vite/**', '**/.DS_Store', 'node_modules/**']

/** A git address (git@host:me/app.git, https://…, ssh://…, file://…) rather than a folder on this computer. */
const isRemote = (s: string) => /^[\w.-]+@[\w.-]+:|^[a-z+]+:\/\//i.test(s)

function repoRoot(): string {
  return app.isPackaged ? process.resourcesPath : app.getAppPath()
}

/** Shared skill folders, read-only in the app: the project's .github/skills and the user's ~/.copilot/skills. */
function sharedSkills(): SkillSource[] {
  return [
    { dir: path.join(repoRoot(), '.github', 'skills'), label: '.github/skills', editable: false },
    { dir: path.join(os.homedir(), '.copilot', 'skills'), label: '~/.copilot/skills', editable: false }
  ].filter((s) => fs.existsSync(s.dir))
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
    if (url === win?.webContents.getURL()) return
    e.preventDefault()
    // A link in a chat or on a screen opens in the browser, not in the app window.
    if (/^https?:/.test(url) && !url.startsWith(process.env.ELECTRON_RENDERER_URL ?? '\0')) void shell.openExternal(url)
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
  ui = createLiveUi({ workspace, fallback: FALLBACK, onChange: changed, externals: [...DEFAULT_EXTERNALS, ...PANEL_LIBRARIES] })
  ui.watch()
  runtime = createRuntime({
    workspace, adapter,
    settings: () => ({
      model: runtimeModelOf(settings), reasoning: settings.reasoning as never, maxTurns: settings.maxTurnsMain,
      maxOutputTokens: settings.maxOutputTokens, maxConcurrency: settings.maxConcurrency
    }),
    // Accept and decline, and holdings added by hand, are the user's; the agent reads them to learn but never rewrites them.
    readOnly: ['goals.json', 'records/data/decisions.json', HOLDINGS_FILE],
    goalsTitle: 'Preferences (set by the user on the Preferences screen)',
    tools: [webFetch],
    subAgents: true,
    sharedSkills,
    onEvent: (_runId, job, e) => win?.webContents.send(RUN_EVENT_CHANNEL, job, e)
  })
  agent = createAgent({
    dataDir, workspace, adapter, ui, sharedSkills,
    settings: () => settings,
    onEvent: (chatId, e) => win?.webContents.send(EVENT_CHANNEL, chatId, e)
  })

  const readSkillFile = (file: string) => { try { return fs.readFileSync(file, 'utf8') } catch { return '' } }
  const started: Record<string, number> = {}
  const mainState = (): MainState => {
    const jobs = runtime.jobs()
    const reports: MainState['reports'] = {}
    for (const j of jobs) {
      const r = runtime.lastRun(j.name)
      reports[j.name] = r && { status: r.status, text: r.text, started: r.started, finished: r.finished, input: r.input }
    }
    return {
      screens: ui.screens(), data: ui.data(), running: runtime.running(), reports,
      started: Object.fromEntries(runtime.running().map((j) => [j, started[j] ?? Date.now()])),
      jobs: jobs.map((j) => ({ name: j.name, title: j.title, description: j.description })),
      skills: Object.fromEntries(agent.skills().map((s) => [s.name, readSkillFile(s.file)]))
    }
  }

  let publishing = false
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
    renameChat: async (id, title) => agent.renameChat(id, title),
    send: async (chatId, prompt, attachments) => {
      if (!settings.defaultModel) return { status: 'failed', text: 'Choose a model in Settings first.' }
      return agent.send(chatId, prompt, attachments)
    },
    stop: async (chatId) => agent.stop(chatId),
    listSkills: async () => agent.skills().map((s) => ({ name: s.name, description: s.description, source: s.source ?? 'Workspace', editable: s.editable !== false })),
    readSkill: async (name) => {
      const s = agent.skills().find((x) => x.name === name)
      if (!s) return null
      const editable = s.editable !== false
      try {
        return { name: s.name, path: editable ? path.relative(workspace, s.file) : s.file.replace(os.homedir(), '~'), text: fs.readFileSync(s.file, 'utf8'), source: s.source ?? 'Workspace', editable }
      } catch { return null }
    },
    saveSkill: async (name, text) => {
      const s = agent.skills().find((x) => x.name === name)
      if (s && s.editable === false) throw new Error(`"${name}" is a shared skill and is read-only here`)
      writeSkill(path.join(workspace, 'skills'), name, text)
      changed()
    },
    decide: async (rec, decision) => { ui.decide(rec, decision); changed() },
    saveHoldings: async (items) => { const r = saveHoldings(workspace, items); changed(); return r },
    mainState: async () => mainState(),
    runJob: async (job, input) => {
      if (!runtimeModelOf(settings)) return { ok: false, error: 'Choose a model in Settings first.' }
      if (runtime.running().includes(job)) return { ok: false, error: `"${job}" is already running` }
      // Runs in the background; the window follows it through run events and a change notice at each end.
      started[job] = Date.now()
      runtime.run(job, input).catch((e) => win?.webContents.send(RUN_EVENT_CHANNEL, job, { kind: 'error', message: String(e?.message ?? e) })).finally(changed)
      changed()
      return { ok: true }
    },
    stopJob: async (job) => runtime.stop(job),
    loadPanel: async (file) => ui.panel(file),
    reportPanelError: async (file, message) => ui.reportError(file, message),
    panelFetch: async (url) => panelFetch(url),
    publish: async (chatId) => {
      if (publishing) return { status: 'refused', text: 'A publish is already running.' }
      if (agent.isBusy(chatId)) return { status: 'refused', text: 'Wait for Codify to finish, then publish.' }
      publishing = true
      try {
        const target = (settings.publishRepo || '').trim()
        const repo = target || (app.isPackaged ? '' : repoRoot())
        const remote = isRemote(repo)
        const ask: Message = { role: 'user', content: 'Publish my changes to the repository.' }
        const r = await publish({
          ...(remote ? { url: repo } : { repo }),
          mirror: repo ? { from: workspace, to: 'workspace', exclude: PUBLISH_EXCLUDE } : undefined,
          // The commit says why: the Codify requests since the last commit go to the model with the diff.
          describe: settings.defaultModel ? commitMessageWriter({
            adapter, model: settings.defaultModel,
            context: (info) => publishContext(agent.listChats(), (id) => agent.openChat(id), info.since)
          }) : undefined,
          onEvent: (e) => win?.webContents.send(EVENT_CHANNEL, chatId, e)
        })
        const text = !repo ? 'Set the repository under Settings › Publish, then try again.' : r.text
        agent.append(chatId, [ask, ...(repo ? r.messages : [{ role: 'assistant', content: text } as Message])])
        return { status: r.status, text }
      } finally { publishing = false }
    }
  }
  for (const c of CHANNELS) ipcMain.handle(c, (_e, ...args: unknown[]) => (handlers[c] as (...a: unknown[]) => unknown)(...args))

  createWindow()
  app.on('activate', () => { if (!win) createWindow() })
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => { runtime?.dispose(); ui?.dispose(); agent?.dispose() })
