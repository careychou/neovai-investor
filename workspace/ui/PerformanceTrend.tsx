import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useApp, usePanelState, Chart } from '@neovai/panel'
import { accountCurve, drawdowns, mixCurve, openShares, parseCloses, rebased, returns, riskMetrics, type Closes, type Lot, type Metrics, type Trade } from './lib/risk'

const BORDER = '1px solid rgba(127,127,127,0.22)'
const MUTED: CSSProperties = { opacity: 0.6 }
const GREEN = '#22a06b', RED = '#e5484d'
const BENCH = 'SPY'

type View = 'account' | '1Y' | '3Y' | '5Y'
const MIX_RANGE: Record<Exclude<View, 'account'>, string> = { '1Y': '1y', '3Y': '3y', '5Y': '5y' }

const n = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() && isFinite(Number(v)) ? Number(v) : null)
const fmt = (v: number | null, d = 2, suffix = '') => (v == null ? 'no data' : `${v.toFixed(d)}${suffix}`)
const signed = (v: number | null, d = 2) => (v == null ? 'no data' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}%`)
const tone = (v: number | null, goodHigh = true) => (v == null || v === 0 ? undefined : (v > 0) === goodHigh ? GREEN : RED)

/** Daily closes for many tickers at once, cached per range for the session. */
const cache = new Map<string, Promise<Closes>>()
function useCloses(tickers: string[], range: string): { series: Record<string, Closes>; loading: boolean; failed: string[] } {
  const { fetchText } = useApp()
  const key = [...new Set(tickers)].sort().join(',')
  const [st, setSt] = useState<{ series: Record<string, Closes>; loading: boolean; failed: string[] }>({ series: {}, loading: true, failed: [] })
  useEffect(() => {
    if (!fetchText || !key) { setSt({ series: {}, loading: false, failed: [] }); return }
    let live = true
    setSt((s) => ({ ...s, loading: true }))
    const list = key.split(',')
    Promise.all(list.map((t) => {
      const id = `${t}|${range}`
      if (!cache.has(id)) {
        const interval = range === '5y' || range === '3y' ? '1d' : '1d'
        const p = fetchText(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=${range}&interval=${interval}`)
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return parseCloses(JSON.parse(r.text)) })
        p.catch(() => cache.delete(id))
        cache.set(id, p)
      }
      return cache.get(id)!.then((c) => [t, c] as const).catch(() => [t, null] as const)
    })).then((pairs) => {
      if (!live) return
      const series: Record<string, Closes> = {}
      const failed: string[] = []
      for (const [t, c] of pairs) { if (c && Object.keys(c).length) series[t] = c; else failed.push(t) }
      setSt({ series, loading: false, failed })
    })
    return () => { live = false }
  }, [key, range])
  return st
}

function rangeFor(start: string): string {
  const days = (Date.now() - Date.parse(start)) / 86400_000
  return days < 25 ? '1mo' : days < 85 ? '3mo' : days < 175 ? '6mo' : days < 360 ? '1y' : days < 720 ? '2y' : '5y'
}

function Metric({ label, value, sub, color, help }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; help: string }) {
  return (
    <div title={help} style={{ border: BORDER, borderRadius: 10, padding: '10px 12px', minWidth: 0, background: 'rgba(127,127,127,0.04)' }}>
      <div style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', ...MUTED }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, margin: '4px 0 2px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, ...MUTED }}>{sub}</div>}
    </div>
  )
}

/** One-line reading of the numbers, in the same terms the review agent uses. */
function reading(m: Metrics): string[] {
  const out: string[] = []
  if (m.days < 20) out.push(`Only ${m.days} trading day${m.days === 1 ? '' : 's'} of history, so beta, alpha and the ratios are rough until there are about 20.`)
  if (m.beta != null) out.push(m.beta > 1.2 ? `Beta ${m.beta.toFixed(2)}: moves more than the market. Expect bigger swings both ways.` : m.beta < 0.6 ? `Beta ${m.beta.toFixed(2)}: much calmer than the market, a defensive mix.` : `Beta ${m.beta.toFixed(2)}: moves roughly with the market.`)
  if (m.alphaPct != null && m.days >= 20) out.push(m.alphaPct > 0 ? `Alpha ${signed(m.alphaPct)} a year: beating what its market risk alone would earn.` : `Alpha ${signed(m.alphaPct)} a year: earning less than its market risk would predict.`)
  if (m.maxDrawdownPct < -10) out.push(`Worst fall from a peak was ${signed(m.maxDrawdownPct)}. Retirement money should stay well above a −20% drawdown.`)
  return out
}

/** Account value against the S&P 500 (SPY), with alpha, beta, Sharpe, Sortino, drawdown and volatility. */
export default function PerformanceTrend({ data, goals }: { data: Record<string, any>; goals: { budget?: number } | null }) {
  const [view, setView] = usePanelState<View>('performanceTrend.view', 'account')
  const decisions: any[] = Array.isArray(data?.decisions?.items) ? data.decisions.items : []
  const manual: any[] = Array.isArray(data?.holdings?.items) ? data.holdings.items : []
  const budget = Math.min(n(goals?.budget) ?? 10000, 10000)

  const trades: Trade[] = useMemo(() => decisions
    .filter((d) => d?.decision === 'accepted' && typeof d.ticker === 'string')
    .map((d) => ({ ticker: d.ticker.toUpperCase(), action: String(d.action ?? ''), shares: n(d.shares), entry: n(d.entry), date: String(d.at ?? d.date ?? '').slice(0, 10) }))
    .filter((t) => t.date), [decisions])
  const lots: Lot[] = useMemo(() => manual
    .filter((m) => typeof m?.ticker === 'string' && n(m.shares))
    .map((m) => ({ ticker: m.ticker.toUpperCase(), shares: n(m.shares)!, avgCost: n(m.avgCost) ?? 0, buyDate: typeof m.buyDate === 'string' ? m.buyDate : undefined })), [manual])

  const start = useMemo(() => [...trades.map((t) => t.date)].sort()[0] ?? lots.map((l) => l.buyDate).filter(Boolean).sort()[0] ?? '', [trades, lots])
  const held = useMemo(() => openShares(trades), [trades])
  const tickers = useMemo(() => [...new Set([BENCH, '^IRX', ...trades.map((t) => t.ticker), ...lots.map((l) => l.ticker)])], [trades, lots])
  const range = view === 'account' ? (start ? rangeFor(start) : '1mo') : MIX_RANGE[view]
  const { series, loading, failed } = useCloses(tickers, range)

  const result = useMemo(() => {
    const bench = series[BENCH]
    if (!bench) return null
    const days = Object.keys(bench).sort()
    const irx = series['^IRX']
    const rf = irx ? n(irx[Object.keys(irx).sort().pop()!]) ?? 0 : 0
    let curve
    if (view === 'account') {
      if (!start) return null
      curve = accountCurve(days, series, trades, lots, budget, start)
    } else {
      const last = (t: string) => { const s = series[t]; return s ? s[Object.keys(s).sort().pop()!] : null }
      const w: Record<string, number> = {}
      for (const [t, sh] of Object.entries(held)) { const p = last(t); if (p) w[t] = (w[t] ?? 0) + sh * p }
      for (const l of lots) { const p = last(l.ticker); if (p) w[l.ticker] = (w[l.ticker] ?? 0) + l.shares * p }
      if (!Object.keys(w).length) return null
      curve = mixCurve(days, series, w)
    }
    const rows = rebased(curve, bench)
    if (rows.length < 2) return { rows, dd: [], m: null, rf }
    const p = returns(curve.filter((c) => bench[c.date] != null))
    const bd = rows.map((r) => r.date)
    const b = bd.slice(1).map((d, i) => bench[d] / bench[bd[i]] - 1)
    return { rows, dd: drawdowns(rows), m: riskMetrics(p, b, rf), rf }
  }, [series, view, start, trades, lots, held, budget])

  const m = result?.m ?? null
  const saved = data?.review?.riskMetrics
  return (
    <section style={{ border: BORDER, borderRadius: 12, margin: '16px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderBottom: BORDER, background: 'rgba(127,127,127,0.05)' }}>
        <h3 className="lu-title" style={{ margin: 0 }}>Trend and risk vs the S&amp;P 500</h3>
        <span style={{ fontSize: 12, ...MUTED }}>
          {view === 'account' ? `Your account since ${start || 'no trades yet'}: app trades, cash and holdings you added` : `What you hold today, held unchanged over the last ${view}`}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['account', '1Y', '3Y', '5Y'] as View[]).map((k) => (
            <button key={k} className={k === view ? 'button primary' : 'button'} onClick={() => setView(k)} style={{ padding: '3px 10px', fontSize: 12 }}
              title={k === 'account' ? 'Your real account value since the first trade' : `Back-test: today's holdings over the last ${k}`}>
              {k === 'account' ? 'Since start' : `Mix ${k}`}
            </button>
          ))}
        </span>
      </div>
      <div style={{ padding: '12px 16px' }}>
        {loading && !result ? <div style={{ ...MUTED, padding: 30, textAlign: 'center' }}>Loading prices…</div>
          : !result || result.rows.length < 2 ? (
            <div style={{ ...MUTED, padding: 30, textAlign: 'center' }}>
              {view === 'account' && !start ? 'No accepted trades or added holdings yet.' : !series[BENCH] ? 'Couldn\'t load S&P 500 prices (no data).' : 'Not enough price history yet for a trend. Try a Mix view to see how today\'s holdings behaved over the years.'}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
                <Metric label="Return" value={signed(m?.totalPct ?? null)} color={tone(m?.totalPct ?? null)} sub={`S&P 500 ${signed(m?.benchPct ?? null)}`} help="Growth of the account over the window, leaving out money you added." />
                <Metric label="vs S&P 500" value={signed(m?.excessPct ?? null)} color={tone(m?.excessPct ?? null)} sub="return minus SPY" help="Your return minus the S&P 500's over the same days." />
                <Metric label="Alpha (yr)" value={signed(m?.alphaPct ?? null)} color={tone(m?.alphaPct ?? null)} sub={`CAPM, risk-free ${fmt(result.rf, 2, '%')}`} help="Return above what the account's beta to the market would predict, per year. Risk-free rate is the 13-week T-bill yield." />
                <Metric label="Beta" value={fmt(m?.beta ?? null)} sub="1.00 = moves like SPY" help="How much the account moves when the S&P 500 moves 1%." />
                <Metric label="Sharpe" value={fmt(m?.sharpe ?? null)} color={m?.sharpe == null ? undefined : m.sharpe >= 1 ? GREEN : m.sharpe < 0 ? RED : undefined} sub="above 1 is good" help="Return above T-bills per unit of total volatility, per year." />
                <Metric label="Sortino" value={fmt(m?.sortino ?? null)} color={m?.sortino == null ? undefined : m.sortino >= 1.5 ? GREEN : m.sortino < 0 ? RED : undefined} sub="above 1.5 is good" help="Like Sharpe but only counts downside swings." />
                <Metric label="Max drawdown" value={signed(m?.maxDrawdownPct ?? null)} color={m && m.maxDrawdownPct < -10 ? RED : undefined} sub="worst fall from a peak" help="The largest drop from a high point to a later low." />
                <Metric label="Volatility (yr)" value={fmt(m?.annualVolPct ?? null, 1, '%')} sub="annualized" help="Standard deviation of daily returns, scaled to a year." />
                <Metric label="Correlation" value={fmt(m?.correlation ?? null)} sub="with SPY" help="1.00 means it moves in lockstep with the S&P 500." />
                <Metric label="Up / down capture" value={m?.upCapturePct == null || m.downCapturePct == null ? 'no data' : `${m.upCapturePct.toFixed(0)} / ${m.downCapturePct.toFixed(0)}`} sub="% of SPY's up and down days" help="How much of the market's average up day and down day you catch. Good: high up, low down." />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Growth of $100 <span style={{ fontWeight: 400, ...MUTED }}>· account vs SPY</span></div>
              <Chart kind="line" rows={result.rows} x="date" y={['account', 'spy']} height={240} />
              <div style={{ fontSize: 12, fontWeight: 600, margin: '10px 0 2px' }}>Drawdown <span style={{ fontWeight: 400, ...MUTED }}>· % below the last peak</span></div>
              <Chart kind="area" rows={result.dd} x="date" y="drawdown" height={110} />
              {m && reading(m).length > 0 && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, display: 'grid', gap: 4 }}>{reading(m).map((t) => <li key={t}>{t}</li>)}</ul>
              )}
            </>
          )}
        {saved && typeof saved === 'object' && typeof saved.note === 'string' && (
          <div style={{ fontSize: 12, marginTop: 10, borderLeft: '3px solid #3b82f6', paddingLeft: 8 }}><span style={MUTED}>Last review ({String(saved.asOf ?? '')}): </span>{saved.note}</div>
        )}
        <div style={{ fontSize: 11, marginTop: 8, ...MUTED }}>
          Daily closes from Yahoo Finance (dividend-adjusted). Money you add with a hand-entered holding is left out of returns.{failed.length ? ` No prices for ${failed.join(', ')}.` : ''}
        </div>
      </div>
    </section>
  )
}
