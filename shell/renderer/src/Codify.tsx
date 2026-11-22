import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chat as ChatRow, SkillInfo } from '../../shared/api'
import Markdown from './Markdown'
import { applyEvent, fromMessages, summarize, type Item } from './items'

/** Where the user tells the agent how the app should behave. */
export default function Codify() {
  const [chats, setChats] = useState<ChatRow[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, Item[]>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const box = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const bottom = useRef<HTMLDivElement>(null)
  const busyRef = useRef(busy)
  busyRef.current = busy

  const refresh = useCallback(() => {
    // The agent may have added or changed a skill during the run.
    window.api.listSkills().then(setSkills).catch(() => {})
    return window.api.listChats().then(setChats)
  }, [])

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
    if (!window.confirm('Delete this request?')) return
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
        <button className="primary" onClick={newChat}>New request</button>
        {chats.map((c) => (
          <div key={c.id} className={c.id === active ? 'chatrow active' : 'chatrow'} onClick={() => select(c.id)}>
            <span className="chattitle">{!c.title || c.title === 'New chat' ? 'New request' : c.title}</span>
            <button className="x" title="Delete request" onClick={(ev) => { ev.stopPropagation(); remove(c.id) }}>×</button>
          </div>
        ))}
        <div className="skills">
          <div className="skillshead">Skills</div>
          {skills.length === 0 && <div className="muted small">No skills yet.</div>}
          {skills.map((s) => (
            <button
              key={s.name}
              className="skillrow"
              title={`${s.description}\n\nClick to ask for a change to this skill.`}
              onClick={() => { setDraft(`Change the ${s.name} skill: `); box.current?.focus() }}
            >
              <b>{s.name}</b>
              <span>{s.description}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="thread">
        <div className="messages">
          {list.length === 0 && (
            <p className="muted empty">Say how the app should behave. The agent writes it into the app's skills, logic and screens, and it applies from the next run.</p>
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
            ref={box}
            value={draft}
            placeholder="Describe a change, for example: never recommend more than two buys a day"
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
