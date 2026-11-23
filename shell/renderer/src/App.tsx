import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScreenView, type ScreenHost } from 'neovai-kernel/cards/live-ui/react'
import { MessageList } from 'neovai-kernel/cards/chat-view/react'
import { applyEvent, peek, toolLabel, type Item } from 'neovai-kernel/cards/chat-view'
import type { AppInfo, Goals, MainState } from '../../shared/api'
import Codify, { type CodifyRequest } from './Codify'
import Markdown from './Markdown'
import Settings from './Settings'
import Skills from './Skills'
import { LINKS } from './links'

const EMPTY: MainState = { screens: [], data: {}, jobs: [], running: [], started: {}, reports: {}, skills: {} }

/** One line on what a run is doing now, from its latest activity. */
function stepOf(items: Item[] = []): string {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    if (it.kind === 'tool') return it.ok === undefined ? toolLabel(it) : `done: ${toolLabel(it)}`
    if (it.kind === 'reasoning') return it.live ? `Thinking: ${peek(it.text, 70)}` : peek(it.text, 70)
    if (it.kind === 'assistant') return 'Writing the report'
    if (it.kind === 'error') return it.text
  }
  return 'Starting'
}

export default function App() {
  const [tab, setTab] = useState('')
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [goals, setGoals] = useState<Goals | null>(null)
  const [main, setMain] = useState<MainState>(EMPTY)
  const [tick, setTick] = useState(0)
  const [runs, setRuns] = useState<Record<string, Item[]>>({})
  const [runError, setRunError] = useState('')
  const [codifyReq, setCodifyReq] = useState<CodifyRequest | null>(null)
  const [skillReq, setSkillReq] = useState<{ name: string; at: number } | null>(null)
  const loadGoals = useCallback(() => { window.api.getGoals().then(setGoals) }, [])
  const loadMain = useCallback(() => {
    window.api.mainState().then((m) => { setMain(m); setTick((t) => t + 1) }).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.info().then(setInfo)
    loadGoals()
    loadMain()
    const offChanged = window.api.onMainChanged(loadMain)
    const offRun = window.api.onRunEvent((job, e) => {
      if (e.kind === 'error') setRunError(`${job}: ${e.message}`)
      setRuns((s) => ({ ...s, [job]: applyEvent(s[job] ?? [], e) }))
    })
    return () => { offChanged(); offRun() }
  }, [loadGoals, loadMain])

  const screens = main.screens
  const current = tab || screens[0]?.name || 'codify'
  const screen = screens.find((s) => s.name === current)

  const host: ScreenHost = useMemo(() => ({
    data: main.data,
    running: main.running,
    runStarted: main.started,
    runStep: Object.fromEntries(main.running.map((j) => [j, stepOf(runs[j])])),
    renderActivity: (job) => <MessageList items={runs[job] ?? []} Markdown={Markdown} links={LINKS} />,
    decide: (rec, decision) => { void window.api.decide(rec, decision) },
    reports: main.reports,
    skillText: main.skills,
    // A skill chip opens that skill on the Skills page; anything else is a Codify request about the screen.
    codify: (req) => {
      if (req.skill) { setSkillReq({ name: req.skill, at: Date.now() }); setTab('skills') }
      else { setCodifyReq({ ...req, at: Date.now() }); setTab('codify') }
    },
    panelProps: { goals },
    prefs: goals ?? {},
    savePrefs: async (p) => { await window.api.saveGoals(p as Goals); loadGoals() },
    Markdown,
    links: LINKS,
    loadPanel: (file) => window.api.loadPanel(file),
    fetch: (url) => window.api.panelFetch(url),
    onPanelError: (file, message) => { void window.api.reportPanelError(file, message) },
    runJob: async (job, input) => {
      setRunError('')
      setRuns((s) => ({ ...s, [job]: [] }))
      const r = await window.api.runJob(job, input)
      if (!r.ok) setRunError(r.error ?? 'The run did not start.')
    },
    stopJob: (job) => { void window.api.stopJob(job) }
  }), [main, goals, runs, loadGoals])


  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">Neovai Investor</div>
        {screens.map((s) => (
          <button key={s.name} className={current === s.name ? 'navbtn active' : 'navbtn'} onClick={() => setTab(s.name)}>
            {s.title}{s.errors.length > 0 && <span className="navwarn" title="This screen's file has problems"> !</span>}
          </button>
        ))}
        <div className="navsep" />
        <button className={current === 'skills' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('skills')}>Skills</button>
        <button className={current === 'codify' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('codify')}>Codify</button>
        <button className={current === 'settings' ? 'navbtn active' : 'navbtn'} onClick={() => setTab('settings')}>Settings</button>
        <div className="navfoot">
          <div>Not financial advice.</div>
          {info && <div>v{info.version} · kernel {info.kernel}</div>}
        </div>
      </nav>
      <main className="main">
        {screen && (
          <div className="pane">
            {runError && <div className="error">{runError}</div>}
            <ScreenView screen={screen.screen} name={screen.name} errors={screen.errors} host={host} tick={tick} />
          </div>
        )}
        <div className="pane chatpane" hidden={current !== 'codify'}><Codify request={codifyReq} /></div>
        {current === 'skills' && <div className="pane chatpane"><Skills open={skillReq} screens={screens} tick={tick} onCodify={(prompt) => { setCodifyReq({ prompt, at: Date.now() }); setTab('codify') }} /></div>}
        {current === 'settings' && <div className="pane"><Settings info={info} /></div>}
      </main>
    </div>
  )
}
