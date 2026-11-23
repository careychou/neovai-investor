import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

interface Goals { earningCapPct: number; lossLimitPct: number; budget: number }

const GREEN = '#22a06b'
const RED = '#e5484d'
const BLUE = '#3b82f6'
const MUTED: CSSProperties = { opacity: 0.6 }
const BORDER = '1px solid rgba(127,127,127,0.22)'

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null)
const usd = (v: number | null, sign = false) => {
  if (v == null) return 'no data'
  const s = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${v < 0 ? '−' : sign && v > 0 ? '+' : ''}$${s}`
}
const px = (v: number | null) => (v == null ? 'no data' : `$${v.toFixed(2)}`)
const pct = (v: number | null, sign = true) => (v == null ? '—' : `${sign && v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`)
const tone = (v: number | null) => (v == null || v === 0 ? undefined : v > 0 ? GREEN : RED)
const fmtDate = (d: unknown) => {
  if (typeof d !== 'string' || !d) return '—'
  const t = new Date(d.length === 10 ? `${d}T12:00:00` : d)
  return isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Card({ label, value, sub, color, children }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; children?: ReactNode }) {
  return (
    <div style={{ border: BORDER, borderRadius: 12, padding: '14px 16px', background: 'rgba(127,127,127,0.05)', minWidth: 0 }}>
      <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', ...MUTED }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 2px', color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, ...MUTED }}>{sub}</div>}
      {children}
    </div>
  )
}

function Pill({ v, children }: { v: number | null; children: ReactNode }) {
  const c = tone(v)
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontWeight: 600, fontSize: 12,
      color: c ?? 'inherit', background: c ? `${c}1f` : 'rgba(127,127,127,0.12)' }}>{children}</span>
  )
}

/** Where the price sits between stop and target. */
function Range({ stop, target, price, entry }: { stop: number | null; target: number | null; price: number | null; entry: number | null }) {
  if (stop == null || target == null || target <= stop) return <span style={MUTED}>—</span>
  const at = (v: number) => Math.max(0, Math.min(100, ((v - stop) / (target - stop)) * 100))
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: RED }}>{px(stop)}</span><span style={{ color: GREEN }}>{px(target)}</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, marginTop: 4, background: `linear-gradient(90deg, ${RED}55, rgba(127,127,127,0.25), ${GREEN}55)` }}>
        {entry != null && <div title={`Entry ${px(entry)}`} style={{ position: 'absolute', left: `${at(entry)}%`, top: -2, width: 2, height: 10, background: 'currentColor', opacity: 0.4 }} />}
        {price != null && <div title={`Now ${px(price)}`} style={{ position: 'absolute', left: `calc(${at(price)}% - 5px)`, top: -2, width: 10, height: 10, borderRadius: 5, background: price >= (entry ?? price) ? GREEN : RED, boxShadow: '0 0 0 2px rgba(0,0,0,0.15)' }} />}
      </div>
    </div>
  )
}

const th: CSSProperties = { textAlign: 'right', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, padding: '10px 12px', borderBottom: BORDER, whiteSpace: 'nowrap', opacity: 0.65 }
const td: CSSProperties = { textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid rgba(127,127,127,0.12)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
const left: CSSProperties = { textAlign: 'left' }

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ border: BORDER, borderRadius: 12, margin: '16px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: BORDER, background: 'rgba(127,127,127,0.05)' }}>
        <h3 className="lu-title" style={{ margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 12, ...MUTED }}>{right}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </section>
  )
}

const Empty = ({ text }: { text: string }) => <div style={{ padding: '28px 16px', textAlign: 'center', ...MUTED }}>{text}</div>

export default function Portfolio({ goals, data }: { goals: Goals | null; data: Record<string, any> }) {
  const review = data?.review ?? {}
  const a = review.account ?? {}
  const holdings: any[] = Array.isArray(review.holdings) ? review.holdings : []
  const closed: any[] = Array.isArray(review.closed) ? review.closed : []
  const decisions: any[] = Array.isArray(data?.decisions?.items) ? data.decisions.items : []
  const [open, setOpen] = useState<string | null>(null)

  const budget = num(a.budget) ?? Math.min(num(goals?.budget) ?? 10000, 10000)
  const hasAccount = review.account != null
  const invested = num(a.invested) ?? 0
  const realized = num(a.realizedUsd) ?? 0
  const unrealized = num(a.unrealizedUsd) ?? 0
  const cash = num(a.cash) ?? budget - invested + realized
  const marketValue = num(a.marketValue) ?? invested + unrealized
  const totalValue = num(a.totalValue) ?? cash + marketValue
  const totalUsd = num(a.totalUsd) ?? realized + unrealized
  const totalPct = num(a.totalPct) ?? (totalUsd / budget) * 100
  const goalPct = num(a.goalPct) ?? 10
  const goalProgress = (totalPct / goalPct) * 100
  const wins = num(a.wins) ?? closed.filter((c) => (num(c.realizedUsd) ?? 0) > 0).length
  const closedCount = num(a.closedTrades) ?? closed.length
  const winRate = num(a.winRatePct) ?? (closedCount ? (wins / closedCount) * 100 : null)
  const today = num(a.todayChangeUsd)
  const todayPct = num(a.todayChangePct)

  const reviewedAt = String(a.asOf ?? review.date ?? '')
  const newSince = decisions.filter((d) => d.decision === 'accepted' && typeof d.at === 'string' && review.date && d.at.slice(0, 10) > review.date).length

  const totals = holdings.reduce((s, h) => ({
    mv: s.mv + (num(h.marketValue) ?? 0), cost: s.cost + (num(h.costBasis) ?? (num(h.entry) ?? 0) * (num(h.shares) ?? 0)),
    u: s.u + (num(h.unrealizedUsd) ?? 0), d: s.d + (num(h.dayChangeUsd) ?? 0),
  }), { mv: 0, cost: 0, u: 0, d: 0 })
  const closedTotal = closed.reduce((s, c) => s + (num(c.realizedUsd) ?? 0), 0)

  return (
    <div className="lu-block">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, ...MUTED }}>Account value</div>
          <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{usd(totalValue)}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            <span style={{ color: tone(today), fontWeight: 600 }}>{today == null ? 'Today: no data' : `${usd(today, true)} (${pct(todayPct)})`}</span>
            <span style={MUTED}> today · </span>
            <span style={{ color: tone(totalUsd), fontWeight: 600 }}>{usd(totalUsd, true)} ({pct(totalPct)})</span>
            <span style={MUTED}> all time</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, ...MUTED }}>
          {hasAccount ? `Prices as of ${reviewedAt}` : 'No account data yet. Click “Update account” to compute it.'}
          {newSince > 0 && <div style={{ color: '#e0a030', opacity: 1 }}>{newSince} accepted call{newSince > 1 ? 's' : ''} since the last update. Update to include {newSince > 1 ? 'them' : 'it'}.</div>}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        <Card label="Total value" value={usd(totalValue)} sub={`Starting budget ${usd(budget)}`} />
        <Card label="Cash" value={usd(cash)} sub={`${((cash / Math.max(totalValue, 1)) * 100).toFixed(1)}% of account`} />
        <Card label="Invested" value={usd(invested)} sub={`Market value ${usd(marketValue)}`} />
        <Card label="Realized profit" value={usd(realized, true)} color={tone(realized)} sub={`${closedCount} closed trade${closedCount === 1 ? '' : 's'}`} />
        <Card label="Unrealized profit" value={usd(unrealized, true)} color={tone(unrealized)} sub={`${holdings.length} open position${holdings.length === 1 ? '' : 's'}`} />
        <Card label={`Total profit vs ${goalPct}% goal`} value={pct(totalPct)} color={tone(totalPct)}
          sub={`${usd(totalUsd, true)} of ${usd(num(a.goalUsd) ?? (budget * goalPct) / 100)} goal`}>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(127,127,127,0.2)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, goalProgress))}%`, height: '100%', background: goalProgress >= 100 ? GREEN : totalPct < 0 ? RED : BLUE }} />
          </div>
        </Card>
        <Card label="Win rate" value={winRate == null ? 'n/a' : `${winRate.toFixed(0)}%`} sub={closedCount ? `${wins} of ${closedCount} trades won` : 'No closed trades yet'} />
        <Card label="Today's change" value={today == null ? 'no data' : usd(today, true)} color={tone(today)} sub={todayPct == null ? undefined : pct(todayPct)} />
      </div>

      {/* Holdings */}
      <Section title="Positions" right={holdings.length ? `${holdings.length} holding${holdings.length > 1 ? 's' : ''} · click a row for details` : undefined}>
        {holdings.length === 0 ? <Empty text="You hold no positions. Accepted Buy calls show up here after the next update." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={{ ...th, ...left }}>Symbol</th><th style={th}>Bought</th><th style={th}>Shares</th><th style={th}>Avg cost</th>
              <th style={th}>Price</th><th style={th}>Today</th><th style={th}>Market value</th><th style={th}>Unrealized P/L</th>
              <th style={{ ...th, textAlign: 'center' }}>Stop → Target</th><th style={th}>Days</th>
            </tr></thead>
            <tbody>
              {holdings.map((h) => {
                const price = num(h.price), entry = num(h.entry), u = num(h.unrealizedUsd), up = num(h.unrealizedPct), d = num(h.dayChangePct)
                const expanded = open === h.ticker
                return [
                  <tr key={h.ticker} onClick={() => setOpen(expanded ? null : h.ticker)} style={{ cursor: 'pointer', background: expanded ? 'rgba(127,127,127,0.06)' : undefined }}>
                    <td style={{ ...td, ...left }}><b style={{ fontSize: 14 }}>{h.ticker}</b></td>
                    <td style={td}>{fmtDate(h.acceptedDate)}</td>
                    <td style={td}>{num(h.shares) ?? '—'}</td>
                    <td style={td}>{px(entry)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{px(price)}</td>
                    <td style={{ ...td, color: tone(d) }}>{pct(d)}</td>
                    <td style={td}>{usd(num(h.marketValue))}</td>
                    <td style={td}><div style={{ color: tone(u), fontWeight: 600 }}>{usd(u, true)}</div><Pill v={up}>{pct(up)}</Pill></td>
                    <td style={{ ...td, textAlign: 'center' }}><Range stop={num(h.stop)} target={num(h.target)} price={price} entry={entry} /></td>
                    <td style={td}>{num(h.daysHeld) ?? '—'}</td>
                  </tr>,
                  expanded && (
                    <tr key={`${h.ticker}-x`}><td colSpan={10} style={{ ...td, ...left, whiteSpace: 'normal', background: 'rgba(127,127,127,0.04)' }}>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
                        <span><span style={MUTED}>Cost basis </span>{usd(num(h.costBasis))}</span>
                        <span><span style={MUTED}>Prev close </span>{px(num(h.prevClose))}</span>
                        <span><span style={MUTED}>Today </span><span style={{ color: tone(num(h.dayChangeUsd)) }}>{usd(num(h.dayChangeUsd), true)}</span></span>
                        <span><span style={MUTED}>To stop </span>{price != null && num(h.stop) != null ? pct(((num(h.stop)! - price) / price) * 100) : '—'}</span>
                        <span><span style={MUTED}>To target </span>{price != null && num(h.target) != null ? pct(((num(h.target)! - price) / price) * 100) : '—'}</span>
                        {h.priceSource && <span style={MUTED}>{h.priceSource}</span>}
                      </div>
                      {h.watch && <div style={{ marginTop: 6 }}><span style={MUTED}>Watch: </span>{h.watch}</div>}
                    </td></tr>
                  ),
                ]
              })}
            </tbody>
            <tfoot><tr style={{ fontWeight: 700 }}>
              <td style={{ ...td, ...left }}>Total</td><td style={td} colSpan={4} />
              <td style={{ ...td, color: tone(totals.d) }}>{usd(totals.d, true)}</td>
              <td style={td}>{usd(totals.mv)}</td>
              <td style={{ ...td, color: tone(totals.u) }}>{usd(totals.u, true)}<div style={{ fontWeight: 500, fontSize: 11 }}>{totals.cost ? pct((totals.u / totals.cost) * 100) : ''}</div></td>
              <td style={td} colSpan={2} />
            </tr></tfoot>
          </table>
        )}
      </Section>

      {/* Closed trades */}
      <Section title="Closed trades" right={closed.length ? <>Realized <b style={{ color: tone(closedTotal) }}>{usd(closedTotal, true)}</b></> : undefined}>
        {closed.length === 0 ? <Empty text="No closed trades yet. Accepted Sell calls show up here." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={{ ...th, ...left }}>Symbol</th><th style={th}>Bought</th><th style={th}>Sold</th><th style={th}>Shares</th>
              <th style={th}>Entry</th><th style={th}>Exit</th><th style={th}>Realized P/L</th><th style={th}>Return</th><th style={th}>Days</th>
            </tr></thead>
            <tbody>
              {closed.map((c, i) => {
                const r = num(c.realizedUsd), rp = num(c.realizedPct)
                return (
                  <tr key={`${c.ticker}-${c.sellDate}-${i}`} title={c.reason ?? ''}>
                    <td style={{ ...td, ...left }}><b>{c.ticker}</b>{c.reason && <div style={{ fontSize: 11, ...MUTED, whiteSpace: 'normal', maxWidth: 220 }}>{c.reason}</div>}</td>
                    <td style={td}>{fmtDate(c.buyDate)}</td>
                    <td style={td}>{fmtDate(c.sellDate)}</td>
                    <td style={td}>{num(c.shares) ?? '—'}</td>
                    <td style={td}>{px(num(c.entry))}</td>
                    <td style={td}>{px(num(c.exit))}</td>
                    <td style={{ ...td, color: tone(r), fontWeight: 600 }}>{usd(r, true)}</td>
                    <td style={td}><Pill v={rp}>{pct(rp)}</Pill></td>
                    <td style={td}>{num(c.daysHeld) ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}
