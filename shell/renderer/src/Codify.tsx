import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chat as ChatRow, ScreenState, SkillInfo, SkillText } from '../../shared/api'
import { applyEvent, fromMessages, type Attachment, type Item } from 'neovai-kernel/cards/chat-view'
import { Composer, MessageList } from 'neovai-kernel/cards/chat-view/react'
import Markdown from './Markdown'

const LEARN = 'Look at the picks I accepted and declined (records/data/decisions.json) and how past picks did (records/data/review.json and the Outcome sections in records/). Tell me what patterns you see in what I take, what I skip, and what worked. Then propose specific changes to the skills, each with the reason and the evidence. Make a change only after I agree.'

/** A screen asking Codify to change it or one of its skills. `at` makes each click a new request. */
export interface CodifyRequest { screen: string; title: string; skill?: string; text?: string; at: number }

const screenAsk = (r: { screen: string; title: string; text?: string }) => `On the ${r.title} screen (ui/screens/${r.screen}.json), ${r.text ?? ''}`

/** Where the user tells the agent how the app should behave. */
export default function Codify({ request, screens = [] }: { request?: CodifyRequest | null; screens?: ScreenState[] }) {
  const [chats, setChats] = useState<ChatRow[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, Item[]>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [viewing, setViewing] = useState<SkillText | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
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

  const ask = (text: string) => { setDraft(text); setViewing(null); setTimeout(() => box.current?.focus()) }
  const openSkill = async (name: string) => setViewing(await window.api.readSkill(name))
  // A screen's "Change this screen" prefills a request about it; a skill chip opens that skill.
  useEffect(() => {
    if (!request) return
    if (request.skill) void openSkill(request.skill)
    else ask(screenAsk(request))
  }, [request])
  const screensOf = (skill: string) => screens.filter((s) => s.screen?.skills?.includes(skill))
  // Reload an open skill when a run changes it.
  useEffect(() => { if (viewing && !running) window.api.readSkill(viewing.name).then((v) => v && setViewing(v)) }, [running, skills])

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
        <button className="primary" onClick={newChat}>New request</button>
        {chats.map((c) => (
          <div key={c.id} className={c.id === active ? 'chatrow active' : 'chatrow'} onClick={() => select(c.id)}>
            <span className="chattitle">{!c.title || c.title === 'New chat' ? 'New request' : c.title}</span>
            <button className="x" title="Delete request" onClick={(ev) => { ev.stopPropagation(); remove(c.id) }}>×</button>
          </div>
        ))}
        <div className="skills">
          <button className="learn" title="Codify reads your accepted and declined picks and the performance review, then proposes skill changes" onClick={() => ask(LEARN)}>Improve skills from my picks</button>
          <div className="skillshead">Skills</div>
          {skills.length === 0 && <div className="muted small">No skills yet.</div>}
          {skills.map((s) => (
            <button
              key={s.name}
              className={viewing?.name === s.name ? 'skillrow active' : 'skillrow'}
              title={`${s.description}\n\nClick to read it.`}
              onClick={() => openSkill(s.name)}
            >
              <b>{s.name}</b>
              <span>{s.description}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="thread">
        {viewing && (
          <div className="skillview">
            <div className="skillviewhead">
              <b>{viewing.name}</b><span className="muted small">{viewing.path}</span>
              <span className="grow" />
              {screensOf(viewing.name).map((s) => (
                <button key={s.name} title={`Change how the ${s.title} screen shows this skill's results`} onClick={() => ask(screenAsk({ screen: s.name, title: s.title }))}>Change the {s.title} screen</button>
              ))}
              <button className="primary" onClick={() => ask(`Change the ${viewing.name} skill: `)}>Change this skill</button>
              <button onClick={() => setViewing(null)}>Close</button>
            </div>
            <div className="skillviewbody"><Markdown text={viewing.text.replace(/^---[\s\S]*?\n---\n/, '')} /></div>
          </div>
        )}
        <div className="messages" hidden={!!viewing}>
          {list.length === 0 && (
            <p className="muted empty">Say how the app should look or behave. Codify changes the screens, jobs, skills and code in the workspace, and the change shows at once.</p>
          )}
          <MessageList items={list} Markdown={Markdown} />
          {running && list.at(-1)?.kind !== 'reasoning' && <div className="muted small working">Working…</div>}
          <div ref={bottom} />
        </div>
        <div className="composer">
          <Composer
            inputRef={box}
            value={draft}
            onChange={setDraft}
            onSend={(text, atts) => void send(text, atts)}
            running={running}
            onStop={() => active && window.api.stop(active)}
            placeholder="Describe a change, for example: show sector performance as a table on Today. Attach a screenshot or file with the paperclip, paste or drop."
          />
        </div>
      </section>
    </div>
  )
}
