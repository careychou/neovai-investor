import './fullWidth.css'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { useApp, usePanelState, resolveData, Markdown } from '@neovai/panel'
import { RefreshCw, ShoppingCart, CalendarDays, TrendingUp, Users } from 'lucide-react'
import { useQuotes } from './lib/useQuotes'
import { SEGMENTS, segmentName, avg } from './lib/retail'
import { TickerDetail } from './RecommendationsPanel'
import RetailDigest from './RetailDigest'

type AnyObj = Record<string, any>
const asObjs = (v: unknown): AnyObj[] => (Array.isArray(v) ? (v as AnyObj[]) : [])
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null)

const GREEN = 'var(--ok, #22a06b)'
const RED = 'var(--bad, #e5484d)'
const AMBER = '#e0a030'
const BORDER = '1px solid var(--line)'
const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }
const box: CSSProperties = { border: BORDER, borderRadius: 12, overflow: 'hidden', marginTop: 14 }
const head: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: BORDER, background: 'rgba(127,127,127,0.05)', fontWeight: 700, fontSize: 13 }
const tone = (v: number | null) => (v == null || Math.abs(v) < 0.005 ? undefined : v > 0 ? GREEN : RED)
const pct = (v: number | null) => (v == null ? 'no data' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`)
const IMPACT: Record<string, string> = { good: GREEN, bad: RED, neutral: 'var(--muted)' }
const LEVEL: Record<string, string> = { bad: RED, warn: AMBER, good: GREEN, info: 'var(--accent)' }
const MOOD: Record<string, string> = { strong: GREEN, mixed: AMBER, weak: RED }

function Tick({ t, onOpen }: { t: string; onOpen: (t: string) => void }) {
  return <button onClick={() => onOpen(t)} title={`Open ${t}`} style={{ all: 'unset', cursor: 'pointer', fontWeight: 700, borderBottom: '1px dashed var(--muted)' }}>{t}</button>
}

export default function RetailPanel() {
  const app = useApp() as any
  const data = app.data as AnyObj
  const r: AnyObj | null = data?.retail ?? null
  const [seg, setSeg] = usePanelState<string>('retail.segment', 'all')
  const [open, setOpen] = useState<string | null>(null)
  const [view, setView] = usePanelState<'market' | 'digest'>('retail.view', 'market')
  const digestCount = r?.digest ? asObjs(r.digest.top).length + asObjs(r.digest.lanes).reduce((n, l) => n + asObjs(l.items).length, 0) : 0

  const allTickers = useMemo(() => SEGMENTS.flatMap((s) => s.tickers), [])
  const { quotes, loading, reload } = useQuotes(allTickers)

  const news = asObjs(r?.news).filter((n) => seg === 'all' || n.segment === seg)
  const counts: Record<string, number> = {}
  for (const n of asObjs(r?.news)) counts[n.segment] = (counts[n.segment] ?? 0) + 1
  const saved: Record<string, AnyObj> = Object.fromEntries(asObjs(r?.segments).map((s) => [s.key, s]))
  const moodText = String(r?.mood ?? '')
  const moodLabel = (['strong', 'mixed', 'weak'].find((m) => moodText.toLowerCase().startsWith(m)) ?? '')
  const stale = r?.date && r.date < new Date().toISOString().slice(0, 10)

  return (
    <div className="lu-block">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {r ? (
            <>
              <div style={{ fontSize: 14 }}>
                {moodLabel && <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#fff', background: MOOD[moodLabel], marginRight: 8, textTransform: 'uppercase' }}>Retail {moodLabel}</span>}
                {moodText.replace(/^(strong|mixed|weak)\s*[:\-–—]?\s*/i, '')}
              </div>
              {r.summary && <div style={{ marginTop: 6, fontSize: 13.5 }}><Markdown text={String(r.summary)} /></div>}
            </>
          ) : (
            <div style={muted}>No retail scan yet. Click “Run retail scan” above to collect today's retail news, shopper data and dates.</div>
          )}
        </div>
        <div style={{ ...muted, textAlign: 'right' }}>
          {r?.asOf ? `Scan of ${new Date(r.asOf).toLocaleString()}` : r?.date ? `Scan of ${r.date}` : ''}
          {stale && <div style={{ color: RED, fontWeight: 600 }}>Older than today</div>}
        </div>
      </div>

      {/* View switch */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14, borderBottom: BORDER, paddingBottom: 8 }}>
        <button className={view === 'market' ? 'button primary' : 'button'} onClick={() => setView('market')}>Retail market</button>
        <button className={view === 'digest' ? 'button primary' : 'button'} onClick={() => setView('digest')}>3-day digest{digestCount ? ` · ${digestCount}` : ''}</button>
      </div>

      {view === 'digest' ? <div style={{ marginTop: 10 }}><RetailDigest digest={r?.digest} /></div> : <>
      {/* Segment cards with live prices */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Segments today <span style={{ ...muted, fontWeight: 400 }}>· live prices, average day change · click a card to filter the news</span></span>
        <button className="button" onClick={reload} disabled={loading} style={{ fontSize: 12, padding: '3px 10px' }}><RefreshCw size={12} style={{ verticalAlign: -2 }} /> {loading ? 'Updating…' : 'Refresh prices'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10, marginTop: 8 }}>
        {SEGMENTS.map((s) => {
          const rows = s.tickers.map((t) => ({ t, c: num(quotes[t]?.dayChangePct), p: num(quotes[t]?.price) }))
          const a = avg(rows.map((x) => x.c))
          const active = seg === s.key
          return (
            <div key={s.key} onClick={() => setSeg(active ? 'all' : s.key)}
              style={{ border: active ? '1px solid var(--accent)' : BORDER, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: active ? 'rgba(59,130,246,0.08)' : 'rgba(127,127,127,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                <span style={{ fontWeight: 700, color: tone(a), fontVariantNumeric: 'tabular-nums' }}>{a == null ? (loading ? '…' : 'no data') : pct(a)}</span>
              </div>
              <div style={muted}>{s.blurb}{counts[s.key] ? ` · ${counts[s.key]} news` : ''}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', marginTop: 6, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                {rows.map((x) => (
                  <span key={x.t} onClick={(e) => { e.stopPropagation(); setOpen(x.t) }} title={x.p != null ? `$${x.p.toFixed(2)}` : 'no data'} style={{ cursor: 'pointer' }}>
                    <b>{x.t}</b> <span style={{ color: tone(x.c) }}>{x.c == null ? '—' : pct(x.c)}</span>
                  </span>
                ))}
              </div>
              {saved[s.key]?.note && <div style={{ ...muted, marginTop: 6 }}>{String(saved[s.key].note)}</div>}
            </div>
          )
        })}
      </div>

      {/* Alerts */}
      {asObjs(r?.alerts).length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          {asObjs(r?.alerts).map((a, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${LEVEL[a.level] ?? 'var(--line)'}`, padding: '4px 10px', fontSize: 13 }}>{String(a.text ?? '')}</div>
          ))}
        </div>
      )}

      {/* News */}
      <section style={box}>
        <div style={head}>
          <ShoppingCart size={14} /> Retail news
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ key: 'all', name: 'All' }, ...SEGMENTS].filter((s) => s.key === 'all' || counts[s.key]).map((s) => (
              <button key={s.key} className={seg === s.key ? 'button primary' : 'button'} onClick={() => setSeg(s.key)} style={{ fontSize: 12, padding: '2px 9px', fontWeight: 500 }}>
                {s.name}{s.key === 'all' ? ` ${asObjs(r?.news).length}` : ` ${counts[s.key]}`}
              </button>
            ))}
          </span>
        </div>
        {news.length === 0 ? (
          <div style={{ padding: 16, ...muted }}>{r ? 'No news in this segment from the last scan.' : 'Run the retail scan to see the news.'}</div>
        ) : (
          <div>
            {news.map((n, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: i < news.length - 1 ? BORDER : undefined, borderLeft: `3px solid ${IMPACT[n.impact] ?? 'transparent'}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ ...muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{segmentName(n.segment)}</span>
                  {n.url ? <a href={n.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: 'var(--text)' }}>{String(n.headline ?? '')}</a> : <b>{String(n.headline ?? '')}</b>}
                  {Array.isArray(n.tickers) && n.tickers.filter((t: unknown) => typeof t === 'string' && t).map((t: string) => <span key={t} style={{ fontSize: 12 }}><Tick t={t} onOpen={setOpen} /></span>)}
                </div>
                {n.why && <div style={{ fontSize: 13, marginTop: 3 }}>{String(n.why)}</div>}
                <div style={{ ...muted, marginTop: 3 }}>
                  {[n.source, n.time].filter(Boolean).join(' · ')}
                  {n.impact && n.impact !== 'neutral' && <span style={{ color: IMPACT[n.impact], marginLeft: 8, fontWeight: 600 }}>{n.impact === 'good' ? 'Good for the stocks named' : 'Bad for the stocks named'}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Your holdings */}
      {asObjs(r?.yours).length > 0 && (
        <section style={box}>
          <div style={head}><Users size={14} /> What it means for your stocks</div>
          <div style={{ padding: '6px 14px' }}>
            {asObjs(r?.yours).map((y, i) => (
              <div key={i} style={{ padding: '6px 0', fontSize: 13, display: 'flex', gap: 10 }}>
                <span style={{ minWidth: 54 }}><Tick t={String(y.ticker)} onOpen={setOpen} /></span>
                <span style={{ color: IMPACT[y.impact] ?? undefined, fontWeight: 600, minWidth: 60, fontSize: 12 }}>{y.impact ?? ''}</span>
                <span>{String(y.note ?? '')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* Calendar */}
        <section style={box}>
          <div style={head}><CalendarDays size={14} /> Coming up</div>
          {asObjs(r?.calendar).length === 0 ? <div style={{ padding: 14, ...muted }}>No dates saved yet.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {asObjs(r?.calendar).map((c, i) => (
                  <tr key={i} style={{ borderBottom: BORDER }}>
                    <td style={{ padding: '7px 14px', whiteSpace: 'nowrap', ...muted }}>{String(c.date ?? '')}</td>
                    <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{c.ticker ? <Tick t={String(c.ticker)} onOpen={setOpen} /> : '—'}</td>
                    <td style={{ padding: '7px 14px 7px 6px' }}>{String(c.event ?? '')}{c.note && <div style={muted}>{String(c.note)}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Shopper data */}
        <section style={box}>
          <div style={head}><TrendingUp size={14} /> Shopper and price data</div>
          {asObjs(r?.shopper).length === 0 ? <div style={{ padding: 14, ...muted }}>No data saved yet.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, padding: 12 }}>
              {asObjs(r?.shopper).map((s, i) => (
                <div key={i} style={{ border: BORDER, borderRadius: 8, padding: '8px 10px' }}>
                  <div style={muted}>{String(s.label ?? '')}</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{String(s.value ?? 'no data')}</div>
                  {s.note && <div style={{ ...muted, fontSize: 11 }}>{String(s.note)}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Themes and ideas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <section style={box}>
          <div style={head}>Trends moving retail</div>
          {asObjs(r?.themes).length === 0 ? <div style={{ padding: 14, ...muted }}>No trends saved yet.</div> : (
            <div style={{ padding: '6px 14px' }}>
              {asObjs(r?.themes).map((t, i) => (
                <div key={i} style={{ padding: '6px 0', fontSize: 13 }}><b>{String(t.title ?? '')}</b>: {String(t.why ?? '')} {t.source && <span style={muted}>({String(t.source)})</span>}</div>
              ))}
            </div>
          )}
        </section>
        <section style={box}>
          <div style={head}>Worth a closer look</div>
          {asObjs(r?.ideas).length === 0 ? <div style={{ padding: 14, ...muted }}>No ideas saved yet.</div> : (
            <div style={{ padding: '6px 14px' }}>
              {asObjs(r?.ideas).map((d, i) => (
                <div key={i} style={{ padding: '6px 0', fontSize: 13 }}>
                  <Tick t={String(d.ticker)} onOpen={setOpen} /> {d.name && <span style={muted}>{String(d.name)} · {segmentName(d.segment)}</span>}
                  <div>{String(d.reason ?? '')}</div>
                </div>
              ))}
              <div style={{ ...muted, padding: '4px 0 6px' }}>Information only. These reach the watch list only through the market scan.</div>
            </div>
          )}
        </section>
      </div>

      </>}

      <div style={{ ...muted, marginTop: 10 }}>Segment prices are live from Yahoo Finance (refresh every 5 minutes); news, data and dates come from the last retail scan. Click any ticker for what the company does, its chart and key stats.</div>

      {open && <TickerDetail ticker={open} rec={null} data={data} onClose={() => setOpen(null)} />}
    </div>
  )
}
