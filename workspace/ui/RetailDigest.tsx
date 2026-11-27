import type { CSSProperties } from 'react'
import { usePanelState } from '@neovai/panel'

type AnyObj = Record<string, any>
const asObjs = (v: unknown): AnyObj[] => (Array.isArray(v) ? (v as AnyObj[]) : [])
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Section colours and glyphs, one per lane. */
const LANES: Record<string, { name: string; bg: string; fg: string; glyph: string }> = {
  top: { name: 'Top 3 for retail', bg: '#dbeafe', fg: '#1e40af', glyph: '★' },
  retail: { name: 'Grocery & Retail', bg: '#ede9fe', fg: '#5b21b6', glyph: '▲' },
  tech: { name: 'Technology', bg: '#cffafe', fg: '#155e75', glyph: '■' },
  data: { name: 'Analytics, Data Science & ML', bg: '#fef3c7', fg: '#92400e', glyph: '◆' },
  ai: { name: 'AI: Frontier & Applications', bg: '#dcfce7', fg: '#166534', glyph: '●' },
  design: { name: 'Design & Human-AI Experience', bg: '#fee2e2', fg: '#9f1239', glyph: '○' },
}
const ORDER = ['retail', 'tech', 'data', 'ai', 'design']

const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }
const tile: CSSProperties = { border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', background: 'var(--panel)', margin: '8px 0' }

const fmtDay = (d: string) => {
  const t = new Date(`${d}T12:00:00`)
  return isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }

function Stat({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '14px 8px', border: '1px solid var(--line)', borderRadius: 10, background: 'rgba(127,127,127,0.05)' }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: color ?? 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Pill({ lane, count }: { lane: string; count: number }) {
  const l = LANES[lane] ?? { name: lane, bg: '#e5e7eb', fg: '#374151' }
  return (
    <div style={{ margin: '18px 0 4px' }}>
      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 100, background: l.bg, color: l.fg, fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>
        {l.name} · {count}
      </span>
    </div>
  )
}

function Item({ it, lane, top }: { it: AnyObj; lane: string; top?: boolean }) {
  const l = LANES[lane] ?? LANES.retail
  const url = str(it.url)
  const extra = (Array.isArray(it.sources) ? it.sources : []).map(str).filter((u: string) => u && u !== url)
  return (
    <div style={tile}>
      <span style={{ color: l.fg, fontSize: 13 }}>{l.glyph}</span>{' '}
      {url
        ? <a href={url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none', fontSize: 15 }}>{str(it.headline)}</a>
        : <b style={{ fontSize: 15 }}>{str(it.headline)}</b>}
      {top && it.lane && LANES[it.lane] && <span style={{ ...muted, marginLeft: 8, fontSize: 11 }}>{LANES[it.lane].name}</span>}
      {str(it.body) && <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6 }}>{str(it.body)}</div>}
      {top && str(it.angle) && (
        <div style={{ marginTop: 8 }}>
          <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 100, background: LANES.top.bg, color: LANES.top.fg, marginRight: 6 }}>Retail angle</span>
          <span style={{ fontSize: 13.5 }}>{str(it.angle)}</span>
        </div>
      )}
      <div style={{ ...muted, marginTop: 6 }}>
        {[host(url), str(it.date) && fmtDay(str(it.date))].filter(Boolean).join(' · ')}
        {extra.length > 0 && <> · also: {extra.slice(0, 3).map((u: string, i: number) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }}>{host(u) || 'source'}{i < Math.min(extra.length, 3) - 1 ? ', ' : ''}</a>
        ))}</>}
      </div>
    </div>
  )
}

/** The five-lane news digest saved by the retail scan, in the tile and stat layout. */
export default function RetailDigest({ digest }: { digest: AnyObj | null | undefined }) {
  const [laneFilter, setLaneFilter] = usePanelState<string>('retail.digestLane', 'all')
  const [showDropped, setShowDropped] = usePanelState<boolean>('retail.digestDropped', false)

  if (!digest) {
    return <div style={{ ...muted, padding: '12px 0' }}>No digest yet. Click “Run news scan” for a 3-day digest across retail, technology, data, AI and design.</div>
  }
  const top = asObjs(digest.top)
  const lanes: Record<string, AnyObj[]> = {}
  // A top story is also listed in its lane (newer scans save it there too); never show or count it twice.
  const key = (it: AnyObj) => (str(it.url) || str(it.headline)).toLowerCase()
  const topKeys = new Set(top.map(key))
  for (const l of asObjs(digest.lanes)) lanes[str(l.key)] = asObjs(l.items).filter((it) => !topKeys.has(key(it)))
  const total = top.length + ORDER.reduce((n, k) => n + (lanes[k]?.length ?? 0), 0)
  const covered = ORDER.filter((k) => (lanes[k]?.length ?? 0) > 0 || top.some((t) => t.lane === k)).length
  const dropped = asObjs(digest.dropped)
  const shown = laneFilter === 'all' ? ORDER : ORDER.filter((k) => k === laneFilter)

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Retail, Tech, AI & Design Digest{digest.windowEnd ? ` · ${fmtDay(str(digest.windowEnd))}` : ''}</div>
          {digest.windowStart && digest.windowEnd && <div style={muted}>Covers {fmtDay(str(digest.windowStart))} – {fmtDay(str(digest.windowEnd))} · each story confirmed by two or more outlets · sources linked</div>}
        </div>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...ORDER].map((k) => (
            <button key={k} className={laneFilter === k ? 'button primary' : 'button'} onClick={() => setLaneFilter(k)} style={{ fontSize: 11.5, padding: '2px 9px' }}>
              {k === 'all' ? 'All' : LANES[k].name.split(/[,:&]/)[0].trim()}
            </button>
          ))}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0 4px' }}>
        <Stat value={total} label="Stories tracked" />
        <Stat value={top.length} label="Top picks for retail" color="#2563eb" />
        <Stat value={covered} label="Lanes covered of 5" />
      </div>

      {laneFilter === 'all' && (
        <>
          <Pill lane="top" count={top.length} />
          {top.length === 0 ? <div style={{ ...tile, ...muted }}>Nothing material this window.</div> : top.map((it, i) => <Item key={i} it={it} lane={it.lane ?? 'retail'} top />)}
        </>
      )}

      {shown.map((k) => {
        const items = lanes[k] ?? []
        const topHere = top.filter((t) => t.lane === k)
        const showTop = laneFilter === k
        return (
          <div key={k}>
            <Pill lane={k} count={items.length + topHere.length} />
            {showTop && topHere.map((it, i) => <Item key={`t${i}`} it={it} lane={k} top />)}
            {!showTop && topHere.length > 0 && <div style={{ ...muted, margin: '4px 0' }}>+ {topHere.length} in Top 3 above</div>}
            {items.length + topHere.length === 0
              ? <div style={{ ...tile, ...muted }}>Nothing material this window.</div>
              : items.map((it, i) => <Item key={i} it={it} lane={k} />)}
          </div>
        )
      })}

      {dropped.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowDropped(!showDropped)} style={{ all: 'unset', cursor: 'pointer', ...muted }}>
            {showDropped ? '▾' : '▸'} {dropped.length} candidate{dropped.length > 1 ? 's' : ''} left out (could not verify)
          </button>
          {showDropped && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5 }}>
              {dropped.map((d, i) => <li key={i}>{str(d.headline)} <span style={muted}>· {str(d.why)}</span></li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
