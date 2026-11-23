import type { CSSProperties } from 'react'
import {
  RULES, GROUP_COLOR, GOAL_PCT, MAX_PER_STOCK, HARD_STOP_PCT, MUST_SELL_PCT, MAX_POSITIONS, DAILY_LOSS_PCT, WEEKLY_LOSS_PCT,
} from './preferenceRules'
import type { RuleGroup } from './preferenceRules'

export interface Goals { earningCapPct: number; lossLimitPct: number; budget: number; overallProfitPct?: number; maxPerStockUsd?: number }
interface Decision { decision: 'accepted' | 'declined'; action?: string }

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null)
const usd = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const box: CSSProperties = { border: '1px solid rgba(127,127,127,0.3)', borderRadius: 10, padding: 16, margin: '12px 0' }
const small: CSSProperties = { fontSize: 12, opacity: 0.7 }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }
const GROUPS: RuleGroup[] = ['Goal', 'Risk', 'Profit', 'Sizing', 'Timing', 'Universe']

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 10, borderRadius: 5, background: 'rgba(127,127,127,0.2)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color, transition: 'width .3s' }} />
    </div>
  )
}

/** The user's rules as cards, plus progress toward the overall profit goal. */
export default function Preferences({ goals, data }: { goals: Goals | null; data: Record<string, any> }) {
  const budget = num(goals?.budget) ?? 10000
  const goalPct = num(goals?.overallProfitPct) ?? GOAL_PCT
  const maxPerStock = num(goals?.maxPerStockUsd) ?? MAX_PER_STOCK
  const targetUsd = (budget * goalPct) / 100
  const rules = RULES.map((r) =>
    r.n === 1 ? { ...r, value: `+${goalPct}%`, detail: `${usd(targetUsd)} on the whole ${usd(budget)} budget, realized + unrealized.` }
    : r.n === 3 ? { ...r, value: usd(maxPerStock), detail: 'Cap for each purchase and each ticker. Never add past it.' }
    : r.n === 7 ? { ...r, detail: `At most ${usd(maxPerStock * MAX_POSITIONS)} invested at once.` }
    : r.n === 18 ? { ...r, value: `${usd(maxPerStock / 2)} size`, detail: `At +${goalPct}%, buy ${usd(maxPerStock / 2)} positions. Below +${+(goalPct * 0.8).toFixed(2)}% after that, no new buys that day.` }
    : r)
  const g = data?.review?.goal ?? null
  const total = num(g?.totalUsd)
  const realized = num(g?.realizedUsd)
  const unrealized = num(g?.unrealizedUsd)
  const progress = total == null ? 0 : (total / targetUsd) * 100
  const positions: any[] = Array.isArray(data?.review?.positions) ? data.review.positions : []
  const openCount = num(g?.openPositions) ?? positions.length
  const today = num(g?.todayPnlUsd)
  const week = num(g?.weekPnlUsd)
  const dailyLimit = (budget * DAILY_LOSS_PCT) / 100
  const weeklyLimit = (budget * WEEKLY_LOSS_PCT) / 100
  const decisions: Decision[] = Array.isArray(data?.decisions?.items) ? data.decisions.items : []
  const count = (d: string) => decisions.filter((x) => x.decision === d).length

  const conflicts: string[] = []
  if (goals && goals.lossLimitPct > HARD_STOP_PCT)
    conflicts.push(`Your loss limit is ${goals.lossLimitPct}%. The stricter ${HARD_STOP_PCT}% hard stop applies.`)
  if (goals && goals.earningCapPct !== MUST_SELL_PCT)
    conflicts.push(`Your take-profit is ${goals.earningCapPct}%. ${goals.earningCapPct < MUST_SELL_PCT ? `Jobs will sell everything at +${goals.earningCapPct}%, before the +${MUST_SELL_PCT}% rule.` : `The +${MUST_SELL_PCT}% must-sell rule still applies.`}`)
  if (goals && goals.budget !== 10000) conflicts.push(`Your budget is $${goals.budget.toLocaleString()}. Your rule says $10,000; the smaller one applies.`)

  const color = progress >= 100 ? '#2e9e5b' : progress >= 0 ? '#3b82f6' : '#d64545'
  const lossBar = (v: number | null, limit: number, label: string) => {
    const used = v != null && v < 0 ? (-v / limit) * 100 : 0
    return (
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...small }}>
          <span>{label}</span><span>{v == null ? 'no data' : `${usd(v)} of -${usd(limit)}`}</span>
        </div>
        <Bar pct={used} color={used >= 100 ? '#d64545' : used >= 60 ? '#e0a030' : '#2e9e5b'} />
      </div>
    )
  }

  return (
    <div className="lu-block">
      <section style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h3 className="lu-title" style={{ margin: 0 }}>Progress toward the {goalPct}% goal</h3>
          <span style={small}>{g?.asOf ? `as of ${g.asOf}` : 'Run a performance review to update'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '10px 0 6px', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 28, color }}>{total == null ? 'no data' : usd(total)}</b>
          <span style={small}>of {usd(targetUsd)} target ({total == null ? '—' : `${((total / budget) * 100).toFixed(2)}%`} of {usd(budget)})</span>
        </div>
        <Bar pct={progress} color={color} />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, ...small }}>
          <span>Realized: {realized == null ? 'no data' : usd(realized)}</span>
          <span>Unrealized: {unrealized == null ? 'no data' : usd(unrealized)}</span>
          <span>Open positions: {openCount} of {MAX_POSITIONS}</span>
          <span>Calls accepted / declined: {count('accepted')} / {count('declined')}</span>
        </div>
        {g?.note && <p style={{ margin: '8px 0 0' }}>{g.note}</p>}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
          {lossBar(today, dailyLimit, 'Today vs daily loss limit')}
          {lossBar(week, weeklyLimit, 'Week vs weekly loss limit')}
        </div>
      </section>

      {conflicts.length > 0 && (
        <section style={{ ...box, borderColor: '#e0a030', background: 'rgba(224,160,48,0.08)' }}>
          <b>Your saved preferences differ from your rules</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{conflicts.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
      )}

      {GROUPS.map((group) => {
        const groupRules = rules.filter((r) => r.group === group)
        if (!groupRules.length) return null
        return (
          <section key={group} style={{ margin: '14px 0' }}>
            <h3 className="lu-title" style={{ color: GROUP_COLOR[group] }}>{group}</h3>
            <div style={grid}>
              {groupRules.map((r) => (
                <div key={r.n} style={{ ...box, margin: 0, padding: 12, borderLeft: `4px solid ${GROUP_COLOR[group]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...small }}>
                    <span>#{r.n} {r.title}</span>
                    {r.added && <span title="Suggested for day trading; change it in Codify">suggested</span>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>{r.value}</div>
                  <div style={{ fontSize: 13 }}>{r.detail}</div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
