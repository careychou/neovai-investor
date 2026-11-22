export interface Goals { earningCapPct: number; lossLimitPct: number; budget: number }
interface Decision { decision: 'accepted' | 'declined'; action?: string }

/** Hard limits from goals.json and a tally of the user's accepted and declined calls. */
export default function Preferences({ goals, data }: { goals: Goals | null; data: Record<string, any> }) {
  const items: Decision[] = Array.isArray(data?.decisions?.items) ? data.decisions.items : []
  const count = (d: string) => items.filter((x) => x.decision === d).length
  const card = (label: string, value: string, note?: string) => (
    <div className="lu-metric"><span>{label}</span><b>{value}</b>{note && <small>{note}</small>}</div>
  )
  return (
    <div className="lu-block">
      <h3 className="lu-title">Hard limits and choices</h3>
      <div className="lu-metrics">
        {goals && card('Take profit at', `+${goals.earningCapPct}%`, 'set on this screen')}
        {goals && card('Exit at a loss of', `-${goals.lossLimitPct}%`, 'set on this screen')}
        {goals && card('Budget', `$${goals.budget.toLocaleString()}`, 'set on this screen')}
        {card('Accepted', String(count('accepted')), 'calls you took')}
        {card('Declined', String(count('declined')), 'calls you skipped')}
      </div>
    </div>
  )
}
