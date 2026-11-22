import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, EVENT_CHANNEL, type Api } from '../shared/api'

const api: Record<string, unknown> = {}
for (const c of CHANNELS) api[c] = (...args: unknown[]) => ipcRenderer.invoke(c, ...args)
api.onEvent = (fn: (chatId: string, e: unknown) => void) => {
  const h = (_: unknown, chatId: string, e: unknown) => fn(chatId, e)
  ipcRenderer.on(EVENT_CHANNEL, h)
  return () => ipcRenderer.removeListener(EVENT_CHANNEL, h)
}

contextBridge.exposeInMainWorld('api', api as unknown as Api)
