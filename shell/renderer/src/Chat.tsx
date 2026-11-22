import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chat as ChatRow } from '../../shared/api'
import Markdown from './Markdown'
import { applyEvent, fromMessages, summarize, type Item } from './items'

export default function Chat() {
  const [chats, setChats] = useState<ChatRow[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, Item[]>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const bottom = useRef<HTMLDivElement>(null)
  const busyRef = useRef(busy)
  busyRef.current = busy

  const refresh = useCallback(() => window.api.listChats().then(setChats), [])

  const select = useCallback(async (id: string) => {
    setActive(id)
    // A running chat keeps what it has streamed so far; anything else is reloaded from disk.
    if (busyRef.current[id]) return
    const { messages, busy: b } = await window.api.openChat(id)
    setItems((s) => ({ ...s, [id]: fromMessages(messages) }))
    setBusy((s) => ({ ...s, [id]: b }))
  }, [])

  useEffect(() => {
    refresh().then(() => window.api.listChats()).then((l) => { if (l[0]) select(l[0].id) })
    return window.api.onEvent((chatId, e) => {
      if (e.kind === 'agent_end') { setBusy((s) => ({ ...s, [chatId]: false })); refresh(); return }
      setItems((s) => {
        const cur = s[chatId] ?? []
        const next = applyEvent(cur, e)
        return next === cur ? s : { ...s, [chatId]: next }
      })
    })
  }, [refresh, select])

  const list = active ? items[active] ?? [] : []
  const running = active ? !!busy[active] : false
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [list, active])

  const newChat = async () => {
    const c = await window.api.newChat()
    await refresh()
    setItems((s) => ({ ...s, [c.id]: [] }))
    setActive(c.id)
    return c.id
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this chat?')) return
    await window.api.deleteChat(id)
    if (active === id) setActive(null)
    refresh()
  }

  const send = async () => {
    const prompt = draft.trim()
    if (!prompt || running) return
    const id = active ?? (await newChat())
    setDraft('')
    setItems((s) => ({ ...s, [id]: [...(s[id] ?? []), { kind: 'user', text: prompt }] }))
    setBusy((s) => ({ ...s, [id]: true }))
    let failure: string | null = null
    try {
      const r = await window.api.send(id, prompt)
      if (r.status === 'failed') failure = r.text || 'The run failed.'
    } catch (e) {
      failure = String((e as Error)?.message ?? e)
    }
    setBusy((s) => ({ ...s, [id]: false }))
    if (failure) {
      const text = failure
      setItems((s) => {
        const cur = s[id] ?? []
        return cur[cur.length - 1]?.kind === 'error' ? s : { ...s, [id]: [...cur, { kind: 'error', text }] }
      })
    }
    refresh()
  }

  return (
    <div className="chat">
      <aside className="chatlist">
        <button className="primary" onClick={newChat}>New chat</button>
        {chats.map((c) => (
          <div key={c.id} className={c.id === active ? 'chatrow active' : 'chatrow'} onClick={() => select(c.id)}>
            <span className="chattitle">{c.title || 'New chat'}</span>
            <button className="x" title="Delete chat" onClick={(ev) => { ev.stopPropagation(); remove(c.id) }}>×</button>
          </div>
        ))}
      </aside>
      <section className="thread">
        <div className="messages">
          {list.length === 0 && (
            <p className="muted empty">Ask about the workspace, or ask for a change to its instructions, logic or screens.</p>
          )}
          {list.map((it, i) => {
            if (it.kind === 'user') return <div key={i} className="msg user">{it.text}</div>
            if (it.kind === 'assistant') return <div key={i} className="msg assistant"><Markdown text={it.text} /></div>
            if (it.kind === 'error') return <div key={i} className="error">{it.text}</div>
            const key = it.callId
            const state = it.ok === undefined ? 'running' : it.ok ? 'ok' : 'failed'
            return (
              <div key={i} className={`tool ${state}`}>
                <div className="toolhead" onClick={() => setOpen((s) => ({ ...s, [key]: !s[key] }))}>
                  <span className="dot" />
                  <b>{it.name}</b>
                  <span className="toolsum">{summarize(it.name, it.args)}</span>
                  <span className="toolstate">{state}</span>
                </div>
                {open[key] && <pre className="toolout">{it.output ?? 'Running…'}</pre>}
              </div>
            )
          })}
          {running && <div className="muted small working">Working…</div>}
          <div ref={bottom} />
        </div>
        <div className="composer">
          <textarea
            value={draft}
            placeholder="Message the agent"
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
          />
          {running
            ? <button className="danger" onClick={() => active && window.api.stop(active)}>Stop</button>
            : <button className="primary" disabled={!draft.trim()} onClick={send}>Send</button>}
        </div>
      </section>
    </div>
  )
}
