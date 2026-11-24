/** Shared helpers for the income sleeve (Treasury bill funds) and the 13-week T-bill yield. */

export const SLEEVE_FUNDS: Record<string, string> = {
  SGOV: 'iShares 0-3 Month Treasury Bond ETF',
  BIL: 'SPDR Bloomberg 1-3 Month T-Bill ETF',
  USFR: 'WisdomTree Floating Rate Treasury Fund',
  SHV: 'iShares Short Treasury Bond ETF',
}

export const isSleeve = (rec: { ticker?: unknown; sleeve?: unknown } | null | undefined): boolean =>
  !!rec && (rec.sleeve === true || String(rec.ticker ?? '').toUpperCase() in SLEEVE_FUNDS)

export const TBILL_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EIRX?range=1y&interval=1wk'

export type YieldPoint = { date: string; yield: number }
export type YieldSummary = {
  points: YieldPoint[]
  now: number | null
  ago3m: number | null
  ago1y: number | null
  trend: 'rising' | 'falling' | 'flat' | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Parse a Yahoo chart answer for ^IRX. Returns null when the answer has no usable data. */
export function parseYield(raw: unknown): YieldSummary | null {
  const res = (raw as any)?.chart?.result?.[0]
  if (!res) return null
  const ts: number[] = res.timestamp ?? []
  const close: (number | null)[] = res.indicators?.quote?.[0]?.close ?? []
  const points: YieldPoint[] = []
  ts.forEach((t, i) => {
    const c = close[i]
    // ^IRX occasionally reports 0 for empty weeks; skip those so the chart is honest.
    if (typeof c !== 'number' || !isFinite(c) || c <= 0) return
    const d = new Date(t * 1000)
    points.push({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, yield: Math.round(c * 1000) / 1000 })
  })
  const metaNow = res.meta?.regularMarketPrice
  const now = typeof metaNow === 'number' && metaNow > 0 ? metaNow : points.length ? points[points.length - 1].yield : null
  if (now == null && !points.length) return null
  const ago3m = points.length > 13 ? points[points.length - 14].yield : points.length ? points[0].yield : null
  const ago1y = points.length ? points[0].yield : null
  let trend: YieldSummary['trend'] = null
  if (now != null && ago3m != null) trend = now - ago3m > 0.1 ? 'rising' : ago3m - now > 0.1 ? 'falling' : 'flat'
  return { points, now, ago3m, ago1y, trend }
}

export const fmtPct = (v: number | null | undefined, digits = 2) => (typeof v === 'number' && isFinite(v) ? `${v.toFixed(digits)}%` : 'no data')
export const fmtUsd = (v: number | null | undefined, sign = false) => {
  if (typeof v !== 'number' || !isFinite(v)) return 'no data'
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${v < 0 ? '−' : sign && v > 0 ? '+' : ''}$${s}`
}
