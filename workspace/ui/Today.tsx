import { version } from '../logic'

export interface Goals { earningCapPct: number; lossLimitPct: number; budget: number }

export default function Today({ goals }: { goals: Goals | null }) {
  return (
    <div className="today">
      <h1>Today</h1>
      <p className="muted">No recommendations yet. The daily run arrives in the next build.</p>
      {goals && (
        <div className="cards">
          <div className="card"><span>Take profit at</span><b>+{goals.earningCapPct}%</b></div>
          <div className="card"><span>Exit at a loss of</span><b>-{goals.lossLimitPct}%</b></div>
          <div className="card"><span>Budget</span><b>${goals.budget.toLocaleString()}</b></div>
        </div>
      )}
      <p className="muted small">Workspace logic {version()}</p>
    </div>
  )
}
