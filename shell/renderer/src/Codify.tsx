import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chat as ChatRow } from '../../shared/api'
import { applyEvent, fromMessages, type Attachment, type Item } from 'neovai-kernel/cards/chat-view'
import { Composer, MessageList, SessionList, TurnRail } from 'neovai-kernel/cards/chat-view/react'
import { LINKS } from './links'
import Markdown from './Markdown'

/** A screen or the Skills page asking Codify for a change. `prompt` is used as is; otherwise the request is about `screen`. `at` makes each click a new request. */
export interface CodifyRequest { screen?: string; title?: string; text?: string; prompt?: string; at: number }

export const screenAsk = (r: { screen: string; title: string; text?: string }) => `On the ${r.title} screen (ui/screens/${r.screen}.json), ${r.text ?? ''}`

/** Where the user tells the agent how the app should behave. */
export default function Codify({ request }: { request?: CodifyRequest | null }) {
  const [chats, setChats] = useState<ChatRow[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, Item[]>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const box = useRef<HTMLTextAreaElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const busyRef = useRef(busy)
  busyRef.current = busy

  const refresh = useCallback(() => {
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
      // A background helper finishing can start a new main turn on its own.
      if (e.agentId === 'main' && e.kind !== 'agent_end' && !busyRef.current[chatId]) setBusy((s) => ({ ...s, [chatId]: true }))
      if (e.kind === 'agent_end' && e.agentId === 'main') { setBusy((s) => ({ ...s, [chatId]: false })); refresh(); return }
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

  const rename = async (id: string, title: string) => { await window.api.renameChat(id, title); refresh() }

  const ask = (text: string) => { setDraft(text); setTimeout(() => box.current?.focus()) }
  // A screen's "Change this screen" or a skill's "Change with Codify" prefills a request.
  useEffect(() => {
    if (!request) return
    ask(request.prompt ?? (request.screen ? screenAsk({ screen: request.screen, title: request.title ?? request.screen, text: request.text }) : request.text ?? ''))
  }, [request])

  const [publishing, setPublishing] = useState(false)
  // Commits and pushes the workspace; the steps stream into the chat like any run.
  const publish = async () => {
    if (publishing || running) return
    const id = active ?? (await newChat())
    setPublishing(true)
    setItems((s) => ({ ...s, [id]: [...(s[id] ?? []), { kind: 'user', text: 'Publish my changes to the repository.' }] }))
    try {
      const r = await window.api.publish(id)
      if (r.status === 'refused') setItems((s) => ({ ...s, [id]: [...(s[id] ?? []), { kind: 'error', text: r.text }] }))
      else { const { messages } = await window.api.openChat(id); setItems((s) => ({ ...s, [id]: fromMessages(messages) })) }
    } catch (e) {
      const text = String((e as Error)?.message ?? e)
      setItems((s) => ({ ...s, [id]: [...(s[id] ?? []), { kind: 'error', text }] }))
    }
    setPublishing(false)
    refresh()
  }

  const send = async (prompt: string, atts: Attachment[] = []) => {
    if ((!prompt && !atts.length) || running) return
    const id = active ?? (await newChat())
    setDraft('')
    const images = atts.flatMap((a) => (a.kind === 'image' ? [a.dataUrl] : []))
    const files = atts.flatMap((a) => (a.kind === 'text' ? [a.name] : []))
    setItems((s) => ({ ...s, [id]: [...(s[id] ?? []), { kind: 'user', text: prompt, ...(images.length ? { images } : {}), ...(files.length ? { files } : {}) }] }))
    setBusy((s) => ({ ...s, [id]: true }))
    let failure: string | null = null
    try {
      const r = await window.api.send(id, prompt, atts)
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
        <SessionList
          sessions={chats.map((c) => ({ id: c.id, title: c.title, busy: !!busy[c.id] }))}
          active={active}
          onSelect={(id) => void select(id)}
          onRename={(id, t) => void rename(id, t)}
          onDelete={(id) => void remove(id)}
          onNew={() => void newChat()}
        />
      </aside>
      <section className="thread">
        <div className="messagewrap">
        <div className="messages" ref={scroller}>
          {list.length === 0 && (
            <p className="muted empty">Say how the app should look or behave. Codify changes the screens, jobs, skills and code in the workspace, and the change shows at once.</p>
          )}
          <MessageList items={list} Markdown={Markdown} links={LINKS} />
          {running && list.at(-1)?.kind !== 'reasoning' && <div className="muted small working">Working…</div>}
          <div ref={bottom} />
        </div>
        <TurnRail scrollRef={scroller} deps={list} />
        </div>
        <div className="composer">
          <Composer
            inputRef={box}
            value={draft}
            onChange={setDraft}
            onSend={(text, atts) => void send(text, atts)}
            running={running}
            onStop={() => active && window.api.stop(active)}
            onPublish={() => void publish()}
            publishing={publishing}
            publishTitle="Publish: commit and push all changes to the repository"
            placeholder="Describe a change, for example: show sector performance as a table on Today. Attach a screenshot or file with the paperclip, paste or drop."
          />
        </div>
      </section>
    </div>
  )
}
