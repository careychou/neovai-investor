import { contextBridge, ipcRenderer } from 'electron'
import { CHANGED_CHANNEL, CHANNELS, EVENT_CHANNEL, RUN_EVENT_CHANNEL, type Api } from '../shared/api'

const api: Record<string, unknown> = {}
for (const c of CHANNELS) api[c] = (...args: unknown[]) => ipcRenderer.invoke(c, ...args)

function listen(channel: string) {
  return (fn: (...a: unknown[]) => void) => {
    const h = (_: unknown, ...a: unknown[]) => fn(...a)
    ipcRenderer.on(channel, h)
    return () => { ipcRenderer.removeListener(channel, h) }
  }
}
api.onEvent = listen(EVENT_CHANNEL)
api.onRunEvent = listen(RUN_EVENT_CHANNEL)
api.onMainChanged = listen(CHANGED_CHANNEL)

contextBridge.exposeInMainWorld('api', api as unknown as Api)
