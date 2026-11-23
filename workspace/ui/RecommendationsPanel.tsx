import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useApp, usePanelState, Blocks, Markdown, resolveData } from '@neovai/panel'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { RefreshCw, Square, CheckCircle2, AlertCircle, Loader2, X, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useCompanyName, companyNews } from './lib/companyNews'

export function CompanyName({ ticker, rec, style }: { ticker: string; rec?: Record<string, unknown> | null; style?: CSSProperties }) {
  const name = useCompanyName(ticker, rec)
  if (!name) return null
  return <span title={name} style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...style }}>{name}</span>
}

const TOP_N_CHOICES = [3, 5, 10]

type Mode = 'full' | 'reuse-scan' | 'reuse-candidates'

const JOB = 'daily'

const OPTIONS: { mode: Mode; label: string; note: string }[] = [
  { mode: 'full', label: 'Full run: scan, evaluate, recommend', note: 'New market scan, re-check candidates, new calls. Slowest.' },
  { mode: 'reuse-scan', label: "Reuse today's scan", note: 'Keep the saved market scan, re-check candidates, new calls.' },
  { mode: 'reuse-candidates', label: 'Reuse candidates', note: 'Keep the scan and candidates; only redo the calls at today’s prices. Fastest.' },
]

const LEVEL: Record<string, number> = { high: 3, medium: 2, low: 1 }
const LEVEL_NAME = ['', 'low', 'medium', 'high']

const section: CSSProperties = { borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 14 }
const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }

type Rec = {
  ticker?: string; action?: string; confidence?: string; confidenceReason?: string; reason?: string
  entry?: unknown; target?: unknown; stop?: unknown; shares?: unknown; date?: string
}
type AnyObj = Record<string, unknown>

const asList = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : [])
const asObjs = (v: unknown): AnyObj[] => (Array.isArray(v) ? (v as AnyObj[]) : [])
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) ? Number(v) : null)
const usd = (v: unknown): string => {
  const n = num(v)
  return n == null ? 'no data' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const pct = (a: unknown, b: unknown): string => {
  const x = num(a), y = num(b)
  if (x == null || y == null || y === 0) return ''
  const p = ((x - y) / y) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
}
const sameTicker = (o: AnyObj, t: string) => String(o.ticker ?? '').toUpperCase() === t.toUpperCase()

/** How many shares, at what price, and what it costs or returns. */
function orderLine(rec: Rec, group: 'Buy' | 'Sell' | 'Change', held: AnyObj | undefined): { text: string; tone: string } {
  const entry = num(rec.entry)
  const heldShares = num(held?.shares)
  const action = String(rec.action ?? '')
  if (group === 'Buy') {
    const sh = num(rec.shares) ?? (entry ? Math.floor(1000 / entry) : null)
    if (sh == null || entry == null) return { text: `Buy: ${entry == null ? 'no data for price' : `limit ${usd(entry)}`}, shares not given`, tone: 'var(--ok)' }
    return { text: `Buy ${sh} share${sh === 1 ? '' : 's'} at ${usd(entry)} limit ≈ ${usd(sh * entry)}`, tone: 'var(--ok)' }
  }
  if (group === 'Sell') {
    let sh = num(rec.shares)
    if (sh == null && heldShares != null) sh = /all/i.test(action) ? heldShares : Math.floor(heldShares / 2)
    const px = num(held?.price) ?? entry
    if (sh == null) return { text: `${action || 'Sell'}: shares not given`, tone: 'var(--bad)' }
    return { text: `Sell ${sh}${heldShares != null ? ` of ${heldShares}` : ''} share${sh === 1 ? '' : 's'} at about ${usd(px)} ≈ ${px == null ? 'no data' : usd(sh * px)}`, tone: 'var(--bad)' }
  }
  const add = /add/i.test(action) ? num(rec.shares) : null
  if (add != null && entry != null) return { text: `Add ${add} share${add === 1 ? '' : 's'} at ${usd(entry)} limit ≈ ${usd(add * entry)}`, tone: 'var(--ok)' }
  if (heldShares != null) {
    const ent = num(held?.entry) ?? entry
    return { text: `No order: keep ${heldShares} share${heldShares === 1 ? '' : 's'} bought at ${usd(ent)} (${ent == null ? 'no data' : usd(heldShares * ent)})`, tone: 'var(--accent)' }
  }
  return { text: 'No order', tone: 'var(--accent)' }
}

function Field({ label, value, tone }: { label: string; value: unknown; tone?: string }) {
  if (value == null || value === '') return null
  return (
    <div>
      <div style={{ ...muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: tone }}>{String(value)}</div>
    </div>
  )
}

export function TickerDetail({ ticker, rec, data, onClose }: { ticker: string; rec: Rec | null; data: AnyObj; onClose: () => void }) {
  const cand = asObjs(resolveData(data, 'candidates.ranked')).find(o => sameTicker(o, ticker))
  const dropped = asObjs(resolveData(data, 'candidates.dropped')).find(o => sameTicker(o, ticker))
  const held = asObjs(resolveData(data, 'review.holdings')).find(o => sameTicker(o, ticker))
  const name = useCompanyName(ticker, rec as AnyObj | null)
  const [topN, setTopN] = usePanelState<number>('recommendations.topNews', 5)
  const allNews = companyNews(data, ticker, name)
  const news = allNews.slice(0, topN)
  const marketDate = String(resolveData(data, 'market.date') ?? '')
  const history = asObjs(resolveData(data, 'decisions.items')).filter(o => sameTicker(o, ticker))
  const closed = asObjs(resolveData(data, 'review.closed')).filter(o => sameTicker(o, ticker))
  const box: CSSProperties = { border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginTop: 10 }
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 6 }
  const h: CSSProperties = { fontWeight: 600, fontSize: 13 }
  const upl = num(held?.unrealizedUsd)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, width: 'min(720px, 100%)', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{ticker}</span>
              {name && <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>}
            </div>
            {rec?.action && <div style={muted}>Today's call: {rec.action}{rec.confidence ? ` · ${rec.confidence} confidence` : ''}</div>}
          </div>
          <button className="button" onClick={onClose} aria-label="Close" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px' }}><X size={14} /></button>
        </div>

        {rec && (
          <div style={box}>
            <div style={h}>Today's call</div>
            <div style={grid}>
              <Field label="Entry" value={usd(rec.entry)} />
              <Field label="Target" value={`${usd(rec.target)} ${pct(rec.target, rec.entry)}`} tone="var(--ok)" />
              <Field label="Stop" value={`${usd(rec.stop)} ${pct(rec.stop, rec.entry)}`} tone="var(--bad)" />
              <Field label="Shares" value={num(rec.shares) ?? (num(held?.shares) != null ? `${held?.shares} held` : null)} />
            </div>
            {rec.reason && <div style={{ marginTop: 8, fontSize: 13 }}>{rec.reason}</div>}
            {rec.confidenceReason && <div style={{ ...muted, marginTop: 4 }}>Confidence: {rec.confidenceReason}</div>}
          </div>
        )}

        {held && (
          <div style={box}>
            <div style={h}>Your position</div>
            <div style={grid}>
              <Field label="Shares" value={held.shares as number} />
              <Field label="Bought at" value={usd(held.entry)} />
              <Field label="Last price" value={usd(held.price)} />
              <Field label="Value" value={usd(held.marketValue)} />
              <Field label="Profit / loss" value={upl == null ? 'no data' : `${upl >= 0 ? '+' : ''}${usd(upl)} (${num(held.unrealizedPct) ?? 0}%)`} tone={upl == null ? undefined : upl >= 0 ? 'var(--ok)' : 'var(--bad)'} />
              <Field label="Day change" value={num(held.dayChangePct) != null ? `${held.dayChangePct}%` : null} />
              <Field label="Accepted" value={held.acceptedDate as string} />
              <Field label="Days held" value={held.daysHeld as number} />
            </div>
            {held.watch != null && <div style={{ marginTop: 8, fontSize: 13 }}>{String(held.watch)}</div>}
            {held.priceSource != null && <div style={{ ...muted, marginTop: 4 }}>{String(held.priceSource)}</div>}
          </div>
        )}

        {cand && (
          <div style={box}>
            <div style={h}>Evaluation{cand.rank != null ? ` · rank #${cand.rank}` : ''}</div>
            <div style={grid}>
              <Field label="Price" value={usd(cand.price)} />
              <Field label="Target" value={usd(cand.target)} />
              <Field label="Stop" value={usd(cand.stop)} />
              <Field label="Reward / risk" value={cand.rr as number} />
            </div>
            <div style={{ display: 'grid', gap: 4, marginTop: 8, fontSize: 13 }}>
              {cand.trend != null && <div><span style={muted}>Trend: </span>{String(cand.trend)}</div>}
              {cand.volume != null && <div><span style={muted}>Volume: </span>{String(cand.volume)}</div>}
              {cand.earnings != null && <div><span style={muted}>Earnings: </span>{String(cand.earnings)}</div>}
              {cand.reason != null && <div><span style={muted}>Why: </span>{String(cand.reason)}</div>}
            </div>
            {cand.source != null && <div style={{ ...muted, marginTop: 4 }}>{String(cand.source)}</div>}
          </div>
        )}
        {!cand && dropped && (
          <div style={box}>
            <div style={h}>Evaluation</div>
            <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: 'var(--bad)' }}>Dropped: </span>{String(dropped.rule ?? '')}</div>
          </div>
        )}

        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={h}>
              Top news{name ? ` for ${name}` : ''}
              <span style={{ ...muted, fontWeight: 400 }}>{marketDate ? ` · from the market scan of ${marketDate}` : ' · from the market scan'}</span>
            </div>
            <label style={{ ...muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Show
              <select value={topN} onChange={e => setTopN(Number(e.target.value))} style={{ width: 'auto', padding: '2px 6px' }}>
                {TOP_N_CHOICES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          {news.length === 0 ? (
            <div style={{ ...muted, marginTop: 8 }}>No news for {ticker} in the latest market scan.</div>
          ) : (
            <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 10 }}>
              {news.map((n, i) => (
                <li key={i} style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>
                    <span style={{ color: n.impact === 'good' ? 'var(--ok)' : n.impact === 'bad' ? 'var(--bad)' : 'var(--muted)' }}>●</span> {n.headline}
                  </div>
                  {n.detail && <div style={{ marginTop: 2 }}>{n.detail}</div>}
                  <div style={muted}>
                    {[n.kind === 'holding' ? 'Your holding' : n.kind === 'market' ? 'Market news' : null, n.source, n.time].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {allNews.length > news.length && <div style={{ ...muted, marginTop: 8 }}>{allNews.length - news.length} more; pick a higher number to see them.</div>}
        </div>

        {(history.length > 0 || closed.length > 0) && (
          <div style={box}>
            <div style={h}>Your history with {ticker}</div>
            {history.map((d, i) => (
              <div key={i} style={{ fontSize: 13, marginTop: 6 }}>
                {String(d.date ?? '')} · {String(d.action ?? '')}
                {num(d.shares) != null ? ` ${d.shares} sh` : ''}
                {num(d.entry) != null ? ` at ${usd(d.entry)}` : ''} ·{' '}
                <span style={{ color: d.decision === 'accepted' ? 'var(--ok)' : 'var(--bad)' }}>{String(d.decision ?? '')}</span>
              </div>
            ))}
            {closed.map((c, i) => (
              <div key={`c${i}`} style={{ fontSize: 13, marginTop: 6 }}>
                Closed: {Object.entries(c).filter(([k]) => k !== 'ticker').slice(0, 6).map(([k, v]) => `${k} ${String(v)}`).join(' · ')}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function toDate(v: unknown): Date | null {
  if (v == null) return null
  const d = new Date(v as string | number)
  return isNaN(d.getTime()) ? null : d
}

export default function RecommendationsPanel() {
  const app = useApp()
  const [mode, setMode] = usePanelState<Mode>('recommendations.mode', 'full')
  const [detail, setDetail] = useState<{ ticker: string; rec: Rec | null } | null>(null)
  const holdings = asObjs(resolveData(app.data, 'review.holdings'))

  const picks = (resolveData(app.data, 'picks') ?? {}) as Record<string, unknown>
  const buys = asList(picks.buys)
  const sells = asList(picks.sells)
  const changes = asList(picks.changes)

  const running = app.isRunning(JOB)
  const step = app.step(JOB)
  const started = toDate(app.started(JOB))
  const last = app.lastRun(JOB)
  const lastFinished = toDate(last?.finished)
  const failed = last?.status && /fail|error|stop|cancel/i.test(String(last.status))

  const chartData = [
    ...sells.map(r => ({ ...r, group: 'Sell' })),
    ...buys.map(r => ({ ...r, group: 'Buy' })),
    ...changes.map(r => ({ ...r, group: 'Change' })),
  ]
    .filter(r => r.ticker)
    .map(r => ({
      name: `${r.ticker}`,
      label: `${r.ticker} · ${r.action ?? r.group}`,
      value: LEVEL[String(r.confidence ?? '').toLowerCase()] ?? 0,
      group: r.group,
    }))

  const colorOf = (g: string) => (g === 'Sell' ? 'var(--bad)' : g === 'Buy' ? 'var(--ok)' : 'var(--accent)')

  const recBlock = (title: string, key: string, list: Rec[]) =>
    list.length > 0
      ? [{ type: 'recommendations', title: `${title} (${list.length})`, data: `picks.${key}`, decide: true }]
      : []

  const blocks = [...recBlock('Sell', 'sells', sells), ...recBlock('New stocks', 'buys', buys), ...recBlock('Change', 'changes', changes)]
  const canDecide = typeof app.decide === 'function'
  const callDate = typeof picks.date === 'string' ? picks.date : undefined

  const card = (rec: Rec, group: 'Buy' | 'Sell' | 'Change', i: number) => {
    const t = String(rec.ticker ?? '')
    const held = holdings.find(h => sameTicker(h, t))
    const order = orderLine(rec, group, held)
    const r = callDate && !rec.date ? { ...rec, date: callDate } : rec
    const choice = canDecide ? app.decisionOf(rec) : null
    const pill = group === 'Sell' ? 'var(--bad)' : group === 'Buy' ? 'var(--ok)' : 'var(--accent)'
    return (
      <div key={`${t}-${i}`} style={{ border: `1px solid ${choice === 'accepted' ? 'var(--ok)' : 'var(--line)'}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, opacity: choice === 'declined' ? 0.6 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setDetail({ ticker: t, rec: r })}
            title={`Show ${t} details and top news`}
            style={{ all: 'unset', cursor: 'pointer', fontSize: 18, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 2, borderBottom: '1px dashed var(--muted)' }}
          >
            {t || '?'}<ChevronRight size={14} color="var(--muted)" />
          </button>
          <span style={{ background: pill, color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{rec.action ?? group}</span>
          <span style={{ ...muted, marginLeft: 'auto' }}>{rec.confidence ?? ''}</span>
        </div>
        <CompanyName ticker={t} rec={rec as Record<string, unknown>} style={{ fontSize: 13, marginTop: -4 }} />
        <div style={{ borderLeft: `3px solid ${order.tone}`, background: 'rgba(127,127,127,0.08)', borderRadius: 6, padding: '6px 10px', fontWeight: 700, fontSize: 14 }}>
          {order.text}
        </div>
        {rec.reason && <div style={{ fontSize: 14, lineHeight: 1.45 }}>{rec.reason}</div>}
        <div style={muted}>
          Entry {usd(rec.entry)} · Target {usd(rec.target)} {pct(rec.target, rec.entry)} · Stop {usd(rec.stop)} {pct(rec.stop, rec.entry)}
        </div>
        {canDecide && (
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', alignItems: 'center' }}>
            <button className={choice === 'accepted' ? 'button primary' : choice ? 'button' : 'button primary'} onClick={() => app.decide!(rec, choice === 'accepted' ? null : 'accepted')}>
              {choice === 'accepted' ? 'Accepted ✓' : 'Accept'}
            </button>
            <button className="button" onClick={() => app.decide!(rec, choice === 'declined' ? null : 'declined')}>
              {choice === 'declined' ? 'Declined ✓' : 'Decline'}
            </button>
            {choice && <span style={muted}>click again to undo</span>}
          </div>
        )}
      </div>
    )
  }

  const group = (title: string, list: Rec[], g: 'Buy' | 'Sell' | 'Change') =>
    list.length === 0 ? null : (
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...muted, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>{title} ({list.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {list.map((r, i) => card(r, g, i))}
        </div>
      </div>
    )

  return (
    <div className="lu-panel" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 18, background: 'var(--panel)', color: 'var(--text)' }}>
      {/* Refresh controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Refresh recommendations</div>
        {typeof picks.date === 'string' && <div style={muted}>Calls dated {picks.date}</div>}
      </div>

      <div role="radiogroup" style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {OPTIONS.map(o => {
          const on = mode === o.mode
          return (
            <label
              key={o.mode}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, cursor: running ? 'default' : 'pointer',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, opacity: running && !on ? 0.55 : 1,
              }}
            >
              <input type="radio" name="rec-mode" value={o.mode} checked={on} disabled={running} onChange={() => setMode(o.mode)} style={{ marginTop: 3, width: 'auto', flex: 'none' }} />
              <span>
                <span style={{ fontWeight: 600 }}>{o.label}</span>
                <span style={{ ...muted, display: 'block' }}>{o.note}</span>
              </span>
            </label>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button className="button primary" disabled={running} onClick={() => app.run(JOB, { mode })} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <RefreshCw size={14} /> Refresh
        </button>
        {running && (
          <button className="button" onClick={() => app.stop(JOB)} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Square size={12} /> Stop
          </button>
        )}
      </div>

      {/* Progress */}
      {running ? (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Running: {OPTIONS.find(o => o.mode === mode)?.label}
          </div>
          <div style={{ ...muted, marginTop: 4 }}>
            {step ? String(step) : 'Starting…'}
            {started && ` · started ${formatDistanceToNow(started, { addSuffix: true })}`}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: '35%', height: '100%', background: 'var(--accent)', animation: 'lu-indeterminate 1.4s ease-in-out infinite' }} />
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes lu-indeterminate{0%{margin-left:-35%}100%{margin-left:100%}}`}</style>
        </div>
      ) : last ? (
        <div style={{ ...muted, marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          {failed ? <AlertCircle size={13} color="var(--bad)" /> : <CheckCircle2 size={13} color="var(--ok)" />}
          Last run {failed ? String(last.status) : 'finished'}
          {lastFinished && ` ${formatDistanceToNow(lastFinished, { addSuffix: true })}`}
        </div>
      ) : null}

      {/* Summary */}
      <div style={section}>
        {typeof picks.basedOn === 'string' && <div style={{ ...muted, marginBottom: 6 }}>{picks.basedOn}</div>}
        {typeof picks.summary === 'string' ? <Markdown text={picks.summary} /> : <div style={muted}>No calls yet. Pick an option and click Refresh.</div>}
        <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 13 }}>
          <span><b>{buys.length}</b> new</span>
          <span><b>{sells.length}</b> sells</span>
          <span><b>{changes.length}</b> changes</span>
          {typeof picks.cash === 'string' && <span style={{ color: 'var(--muted)' }}>Cash: {picks.cash}</span>}
        </div>
      </div>

      {/* Confidence chart */}
      {chartData.length > 0 && (
        <div style={section}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            Confidence per ticker{' '}
            <span style={muted}>
              (<span style={{ color: 'var(--ok)' }}>buy</span> · <span style={{ color: 'var(--bad)' }}>sell</span> · <span style={{ color: 'var(--accent)' }}>change</span>)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(90, chartData.length * 26 + 30)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <XAxis type="number" domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={v => LEVEL_NAME[v] ?? ''} stroke="var(--muted)" fontSize={11} />
              <YAxis type="category" dataKey="name" width={56} stroke="var(--muted)" fontSize={11} />
              <Tooltip
                cursor={{ fill: 'rgba(127,127,127,0.08)' }}
                formatter={(v: number) => [LEVEL_NAME[v] || 'no data', 'Confidence']}
                labelFormatter={(_l, p) => (p?.[0]?.payload?.label as string) ?? ''}
                contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)' }}
              />
              <Bar dataKey="value" barSize={14} radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={colorOf(d.group)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calls with Accept / Decline */}
      {blocks.length > 0 && (
        <div style={section}>
          {canDecide ? (
            <>
              {group('Sell', sells, 'Sell')}
              {group('New stocks', buys, 'Buy')}
              {group('Change', changes, 'Change')}
              <div style={muted}>Click a ticker for its details and top news. Prices are limit prices from the last fetch; check them before you place an order.</div>
            </>
          ) : (
            <Blocks blocks={blocks} />
          )}
        </div>
      )}

      {detail && <TickerDetail ticker={detail.ticker} rec={detail.rec} data={app.data as AnyObj} onClose={() => setDetail(null)} />}
    </div>
  )
}
