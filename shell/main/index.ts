import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { ChatRequest, ModelAdapter } from 'neovai-kernel/cards/agent-loop'
import { setToolLimits } from 'neovai-kernel/cards/agent-loop'
import { ProviderRouter } from 'neovai-kernel/cards/model-providers'
import { createSettings, type SecretBox, type Settings } from 'neovai-kernel/cards/settings'
import { createAgent, type Agent } from './agent'
import { loadGoals, saveGoals } from './goals'
import { CHANNELS, EVENT_CHANNEL, type Api, type AppInfo } from '../shared/api'

app.setName('Neovai Investor')

let win: BrowserWindow | null = null
let agent: Agent
let settings: Settings
let router: ProviderRouter

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
  if (app.isPackaged && !process.env.NEOVAI_WORKSPACE && !fs.existsSync(own) && fs.existsSync(bundled)) {
    fs.cpSync(bundled, own, { recursive: true })
  }
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
  const store = createSettings({ dir: dataDir, box })
  const apply = (s: Settings) => {
    settings = s
    router = new ProviderRouter(s.providers.filter((p) => p.enabled !== false))
    setToolLimits(s)
  }
  apply(store.load())

  // The router is rebuilt when Settings are saved, so the agent always calls through the current one
  const adapter: ModelAdapter = { stream: (req: ChatRequest, signal: AbortSignal) => router.stream(req, signal) }
  agent = createAgent({
    dataDir, workspace, adapter,
    settings: () => settings,
    onEvent: (chatId, e) => win?.webContents.send(EVENT_CHANNEL, chatId, e)
  })

  let kernel = ''
  try { kernel = JSON.parse(fs.readFileSync(path.join(repoRoot(), 'kernel.json'), 'utf8')).tag } catch { /* shown as unknown */ }

  const handlers: Omit<Api, 'onEvent'> = {
    info: async (): Promise<AppInfo> => ({ version: app.getVersion(), kernel: kernel || 'unknown', workspace, secretsEncrypted: box.available() }),
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
    stop: async (chatId) => agent.stop(chatId)
  }
  for (const c of CHANNELS) ipcMain.handle(c, (_e, ...args: unknown[]) => (handlers[c] as (...a: unknown[]) => unknown)(...args))

  createWindow()
  app.on('activate', () => { if (!win) createWindow() })
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => agent?.dispose())
