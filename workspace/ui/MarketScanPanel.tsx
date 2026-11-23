import type { CSSProperties } from 'react'
import { sortAlerts, showValue, changeDirection, isStale } from '../logic'
import type { MarketScan, Severity, Direction } from '../logic'

const SEVERITY_COLOR: Record<Severity, string> = { high: '#d64545', medium: '#e0a030', low: '#7a8794' }
const MOOD_COLOR = { 'risk-on': '#2e9e5b', mixed: '#e0a030', 'risk-off': '#d64545' } as const
const ARROW: Record<Direction, string> = { up: '▲', down: '▼', mixed: '◆' }
const DIR_COLOR: Record<Direction, string> = { up: '#2e9e5b', down: '#d64545', mixed: '#e0a030' }

const box: CSSProperties = { border: '1px solid rgba(127,127,127,0.3)', borderRadius: 8, padding: 16, margin: '16px 0' }
const h3: CSSProperties = { fontSize: 14, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 }
const tag = (color: string): CSSProperties => ({
  display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
  color: '#fff', background: color, marginRight: 8, textTransform: 'uppercase',
})
const small: CSSProperties = { fontSize: 12, opacity: 0.65 }

export default function MarketScanPanel({ scan }: { scan: MarketScan | null }) {
  if (!scan) {
    return (
      <section className="market-scan" style={box}>
        <h2 style={{ margin: 0 }}>Market scan</h2>
        <p className="muted">No market scan yet. Ask the agent to run the daily scan.</p>
      </section>
    )
  }

  const alerts = sortAlerts(scan.alerts)
  const stale = isStale(scan.asOf)

  return (
    <section className="market-scan" style={box}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Market scan</h2>
        <span style={small}>
          As of {new Date(scan.asOf).toLocaleString()}
          {stale && <b style={{ color: SEVERITY_COLOR.high, marginLeft: 8 }}>Stale: older than 24h</b>}
        </span>
      </div>

      <p style={{ marginTop: 12 }}>
        <span style={tag(MOOD_COLOR[scan.mood.label])}>{scan.mood.label}</span>
        {scan.mood.reason}
      </p>

      {scan.metrics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {scan.metrics.map((m) => {
            const dir = changeDirection(m.change)
            return (
              <div key={m.item} title={`${m.source} · ${m.time}`}
                style={{ border: '1px solid rgba(127,127,127,0.25)', borderRadius: 6, padding: '6px 10px', minWidth: 110 }}>
                <div style={small}>{m.item}</div>
                <b>{showValue(m.value)}</b>{' '}
                <span style={{ fontSize: 12, color: dir ? DIR_COLOR[dir] : undefined }}>
                  {m.change == null ? '' : `${dir ? ARROW[dir] : ''} ${m.change}`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <h3 style={h3}>Important alerts</h3>
      {alerts.length === 0 ? (
        <p className="muted">No alerts.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {alerts.map((a, i) => (
            <li key={i} style={{ borderLeft: `3px solid ${SEVERITY_COLOR[a.severity]}`, padding: '6px 10px', marginBottom: 8 }}>
              <div>
                <span style={tag(SEVERITY_COLOR[a.severity])}>{a.severity}</span>
                <span style={{ ...small, marginRight: 8 }}>{a.kind}</span>
                <b>{a.title}</b>
                {a.tickers?.length ? <span style={{ ...small, marginLeft: 8 }}>{a.tickers.join(', ')}</span> : null}
              </div>
              <div style={{ marginTop: 2 }}>{a.detail}</div>
              <div style={small}>{a.source} · {a.time}</div>
            </li>
          ))}
        </ul>
      )}

      <h3 style={h3}>Trends likely to move the market</h3>
      {scan.trends.length === 0 ? (
        <p className="muted">No trends recorded.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {scan.trends.map((t, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <b style={{ color: DIR_COLOR[t.direction], marginRight: 6 }}>{ARROW[t.direction]}</b>
              <b>{t.title}</b>: {t.why} <span style={small}>({t.source})</span>
            </li>
          ))}
        </ul>
      )}

      {(scan.sectors.leading.length > 0 || scan.sectors.lagging.length > 0) && (
        <p style={{ fontSize: 13 }}>
          <span style={{ color: DIR_COLOR.up }}>Leading:</span> {scan.sectors.leading.join(', ') || 'no data'}
          <span style={{ margin: '0 12px', opacity: 0.4 }}>|</span>
          <span style={{ color: DIR_COLOR.down }}>Lagging:</span> {scan.sectors.lagging.join(', ') || 'no data'}
        </p>
      )}

      <p style={{ ...small, marginTop: 12 }}>Information only, not financial advice. Hover a metric for its source and time.</p>
    </section>
  )
}
