import './fullWidth.css'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useApp, usePanelState, resolveData } from '@neovai/panel'
import { ChevronRight } from 'lucide-react'
import { TickerDetail, CompanyName, BucketBadge } from './RecommendationsPanel'
import { CompanyLine } from './CompanyAbout'

type AnyObj = Record<string, unknown>

const asObjs = (v: unknown): AnyObj[] => (Array.isArray(v) ? (v as AnyObj[]) : [])
const num = (v: unknown): number | null =>
  typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) ? Number(v) : null
const usd = (v: unknown) => {
  const n = num(v)
  return n == null ? 'no data' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const pct = (a: unknown, b: unknown) => {
  const x = num(a), y = num(b)
  if (x == null || y == null || y === 0) return ''
  const p = ((x - y) / y) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
}
const text = (v: unknown) => (v == null || v === '' ? 'no data' : String(v))

const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }
const title: CSSProperties = { ...muted, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', margin: '16px 0 8px' }
const wrap: CSSProperties = { border: '1px solid var(--line)', borderRadius: 10, overflowX: 'auto' }
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th: CSSProperties = { textAlign: 'left', padding: '10px 12px', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', background: 'rgba(127,127,127,0.06)' }
const td: CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--line)', verticalAlign: 'top' }

function TickerCell({ ticker, row, onOpen, about = false }: { ticker: string; row: AnyObj; onOpen: () => void; about?: boolean }) {
  return (
    <td style={{ ...td, minWidth: about ? 220 : 150, maxWidth: about ? 280 : 220 }}>
      <button
        onClick={onOpen}
        title={`Show ${ticker} details and top news`}
        style={{ all: 'unset', cursor: 'pointer', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 2, borderBottom: '1px dashed var(--muted)' }}
      >
        {ticker || '?'}<ChevronRight size={13} color="var(--muted)" />
      </button>
      <div style={{ display: 'flex', marginTop: 2 }}>
        <CompanyName ticker={ticker} rec={row} style={{ fontSize: 12 }} />
      </div>
      {about && <CompanyLine ticker={ticker} row={row} />}
    </td>
  )
}

export default function CandidatesPanel() {
  const app = useApp()
  const data = app.data as AnyObj
  const all = asObjs(resolveData(data, 'candidates.ranked'))
  const [show, setShow] = usePanelState<'all' | 'long' | 'trade'>('candidates.bucket', 'all')
  const isLong = (r: AnyObj) => String(r.bucket ?? '').toLowerCase().startsWith('long')
  const ranked = show === 'all' ? all : all.filter(r => (show === 'long') === isLong(r))
  const nLong = all.filter(isLong).length
  const dropped = asObjs(resolveData(data, 'candidates.dropped'))
  const [open, setOpen] = useState<string | null>(null)

  // If the ticker has a call on the Recommendations screen, show it in the details too.
  const picks = (resolveData(data, 'picks') ?? {}) as AnyObj
  const recOf = (t: string) =>
    [...asObjs(picks.buys), ...asObjs(picks.sells), ...asObjs(picks.changes)].find(r => String(r.ticker ?? '').toUpperCase() === t.toUpperCase()) ?? null

  return (
    <div style={{ color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={title}>Ranked ({ranked.length})</div>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {([['all', `All ${all.length}`], ['long', `Long-term ${nLong}`], ['trade', `Trades ${all.length - nLong}`]] as const).map(([k, label]) => (
            <button key={k} className={show === k ? 'button primary' : 'button'} onClick={() => setShow(k)} style={{ padding: '3px 10px', fontSize: 12 }}>{label}</button>
          ))}
        </span>
      </div>
      {ranked.length === 0 ? (
        <div style={muted}>No candidates passed yet. Click Evaluate candidates.</div>
      ) : (
        <div style={wrap}>
          <table style={table}>
            <thead>
              <tr>
                {['Rank', 'Stock', 'Bucket', 'Price', 'Target', 'Stop', 'Reward / risk', 'Quality', 'Valuation', 'Trend', 'Earnings', 'Why'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const t = String(r.ticker ?? '')
                return (
                  <tr key={`${t}-${i}`}>
                    <td style={td}>{text(r.rank)}</td>
                    <TickerCell ticker={t} row={r} onOpen={() => setOpen(t)} about />
                    <td style={td}><BucketBadge bucket={r.bucket} />{r.horizon != null && <div style={{ ...muted, marginTop: 4 }}>{String(r.horizon)}</div>}{r.hype === true && <div style={{ ...muted, color: 'var(--bad)', marginTop: 4 }}>Hype: quick exit</div>}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{usd(r.price)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{usd(r.target)}<div style={{ ...muted, color: 'var(--ok)' }}>{pct(r.target, r.price)}</div></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{usd(r.stop)}<div style={{ ...muted, color: 'var(--bad)' }}>{pct(r.stop, r.price)}</div></td>
                    <td style={td}>{text(r.rr)}</td>
                    <td style={{ ...td, minWidth: 170 }}>{r.quality == null ? <span style={muted}>{text(r.volume)}</span> : text(r.quality)}</td>
                    <td style={{ ...td, minWidth: 150 }}>{r.valuation == null ? <span style={muted}>—</span> : text(r.valuation)}</td>
                    <td style={{ ...td, minWidth: 140 }}>{text(r.trend)}</td>
                    <td style={{ ...td, minWidth: 180 }}>{text(r.earnings)}</td>
                    <td style={{ ...td, minWidth: 260 }}>{text(r.reason)}{r.thesis != null && <div style={{ ...muted, marginTop: 4 }}>Thesis: {String(r.thesis)}</div>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dropped.length > 0 && (
        <>
          <div style={title}>Dropped ({dropped.length})</div>
          <div style={wrap}>
            <table style={table}>
              <thead>
                <tr>{['Stock', 'Rule that removed it'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {dropped.map((r, i) => {
                  const t = String(r.ticker ?? '')
                  return (
                    <tr key={`${t}-${i}`}>
                      <TickerCell ticker={t} row={r} onOpen={() => setOpen(t)} />
                      <td style={td}>{text(r.rule)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ ...muted, marginTop: 8 }}>Click a ticker for what the company does, its competitors, long-range chart, key stats and top news. Long-term holds follow rules 26 to 32; trades follow the 2% stop rules.</div>

      {open && <TickerDetail ticker={open} rec={recOf(open)} data={data} onClose={() => setOpen(null)} />}
    </div>
  )
}
