/** Shape of the market scan the `market-scan` skill writes to ui/marketScanData.ts. */

export type Mood = 'risk-on' | 'mixed' | 'risk-off'
export type Severity = 'high' | 'medium' | 'low'
export type AlertKind = 'macro' | 'earnings' | 'mover' | 'halt' | 'rating' | 'news'
export type Direction = 'up' | 'down' | 'mixed'

export interface ScanMetric {
  item: string
  /** Value as fetched, e.g. "5,912.40". null means the fetch failed: show "no data". */
  value: string | null
  /** Change as fetched, e.g. "+0.8%". null means no data. */
  change: string | null
  source: string
  /** Time the value was read, e.g. "2026-11-22 09:45 ET". */
  time: string
}

export interface ScanAlert {
  severity: Severity
  kind: AlertKind
  title: string
  /** Plain-English reason this can move the market. */
  detail: string
  tickers?: string[]
  source: string
  time: string
}

export interface ScanTrend {
  title: string
  direction: Direction
  /** Plain-English reason the trend is likely to move the market. */
  why: string
  source: string
}

export interface MarketScan {
  /** ISO timestamp of the scan. */
  asOf: string
  mood: { label: Mood; reason: string }
  metrics: ScanMetric[]
  alerts: ScanAlert[]
  trends: ScanTrend[]
  sectors: { leading: string[]; lagging: string[] }
  watchList: { ticker: string; reason: string }[]
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

/** Alerts sorted high → low severity, keeping the original order within a level. */
export function sortAlerts(alerts: ScanAlert[]): ScanAlert[] {
  return alerts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => SEVERITY_RANK[x.a.severity] - SEVERITY_RANK[y.a.severity] || x.i - y.i)
    .map(({ a }) => a)
}

/** Show a fetched value, or "no data" when it is missing. Never invents a number. */
export function showValue(v: string | null | undefined): string {
  return v == null || v.trim() === '' ? 'no data' : v
}

/** Direction of a change string such as "+0.8%" or "-1.2%". */
export function changeDirection(change: string | null | undefined): Direction | null {
  if (change == null) return null
  const n = parseFloat(change.replace(/[^0-9.+-]/g, ''))
  if (Number.isNaN(n)) return null
  return n > 0 ? 'up' : n < 0 ? 'down' : 'mixed'
}

/** True when the scan is older than maxHours (default 24) or the timestamp is bad. */
export function isStale(asOf: string, now: Date = new Date(), maxHours = 24): boolean {
  const t = Date.parse(asOf)
  if (Number.isNaN(t)) return true
  return now.getTime() - t > maxHours * 3600_000
}
