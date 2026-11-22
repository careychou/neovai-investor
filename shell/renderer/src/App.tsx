import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import Today from '@workspace/ui/Today'
import type { AppInfo, Goals } from '../../shared/api'
import Codify from './Codify'
import Settings from './Settings'

type Tab = 'today' | 'codify' | 'settings'
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'codify', label: 'Codify' },
  { id: 'settings', label: 'Settings' }
]

/** Workspace screens are edited by the agent, so a broken one must not take the shell down. */
class Guard extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(e: unknown) { return { error: String((e as Error)?.message ?? e) } }
  render() {
    return this.state.error
      ? <div className="error">This screen failed to load: {this.state.error}</div>
      : this.props.children
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [goals, setGoals] = useState<Goals | null>(null)
  const loadGoals = useCallback(() => { window.api.getGoals().then(setGoals) }, [])

  useEffect(() => { window.api.info().then(setInfo); loadGoals() }, [loadGoals])

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">Neovai Investor</div>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'navbtn active' : 'navbtn'} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <div className="navfoot">
          <div>Not financial advice.</div>
          {info && <div>v{info.version} · kernel {info.kernel}</div>}
        </div>
      </nav>
      <main className="main">
        <div className="pane" hidden={tab !== 'today'}><Guard><Today goals={goals} /></Guard></div>
        <div className="pane chatpane" hidden={tab !== 'codify'}><Codify /></div>
        {tab === 'settings' && <div className="pane"><Settings info={info} onGoalsSaved={loadGoals} /></div>}
      </main>
    </div>
  )
}
