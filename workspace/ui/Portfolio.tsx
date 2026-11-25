import './fullWidth.css'
import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import HoldingDetails from './HoldingDetails'
import HoldingForm, { type Draft } from './HoldingForm'
import { totalManual, valueHolding, type ManualHolding, type Quote } from './lib/holdings'
import { useQuotes } from './lib/useQuotes'

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

function Section({ title, right, action, children }: { title: string; right?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ border: BORDER, borderRadius: 12, margin: '16px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: BORDER, background: 'rgba(127,127,127,0.05)' }}>
        <h3 className="lu-title" style={{ margin: 0 }}>{title}</h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 12, ...MUTED }}>{right}</span>{action}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </section>
  )
}

const Badge = ({ children, title }: { children: ReactNode; title?: string }) => (
  <span title={title} style={{ display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, verticalAlign: 'middle', color: BLUE, background: `${BLUE}1f` }}>{children}</span>
)

const Empty = ({ text }: { text: string }) => <div style={{ padding: '28px 16px', textAlign: 'center', ...MUTED }}>{text}</div>

type SaveHoldings = (items: ManualHolding[]) => Promise<ManualHolding[]>

export default function Portfolio({ goals, data, saveHoldings }: { goals: Goals | null; data: Record<string, any>; saveHoldings?: SaveHoldings }) {
  const review = data?.review ?? {}
  const a = review.account ?? {}
  // Rows the review marked as hand-added are drawn from holdings.json below, live, so they are never counted twice.
  const holdings: any[] = (Array.isArray(review.holdings) ? review.holdings : []).filter((h: any) => h?.source !== 'manual')
  const closed: any[] = Array.isArray(review.closed) ? review.closed : []
  const decisions: any[] = Array.isArray(data?.decisions?.items) ? data.decisions.items : []
  const manual: ManualHolding[] = Array.isArray(data?.holdings?.items) ? data.holdings.items : []
  const reviewedManual: Record<string, any> = Object.fromEntries((Array.isArray(review.manual?.holdings) ? review.manual.holdings : []).map((h: any) => [h.id ?? h.ticker, h]))
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  const tickers = useMemo(() => [...new Set([...holdings.map((h) => String(h.ticker ?? '')), ...manual.map((m) => m.ticker)].filter(Boolean))], [JSON.stringify(holdings.map((h) => h.ticker)), JSON.stringify(manual.map((m) => m.ticker))])
  const { quotes, errors: quoteErrors } = useQuotes(tickers)
  // A live quote first; if it fails, the price the last review found.
  const quoteFor = (m: ManualHolding): Quote | null => {
    const q = quotes[m.ticker]
    if (q) return q
    const r = reviewedManual[m.id] ?? reviewedManual[m.ticker]
    return r && num(r.price) != null ? { symbol: m.ticker, name: m.name ?? m.ticker, kind: m.kind ?? 'Stock', currency: 'USD', price: r.price, prevClose: num(r.prevClose), dayChangePct: num(r.dayChangePct), high52: null, low52: null, time: null, dividends: [], ttmDividend: num(r.ttmDividendPerShare) ?? 0, yieldPct: null } : null
  }
  const manualRows = manual.map((m) => ({ m, p: valueHolding(m, quoteFor(m)) }))
  const mt = totalManual(manualRows.map((r) => r.p))

  const store = async (items: ManualHolding[]) => {
    if (!saveHoldings) throw new Error('This app version cannot save holdings.')
    setSaveError('')
    await saveHoldings(items)
  }
  const upsert = async (d: Draft) => {
    const now = new Date().toISOString()
    const item = { ...d, id: d.id ?? '', addedAt: d.addedAt ?? now, updatedAt: now } as ManualHolding
    await store(d.id ? manual.map((m) => (m.id === d.id ? item : m)) : [...manual, item])
    setEditing(null)
  }
  const remove = async (id: string) => {
    try { await store(manual.filter((m) => m.id !== id)); setConfirmDelete(null); setOpen(null) } catch (e: any) { setSaveError(String(e?.message ?? e)) }
  }

  const budget = num(a.budget) ?? Math.min(num(goals?.budget) ?? 10000, 10000)
  const hasAccount = review.account != null
  const invested = num(a.invested) ?? 0
  const realized = num(a.realizedUsd) ?? 0
  const unrealized = num(a.unrealizedUsd) ?? 0
  const income = num(a.incomeUsd) ?? num(review.dividends?.paidUsd) ?? 0
  const pendingIncome = num(review.dividends?.pendingUsd) ?? 0
  const payouts: any[] = Array.isArray(review.dividends?.items) ? review.dividends.items : []
  // Dividends paid on holdings added by hand: extra money, like the rest of those holdings.
  const manualPaid = manual.length ? num(review.manual?.dividendsPaidUsd) ?? 0 : 0
  const manualPending = manual.length ? num(review.manual?.dividendsPendingUsd) ?? 0 : 0
  const paidOf = (m: ManualHolding): number | null => num((reviewedManual[m.id] ?? {}).dividendsPaidUsd)
  const needsDate = manual.filter((m) => !m.buyDate)
  const cash = num(a.cash) ?? budget - invested + realized + income
  const marketValue = num(a.marketValue) ?? invested + unrealized
  const totalValue = num(a.totalValue) ?? cash + marketValue
  const totalUsd = num(a.totalUsd) ?? realized + unrealized + income
  const totalPct = num(a.totalPct) ?? (totalUsd / budget) * 100
  const goalPct = num(a.goalPct) ?? 10
  const goalProgress = (totalPct / goalPct) * 100
  const wins = num(a.wins) ?? closed.filter((c) => (num(c.realizedUsd) ?? 0) > 0).length
  const closedCount = num(a.closedTrades) ?? closed.length
  const winRate = num(a.winRatePct) ?? (closedCount ? (wins / closedCount) * 100 : null)
  const appToday = num(a.todayChangeUsd)
  const appTodayPct = num(a.todayChangePct)

  // Hand-added holdings are extra money: they add to value, invested and unrealized profit but never to cash or the goal.
  const hasManual = mt.count > 0
  const accountValue = totalValue + mt.marketValue
  const accountInvested = invested + mt.costBasis
  const accountMarket = marketValue + mt.marketValue
  const accountUnrealized = unrealized + mt.unrealizedUsd
  const today = appToday == null && !hasManual ? null : (appToday ?? 0) + mt.dayChangeUsd
  const todayPct = !hasManual ? appTodayPct : today != null && accountValue - today ? (today / (accountValue - today)) * 100 : null
  const allTimeUsd = totalUsd + mt.unrealizedUsd + manualPaid
  const allTimePct = hasManual ? (allTimeUsd / (budget + mt.costBasis)) * 100 : totalPct
  const positions = holdings.length + mt.count

  const reviewedAt = String(a.asOf ?? review.date ?? '')
  const newSince = decisions.filter((d) => d.decision === 'accepted' && typeof d.at === 'string' && review.date && d.at.slice(0, 10) > review.date).length

  const totals = holdings.reduce((s, h) => ({
    mv: s.mv + (num(h.marketValue) ?? 0), cost: s.cost + (num(h.costBasis) ?? (num(h.entry) ?? 0) * (num(h.shares) ?? 0)),
    u: s.u + (num(h.unrealizedUsd) ?? 0), d: s.d + (num(h.dayChangeUsd) ?? 0),
  }), { mv: mt.marketValue, cost: mt.costBasis, u: mt.unrealizedUsd, d: mt.dayChangeUsd })
  const closedTotal = closed.reduce((s, c) => s + (num(c.realizedUsd) ?? 0), 0)

  return (
    <div className="lu-block">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, ...MUTED }}>Account value</div>
          <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{usd(accountValue)}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            <span style={{ color: tone(today), fontWeight: 600 }}>{today == null ? 'Today: no data' : `${usd(today, true)} (${pct(todayPct)})`}</span>
            <span style={MUTED}> today · </span>
            <span style={{ color: tone(allTimeUsd), fontWeight: 600 }}>{usd(allTimeUsd, true)} ({pct(allTimePct)})</span>
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
        <Card label="Total value" value={usd(accountValue)} sub={hasManual ? `App ${usd(totalValue)} · yours ${usd(mt.marketValue)}` : `Starting budget ${usd(budget)}`} />
        <Card label="Cash" value={usd(cash)} sub={`${((cash / Math.max(accountValue, 1)) * 100).toFixed(1)}% of account`} />
        <Card label="Invested" value={usd(accountInvested)} sub={`Market value ${usd(accountMarket)}`} />
        <Card label="Realized profit" value={usd(realized, true)} color={tone(realized)} sub={`${closedCount} closed trade${closedCount === 1 ? '' : 's'}`} />
        <Card label="Unrealized profit" value={usd(accountUnrealized, true)} color={tone(accountUnrealized)} sub={`${positions} open position${positions === 1 ? '' : 's'}`} />
        <Card label="Dividends & interest" value={usd(income, true)} color={tone(income)}
          sub={pendingIncome > 0 ? `Paid only · ${usd(pendingIncome)} pending, not counted` : 'Paid to you only'} />
        <Card label={`Total profit vs ${goalPct}% goal`} value={pct(totalPct)} color={tone(totalPct)}
          sub={`${usd(totalUsd, true)} (price ${usd(realized + unrealized, true)} + income ${usd(income, true)}) of ${usd(num(a.goalUsd) ?? (budget * goalPct) / 100)} goal${hasManual ? ' · app calls only' : ''}`}>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(127,127,127,0.2)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, goalProgress))}%`, height: '100%', background: goalProgress >= 100 ? GREEN : totalPct < 0 ? RED : BLUE }} />
          </div>
        </Card>
        <Card label="Win rate" value={winRate == null ? 'n/a' : `${winRate.toFixed(0)}%`} sub={closedCount ? `${wins} of ${closedCount} trades won` : 'No closed trades yet'} />
        <Card label="Today's change" value={today == null ? 'no data' : usd(today, true)} color={tone(today)} sub={todayPct == null ? undefined : pct(todayPct)} />
        {hasManual && <Card label="Your funds: dividends paid" value={usd(manualPaid, true)} color={tone(manualPaid)}
          sub={needsDate.length ? `${needsDate.length} holding${needsDate.length > 1 ? 's' : ''} need a buy date to count` : `Est. ${usd(mt.estAnnualIncome)} a year`} />}
      </div>

      {/* Holdings */}
      <Section title="Positions"
        right={positions ? `${positions} holding${positions > 1 ? 's' : ''}${hasManual ? ` · ${mt.count} added by you` : ''} · click a row for details` : undefined}
        action={saveHoldings && <button onClick={() => { setEditing('new'); setSaveError('') }} disabled={editing === 'new'} title="Add a stock or fund you bought outside the app's calls"><Plus size={13} style={{ verticalAlign: -2 }} /> Add holding</button>}>
        {editing === 'new' && <HoldingForm onSave={upsert} onCancel={() => setEditing(null)} />}
        {saveError && <div style={{ padding: '8px 16px', color: RED, fontSize: 12 }}>{saveError}</div>}
        {needsDate.length > 0 && (
          <div style={{ padding: '8px 16px', fontSize: 12.5, color: '#e0a030', borderBottom: BORDER }}>
            Dividends on {[...new Set(needsDate.map((m) => m.ticker))].join(', ')} can't be counted yet: the app needs to know when you bought {needsDate.length > 1 ? 'them' : 'it'} to tell which monthly payouts you received.
            Click {needsDate.length > 1 ? 'each' : 'the'} row, choose <b>Edit</b>, fill in <b>Bought on</b>, then click “Update account”.
          </div>
        )}
        {positions === 0 ? <Empty text="You hold no positions. Accepted Buy calls show up here after the next update, and you can add what you bought elsewhere with “Add holding”." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={{ ...th, ...left }}>Symbol</th><th style={th}>Bought</th><th style={th}>Shares</th><th style={th}>Avg cost</th>
              <th style={th}>Price</th><th style={th}>Today</th><th style={th}>Market value</th><th style={th}>Unrealized P/L</th>
              <th style={{ ...th, textAlign: 'center' }}>Stop → Target</th><th style={th}>Days</th>
            </tr></thead>
            <tbody>
              {holdings.map((h) => {
                const price = num(h.price), entry = num(h.entry), u = num(h.unrealizedUsd), up = num(h.unrealizedPct), d = num(h.dayChangePct)
                const key = `app:${h.ticker}`
                const expanded = open === key
                return [
                  <tr key={key} onClick={() => setOpen(expanded ? null : key)} style={{ cursor: 'pointer', background: expanded ? 'rgba(127,127,127,0.06)' : undefined }}>
                    <td style={{ ...td, ...left }}><b style={{ fontSize: 14 }}>{h.ticker}</b>{quotes[h.ticker]?.kind && quotes[h.ticker]!.kind !== 'Stock' && <Badge>{quotes[h.ticker]!.kind}</Badge>}</td>
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
                    <tr key={`${key}-x`}><td colSpan={10} style={{ ...td, ...left, whiteSpace: 'normal', background: 'rgba(127,127,127,0.04)' }}>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
                        <span><span style={MUTED}>Cost basis </span>{usd(num(h.costBasis))}</span>
                        <span><span style={MUTED}>Prev close </span>{px(num(h.prevClose))}</span>
                        <span><span style={MUTED}>Today </span><span style={{ color: tone(num(h.dayChangeUsd)) }}>{usd(num(h.dayChangeUsd), true)}</span></span>
                        <span><span style={MUTED}>To stop </span>{price != null && num(h.stop) != null ? pct(((num(h.stop)! - price) / price) * 100) : '—'}</span>
                        <span><span style={MUTED}>To target </span>{price != null && num(h.target) != null ? pct(((num(h.target)! - price) / price) * 100) : '—'}</span>
                        {h.priceSource && <span style={MUTED}>{h.priceSource}</span>}
                      </div>
                      {h.watch && <div style={{ marginTop: 6 }}><span style={MUTED}>Watch: </span>{h.watch}</div>}
                      <HoldingDetails ticker={h.ticker} shares={num(h.shares)} quote={quotes[h.ticker]} quoteError={quoteErrors[h.ticker]} />
                    </td></tr>
                  ),
                ]
              })}
              {manualRows.map(({ m, p }) => {
                const key = `me:${m.id}`
                const expanded = open === key
                const q = quotes[m.ticker]
                const kind = q?.kind ?? m.kind
                const watch = reviewedManual[m.id]?.watch ?? reviewedManual[m.ticker]?.watch
                if (editing === m.id) return <tr key={key}><td colSpan={10} style={{ padding: 0 }}><HoldingForm initial={m} onSave={upsert} onCancel={() => setEditing(null)} /></td></tr>
                return [
                  <tr key={key} onClick={() => setOpen(expanded ? null : key)} style={{ cursor: 'pointer', background: expanded ? 'rgba(127,127,127,0.06)' : undefined }}>
                    <td style={{ ...td, ...left }}>
                      <b style={{ fontSize: 14 }}>{m.ticker}</b><Badge title="You added this holding. It counts in your account as extra money, outside the app's cash.">Added by you</Badge>
                      {kind && kind !== 'Stock' && <Badge>{kind}</Badge>}
                      {(q?.name ?? m.name) && <div style={{ fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', ...MUTED }}>{q?.name ?? m.name}</div>}
                    </td>
                    <td style={td}>{m.buyDate ? fmtDate(m.buyDate) : (
                      <button onClick={(e) => { e.stopPropagation(); setEditing(m.id); setConfirmDelete(null) }} title="Needed to count the dividends you've been paid"
                        style={{ fontSize: 11, padding: '2px 8px', color: '#e0a030', borderColor: '#e0a03066' }}>Add date</button>
                    )}</td>
                    <td style={td}>{m.shares}</td>
                    <td style={td}>{px(m.avgCost)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{px(p.price)}</td>
                    <td style={{ ...td, color: tone(p.dayChangePct) }}>{pct(p.dayChangePct)}</td>
                    <td style={td}>{usd(p.marketValue)}</td>
                    <td style={td}><div style={{ color: tone(p.unrealizedUsd), fontWeight: 600 }}>{usd(p.unrealizedUsd, true)}</div><Pill v={p.unrealizedPct}>{pct(p.unrealizedPct)}</Pill>
                      {(paidOf(m) ?? 0) > 0 && <div style={{ fontSize: 11, marginTop: 3, color: GREEN }} title="Dividends paid to you on this lot. Total = price change + dividends.">+{usd(paidOf(m))} div · total {usd((p.unrealizedUsd ?? 0) + paidOf(m)!, true)}</div>}
                    </td>
                    <td style={{ ...td, textAlign: 'center', ...MUTED }}>{q?.yieldPct && q.ttmDividend ? `${q.yieldPct.toFixed(2)}% yield` : '—'}</td>
                    <td style={td}>{p.daysHeld ?? '—'}</td>
                  </tr>,
                  expanded && (
                    <tr key={`${key}-x`}><td colSpan={10} style={{ ...td, ...left, whiteSpace: 'normal', background: 'rgba(127,127,127,0.04)' }}>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                        <span><span style={MUTED}>Cost basis </span>{usd(p.costBasis)}</span>
                        <span><span style={MUTED}>Prev close </span>{px(q?.prevClose ?? null)}</span>
                        <span><span style={MUTED}>Today </span><span style={{ color: tone(p.dayChangeUsd) }}>{usd(p.dayChangeUsd, true)}</span></span>
                        {m.note && <span><span style={MUTED}>Note </span>{m.note}</span>}
                        {p.price == null && <span style={{ color: '#e0a030' }}>No live price{quoteErrors[m.ticker] ? ` (${quoteErrors[m.ticker]})` : ''}: counted at cost.</span>}
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                          {saveHoldings && <button onClick={() => { setEditing(m.id); setConfirmDelete(null) }}><Pencil size={12} style={{ verticalAlign: -1 }} /> Edit</button>}
                          {saveHoldings && (confirmDelete === m.id
                            ? <><span style={{ alignSelf: 'center' }}>Remove {m.ticker}?</span><button onClick={() => remove(m.id)} style={{ color: RED }}>Remove</button><button onClick={() => setConfirmDelete(null)}>Keep</button></>
                            : <button onClick={() => setConfirmDelete(m.id)}><Trash2 size={12} style={{ verticalAlign: -1 }} /> Remove</button>)}
                        </span>
                      </div>
                      {watch && <div style={{ marginTop: 6 }}><span style={MUTED}>Watch: </span>{watch}</div>}
                      <HoldingDetails ticker={m.ticker} shares={m.shares} quote={q} quoteError={quoteErrors[m.ticker]} />
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

      {/* Dividends and interest */}
      <Section title="Dividends & interest"
        right={<>App calls paid <b style={{ color: tone(income) }}>{usd(income, true)}</b>{pendingIncome > 0 && <> · pending {usd(pendingIncome)}</>}
          {hasManual && <> · your funds paid <b style={{ color: tone(manualPaid) }}>{usd(manualPaid, true)}</b>{manualPending > 0 && <> · pending {usd(manualPending)}</>}</>}</>}>
        {payouts.length === 0 ? <Empty text="No dividends or interest paid yet. A payout counts once you owned the shares before its ex-date and the cash has been paid." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={{ ...th, ...left }}>Symbol</th><th style={th}>Type</th><th style={th}>Ex-date</th><th style={th}>Paid on</th>
              <th style={th}>Per share</th><th style={th}>Shares</th><th style={th}>Amount</th><th style={th}>Status</th>
            </tr></thead>
            <tbody>
              {payouts.map((d, i) => {
                const paid = d.status === 'paid'
                return (
                  <tr key={`${d.ticker}-${d.exDate}-${i}`} style={paid ? undefined : MUTED} title={d.source ?? ''}>
                    <td style={{ ...td, ...left }}><b>{d.ticker}</b>{d.source === 'manual' && <Badge>Added by you</Badge>}</td>
                    <td style={td}>{d.kind === 'interest' ? 'Interest' : 'Dividend'}</td>
                    <td style={td}>{fmtDate(d.exDate)}</td>
                    <td style={td}>{d.payDate ? fmtDate(d.payDate) : '—'}</td>
                    <td style={td}>{num(d.perShare) == null ? '—' : `$${num(d.perShare)!.toFixed(4)}`}</td>
                    <td style={td}>{num(d.shares) ?? '—'}</td>
                    <td style={{ ...td, fontWeight: 600, color: paid ? GREEN : undefined }}>{usd(num(d.amountUsd), paid)}</td>
                    <td style={td}><span style={{ fontSize: 12, color: d.status === 'needs buy date' ? '#e0a030' : undefined }}>{paid ? 'Paid · counted' : d.status === 'needs buy date' ? 'Needs buy date' : 'Pending · not counted'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {typeof review.dividends?.note === 'string' && review.dividends.note && <div style={{ padding: '8px 16px 12px', fontSize: 12, ...MUTED }}>{review.dividends.note}</div>}
      </Section>
    </div>
  )
}
