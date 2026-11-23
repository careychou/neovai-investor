import { useMemo, useState } from 'react'
import { useApp, useFetch, usePanelState, Chart } from '@neovai/panel'

type RangeKey = '1D' | '5D' | '1M' | '6M' | '1Y'

const RANGES: Record<RangeKey, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
}

const GREEN = 'var(--ok)'
const RED = 'var(--bad)'

const isSell = (action: unknown) => typeof action === 'string' && /sell all|sell$|exit|close/i.test(action) && !/part/i.test(action)
const isBuy = (action: unknown) => typeof action === 'string' && /buy/i.test(action)

/** Tickers the user holds: accepted buys, minus ones whose latest accepted call was a full sell. Always ends with SPY. */
function holdingTickers(decisions: any[]): string[] {
  const sorted = [...decisions]
    .filter((d) => d && d.decision === 'accepted' && typeof d.ticker === 'string')
    .sort((a, b) => String(a.at ?? a.date ?? '').localeCompare(String(b.at ?? b.date ?? '')))
  const held = new Map<string, boolean>()
  for (const d of sorted) {
    const t = d.ticker.toUpperCase()
    if (isBuy(d.action)) held.set(t, true)
    else if (isSell(d.action)) held.set(t, false)
  }
  const list = [...held.entries()].filter(([, h]) => h).map(([t]) => t).sort()
  return [...list.filter((t) => t !== 'SPY'), 'SPY']
}

const pad = (n: number) => String(n).padStart(2, '0')
function label(ts: number, intraday: boolean) {
  const d = new Date(ts * 1000)
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return intraday ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day
}

const MARKET = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'TLT', 'GLD', 'USO', 'BTC-USD']
const MARKET_SYMBOL: Record<string, string> = { VIX: '^VIX' }
const clean = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, '')

export default function SymbolChart() {
  const { get } = useApp()
  const decisions = (get('decisions.items') as any[]) ?? []
  const watchRaw = get('market.watch') as any[]
  const [custom, setCustom] = usePanelState<string[]>('symbolChart.custom', [])
  const [draft, setDraft] = useState('')

  const groups = useMemo(() => {
    const seen = new Set<string>()
    const take = (list: string[]) => list.map(clean).filter((t) => t && !seen.has(t) && (seen.add(t), true))
    const held = take(holdingTickers(Array.isArray(decisions) ? decisions : []).filter((t) => t !== 'SPY'))
    const market = take(MARKET)
    const watch = take((Array.isArray(watchRaw) ? watchRaw : []).map((w) => String(w?.ticker ?? '')))
    const mine = take(custom ?? [])
    return [
      { label: 'My holdings', items: held },
      { label: 'Market', items: market },
      { label: 'Scan watch list', items: watch },
      { label: 'Added by me', items: mine },
    ].filter((g) => g.items.length)
  }, [decisions, watchRaw, custom])
  const tickers = useMemo(() => groups.flatMap((g) => g.items), [groups])

  const [picked, setPicked] = usePanelState<string>('symbolChart.ticker', tickers[0] ?? 'SPY')
  const addSymbol = () => {
    const t = clean(draft)
    if (!t) return
    if (!tickers.includes(t)) setCustom([...(custom ?? []), t])
    setPicked(t)
    setDraft('')
  }
  const isCustom = (custom ?? []).map(clean).includes(picked) && tickers.includes(picked)
  const [rangeKey, setRangeKey] = usePanelState<RangeKey>('symbolChart.range', '6M')
  const ticker = tickers.includes(picked) ? picked : tickers[0]
  const r = RANGES[rangeKey] ?? RANGES['6M']
  const intraday = r.interval.endsWith('m') || r.interval.endsWith('h')

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(MARKET_SYMBOL[ticker] ?? ticker)}?range=${r.range}&interval=${r.interval}`
  const { data, error, loading } = useFetch(url, 60)

  const parsed = useMemo(() => {
    const res = (data as any)?.chart?.result?.[0]
    if (!res) return null
    const ts: number[] = res.timestamp ?? []
    const q = res.indicators?.quote?.[0] ?? {}
    const rows: any[] = []
    ts.forEach((t, i) => {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i]
      if ([o, h, l, c].some((x) => typeof x !== 'number' || !isFinite(x))) return
      rows.push({ date: label(t, intraday), open: o, high: h, low: l, close: c, volume: typeof v === 'number' ? v : 0 })
    })
    const meta = res.meta ?? {}
    const last: number | null =
      typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : rows.length ? rows[rows.length - 1].close : null
    // 1D compares with yesterday's close; longer ranges compare with the close before the range began.
    const base: number | null =
      typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : rows.length ? rows[0].open : null
    const changePct = last != null && base ? ((last - base) / base) * 100 : null
    return { rows, last, changePct, currency: meta.currency ?? 'USD' }
  }, [data, intraday])

  const up = parsed?.changePct != null ? parsed.changePct >= 0 : null
  const color = up == null ? 'var(--muted)' : up ? GREEN : RED
  const fetchFailed = !!error || (!loading && data && !parsed)

  return (
    <div className="lu-block" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: 'var(--panel)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <select
          value={ticker}
          onChange={(e) => setPicked(e.target.value)}
          style={{ fontSize: 15, fontWeight: 700, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)' }}
        >
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <form
          onSubmit={(e) => { e.preventDefault(); addSymbol() }}
          style={{ display: 'flex', gap: 4 }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add symbol…"
            style={{ width: 110, fontSize: 13, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)' }}
          />
          <button type="submit" className="button" style={{ padding: '3px 10px', fontSize: 12 }}>Add</button>
          {isCustom && (
            <button
              type="button"
              className="button"
              title={`Remove ${ticker} from the list`}
              onClick={() => { setCustom((custom ?? []).filter((t) => clean(t) !== ticker)); setPicked('SPY') }}
              style={{ padding: '3px 10px', fontSize: 12 }}
            >
              Remove
            </button>
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            {parsed?.last != null ? `$${parsed.last.toFixed(2)}` : fetchFailed ? 'no data' : '…'}
          </span>
          {parsed?.changePct != null && (
            <span style={{ fontSize: 14, fontWeight: 600, color }}>
              {up ? '▲' : '▼'} {up ? '+' : '−'}{Math.abs(parsed.changePct).toFixed(2)}%
              <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>
                {rangeKey === '1D' ? 'today' : rangeKey}
              </span>
            </span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <button
              key={k}
              className={k === rangeKey ? 'button primary' : 'button'}
              onClick={() => setRangeKey(k)}
              style={{ padding: '3px 10px', fontSize: 12 }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {fetchFailed ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>
          Couldn't load prices for {ticker} right now (no data). It will retry within a minute.
        </div>
      ) : !parsed ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>Loading {ticker}…</div>
      ) : parsed.rows.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>No price bars for {ticker} in this range (no data).</div>
      ) : rangeKey === '1D' ? (
        <Chart kind="line" rows={parsed.rows} x="date" y="close" height={300} />
      ) : (
        <Chart kind="candlestick" rows={parsed.rows} x="date" volume height={340} />
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
        Live from Yahoo Finance · refreshes every 60 seconds{loading ? ' · updating…' : ''}
      </div>
    </div>
  )
}
