import type { CSSProperties, ReactNode } from 'react'
import { useMemo } from 'react'
import { useFetch, usePanelState, Chart } from '@neovai/panel'
import { jewelFlags, parseStats, statsUrl, type StatId, type Stats } from './lib/holdings'
import { usePage } from './lib/useQuotes'

const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }
const box: CSSProperties = { border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginTop: 10 }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '8px 12px', marginTop: 6 }
const TONE = { good: 'var(--ok)', bad: 'var(--bad)', neutral: 'var(--muted)' }

export type LongRange = '1Y' | '2Y' | '5Y' | '10Y' | 'Max'
export const LONG_RANGES: Record<LongRange, { range: string; interval: string; fast: number; slow: number; unit: string }> = {
  '1Y': { range: '1y', interval: '1d', fast: 50, slow: 200, unit: 'day' },
  '2Y': { range: '2y', interval: '1d', fast: 50, slow: 200, unit: 'day' },
  '5Y': { range: '5y', interval: '1wk', fast: 10, slow: 40, unit: 'week' },
  '10Y': { range: '10y', interval: '1wk', fast: 10, slow: 40, unit: 'week' },
  'Max': { range: 'max', interval: '1mo', fast: 3, slow: 10, unit: 'month' },
}

/** Moving average of `close` over `n` bars, null until there are enough bars. */
export function withAverages<T extends { close: number }>(rows: T[], fast: number, slow: number): (T & { fastAvg: number | null; slowAvg: number | null })[] {
  let sf = 0, ss = 0
  return rows.map((r, i) => {
    sf += r.close; ss += r.close
    if (i >= fast) sf -= rows[i - fast].close
    if (i >= slow) ss -= rows[i - slow].close
    return { ...r, fastAvg: i >= fast - 1 ? +(sf / fast).toFixed(4) : null, slowAvg: i >= slow - 1 ? +(ss / slow).toFixed(4) : null }
  })
}

export function yahooRows(data: unknown, intraday = false) {
  const res = (data as any)?.chart?.result?.[0]
  if (!res) return null
  const ts: number[] = res.timestamp ?? []
  const q = res.indicators?.quote?.[0] ?? {}
  const rows: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = []
  const off = Number(res.meta?.gmtoffset ?? 0)
  ts.forEach((t, i) => {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i]
    if ([o, h, l, c].some((x) => typeof x !== 'number' || !isFinite(x))) return
    const iso = new Date((t + off) * 1000).toISOString()
    rows.push({ date: intraday ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10), open: o, high: h, low: l, close: c, volume: typeof v === 'number' ? v : 0 })
  })
  return { rows, meta: res.meta ?? {} }
}

/** Price history from 1 to 10+ years with its two moving averages, so the long trend is visible at a glance. */
export function PriceHistory({ ticker, height = 220 }: { ticker: string; height?: number }) {
  const [key, setKey] = usePanelState<LongRange>('priceHistory.range', '5Y')
  const r = LONG_RANGES[key] ?? LONG_RANGES['5Y']
  const { data, error, loading } = useFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${r.range}&interval=${r.interval}`, 0)
  const parsed = useMemo(() => yahooRows(data), [data])
  const rows = useMemo(() => (parsed ? withAverages(parsed.rows, r.fast, r.slow) : []), [parsed, r.fast, r.slow])
  const first = rows[0]?.close, last = rows[rows.length - 1]?.close
  const years = rows.length > 1 ? (Date.parse(rows[rows.length - 1].date) - Date.parse(rows[0].date)) / (365.25 * 86400_000) : 0
  const cagr = first && last && years >= 1 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null
  const chg = first && last ? ((last - first) / first) * 100 : null
  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13 }}>Price history</b>
        {chg != null && <span style={{ fontSize: 12, color: chg >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{chg >= 0 ? '+' : ''}{chg.toFixed(1)}% over {key}{cagr != null ? ` · ${cagr.toFixed(1)}% a year` : ''}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(Object.keys(LONG_RANGES) as LongRange[]).map((k) => (
            <button key={k} className={k === key ? 'button primary' : 'button'} onClick={() => setKey(k)} style={{ padding: '2px 8px', fontSize: 11 }}>{k}</button>
          ))}
        </span>
      </div>
      {error ? <div style={{ ...muted, padding: 20 }}>Couldn't load prices (no data).</div>
        : !parsed ? <div style={{ ...muted, padding: 20 }}>{loading ? 'Loading…' : 'no data'}</div>
        : <Chart kind="line" rows={rows} x="date" y={['close', 'fastAvg', 'slowAvg']} height={height} />}
      <div style={{ ...muted, fontSize: 11 }}>Lines: close, {r.fast}-{r.unit} and {r.slow}-{r.unit} averages · Yahoo Finance</div>
    </div>
  )
}

const GROUPS: { title: string; items: [StatId, string][] }[] = [
  { title: 'Valuation', items: [['marketcap', 'Market cap'], ['pe', 'P/E'], ['peForward', 'Forward P/E'], ['pegRatio', 'PEG'], ['pfcf', 'P/FCF'], ['evEbitda', 'EV/EBITDA']] },
  { title: 'Quality', items: [['roic', 'ROIC'], ['roe', 'ROE'], ['grossMargin', 'Gross margin'], ['operatingMargin', 'Op. margin'], ['fcfYield', 'FCF yield'], ['debtEbitda', 'Debt/EBITDA'], ['debtEquity', 'Debt/Equity'], ['fScore', 'Piotroski F'], ['zScore', 'Altman Z']] },
  { title: 'Risk and momentum', items: [['beta', 'Beta (5Y)'], ['rsi', 'RSI (14)'], ['sma50', '50-day avg'], ['sma200', '200-day avg'], ['ch1y', '1-year change'], ['shortFloat', 'Short % float'], ['averageVolume', 'Avg volume']] },
  { title: 'Who follows it', items: [['analystCount', 'Analysts'], ['analystRatings', 'Consensus'], ['priceTarget', 'Price target'], ['sharesInstitutions', 'Institutions'], ['sharesInsiders', 'Insiders']] },
  { title: 'Growth and income', items: [['revenue3y', 'Revenue 3Y fcst'], ['eps3y', 'EPS 3Y fcst'], ['dividendYield', 'Dividend yield'], ['dividendGrowthYears', 'Div. growth yrs'], ['earningsdate', 'Next earnings']] },
]

function Stat({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value ?? <span style={muted}>no data</span>}</div>
    </div>
  )
}

export function useStats(ticker: string | null) {
  return usePage<Stats>(ticker ? statsUrl(ticker) : null, parseStats)
}

/** Valuation, quality, risk, ownership and growth for a stock, with the hidden-jewel checks as colored chips. */
export default function KeyStats({ ticker, price }: { ticker: string; price?: number | null }) {
  const st = useStats(ticker)
  const s = st.data ?? {}
  const flags = jewelFlags(s, price ?? null)
  const empty = !st.loading && Object.keys(s).length === 0
  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <b style={{ fontSize: 13 }}>Key stats</b>
        <span style={{ ...muted, fontSize: 11 }}>stockanalysis.com{st.loading ? ' · loading…' : ''}</span>
      </div>
      {empty ? (
        <div style={{ ...muted, marginTop: 6 }}>{st.error ? `Couldn't load stats (${st.error}).` : 'No stats for this symbol (funds and indexes have none).'}</div>
      ) : (
        <>
          {flags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {flags.map((f) => (
                <span key={f.label} style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, color: TONE[f.tone], border: `1px solid ${TONE[f.tone]}`, opacity: f.tone === 'neutral' ? 0.8 : 1 }}>{f.label}</span>
              ))}
            </div>
          )}
          {GROUPS.map((g) => (
            <div key={g.title} style={{ marginTop: 10 }}>
              <div style={{ ...muted, fontWeight: 700 }}>{g.title}</div>
              <div style={grid}>{g.items.map(([id, label]) => <Stat key={id} label={label} value={s[id]} />)}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
