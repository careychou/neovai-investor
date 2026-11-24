import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useApp, usePanelState, resolveData } from '@neovai/panel'
import { ChevronRight } from 'lucide-react'
import { TickerDetail, CompanyName, BucketBadge } from './RecommendationsPanel'
import { useQuotes } from './lib/useQuotes'

type AnyObj = Record<string, unknown>
const asObjs = (v: unknown): AnyObj[] => (Array.isArray(v) ? (v as AnyObj[]) : [])
const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }
const th: CSSProperties = { textAlign: 'left', padding: '9px 12px', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', background: 'rgba(127,127,127,0.06)', fontSize: 12 }
const td: CSSProperties = { padding: '9px 12px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', fontSize: 13 }
const num = (v: number | null | undefined, d = 2) => (v == null ? 'no data' : v.toFixed(d))

/** The scan's watch list, split into long-term ideas and trades, with live prices. Click a ticker for chart, key stats and news. */
export default function WatchListPanel() {
  const app = useApp()
  const data = app.data as AnyObj
  const watch = asObjs(resolveData(data, 'market.watch'))
  const [show, setShow] = usePanelState<'all' | 'long' | 'trade'>('watchList.bucket', 'all')
  const [open, setOpen] = useState<string | null>(null)
  const { quotes } = useQuotes(watch.map((w) => String(w.ticker ?? '')).filter(Boolean))
  const isLong = (w: AnyObj) => String(w.bucket ?? '').toLowerCase().startsWith('long')
  const list = show === 'all' ? watch : watch.filter((w) => (show === 'long') === isLong(w))
  const nLong = watch.filter(isLong).length

  return (
    <div className="lu-block" style={{ color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <h3 className="lu-title" style={{ margin: 0 }}>Watch list ({list.length})</h3>
        <span style={muted}>Hidden jewels and quality names for the long-term bucket; liquid movers for trades.</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {([['all', `All ${watch.length}`], ['long', `Long-term ${nLong}`], ['trade', `Trades ${watch.length - nLong}`]] as const).map(([k, label]) => (
            <button key={k} className={show === k ? 'button primary' : 'button'} onClick={() => setShow(k)} style={{ padding: '3px 10px', fontSize: 12 }}>{label}</button>
          ))}
        </span>
      </div>
      {watch.length === 0 ? (
        <div style={muted}>No watch list yet. Run the market scan.</div>
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Stock', 'Bucket', 'Price', 'Day', '52-week range', 'Why it stood out'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((w, i) => {
                const t = String(w.ticker ?? '')
                const q = quotes[t.toUpperCase()]
                const pos = q?.price != null && q.high52 != null && q.low52 != null && q.high52 > q.low52 ? ((q.price - q.low52) / (q.high52 - q.low52)) * 100 : null
                return (
                  <tr key={`${t}-${i}`}>
                    <td style={{ ...td, minWidth: 150 }}>
                      <button onClick={() => setOpen(t)} title={`Show ${t} chart, key stats and news`}
                        style={{ all: 'unset', cursor: 'pointer', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 2, borderBottom: '1px dashed var(--muted)' }}>
                        {t || '?'}<ChevronRight size={13} color="var(--muted)" />
                      </button>
                      <div style={{ display: 'flex', marginTop: 2 }}><CompanyName ticker={t} rec={w} style={{ fontSize: 12 }} /></div>
                    </td>
                    <td style={td}>
                      <BucketBadge bucket={w.bucket ?? 'trade'} />
                      {w.style != null && <div style={{ ...muted, marginTop: 4 }}>{String(w.style)}</div>}
                      {w.hype === true && <div style={{ ...muted, color: 'var(--bad)', marginTop: 4 }}>Hype: trade only</div>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{q?.price != null ? `$${num(q.price)}` : '…'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: q?.dayChangePct == null ? undefined : q.dayChangePct >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
                      {q?.dayChangePct == null ? '' : `${q.dayChangePct >= 0 ? '+' : ''}${q.dayChangePct.toFixed(2)}%`}
                    </td>
                    <td style={{ ...td, minWidth: 140 }}>
                      {pos == null ? <span style={muted}>—</span> : (
                        <div title={`Low $${num(q!.low52)} · high $${num(q!.high52)}`}>
                          <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(127,127,127,0.25)', marginTop: 6 }}>
                            <div style={{ position: 'absolute', left: `calc(${pos}% - 4px)`, top: -2, width: 8, height: 10, borderRadius: 3, background: 'var(--accent)' }} />
                          </div>
                          <div style={{ ...muted, fontSize: 11, display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>${num(q!.low52, 0)}</span><span>${num(q!.high52, 0)}</span></div>
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, minWidth: 260 }}>{String(w.reason ?? '')}{w.thesis != null && <div style={{ ...muted, marginTop: 4 }}>Thesis: {String(w.thesis)}</div>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && <TickerDetail ticker={open} rec={null} data={data} onClose={() => setOpen(null)} />}
    </div>
  )
}
