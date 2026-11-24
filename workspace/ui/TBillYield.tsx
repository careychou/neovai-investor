import { useMemo } from 'react'
import { useFetch, useApp } from '@neovai/panel'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Landmark } from 'lucide-react'
import { TBILL_URL, parseYield, fmtPct } from './lib/tbill'

/** Live 13-week T-bill yield with a 1-year trend chart. Used on Market Scan and inside the Performance income section. */
export function TBillYieldCard({ compact = false }: { compact?: boolean }) {
  const { data, error, loading } = useFetch(TBILL_URL, 300)
  const y = useMemo(() => parseYield(data), [data])
  const failed = !!error || (!loading && data != null && !y)

  const trendColor = y?.trend === 'rising' ? 'var(--ok)' : y?.trend === 'falling' ? 'var(--bad)' : 'var(--muted)'
  const TrendIcon = y?.trend === 'rising' ? TrendingUp : y?.trend === 'falling' ? TrendingDown : Minus
  const change3m = y?.now != null && y?.ago3m != null ? y.now - y.ago3m : null
  const min = y?.points.length ? Math.min(...y.points.map(p => p.yield)) : 0
  const max = y?.points.length ? Math.max(...y.points.map(p => p.yield)) : 5

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: 'var(--panel)', color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Landmark size={16} color="var(--accent)" />
        <span style={{ fontWeight: 700 }}>Treasury bill yield (13-week)</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>what parked cash can earn</span>
      </div>

      {failed ? (
        <div style={{ color: 'var(--muted)', padding: '18px 0' }}>Couldn't load the T-bill yield right now (no data). It will retry in a few minutes.</div>
      ) : !y ? (
        <div style={{ color: 'var(--muted)', padding: '18px 0' }}>Loading yield…</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 28, fontWeight: 800 }}>{fmtPct(y.now)}</span>
            {y.trend && (
              <span style={{ color: trendColor, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <TrendIcon size={15} /> {y.trend}
                {change3m != null && ` ${change3m >= 0 ? '+' : '−'}${Math.abs(change3m).toFixed(2)} pts in 3 months`}
              </span>
            )}
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>3 months ago {fmtPct(y.ago3m)} · 1 year ago {fmtPct(y.ago1y)}</span>
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {y.now != null && <>$1,000 parked in T-bill funds earns about <b>${((1000 * y.now) / 100 / 12).toFixed(2)}</b> a month at this rate.</>}
          </div>
          {!compact && y.points.length > 1 && (
            <div style={{ height: 160, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={y.points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="tbillFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} minTickGap={40} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis stroke="var(--muted)" fontSize={11} width={44} domain={[Math.floor((min - 0.1) * 10) / 10, Math.ceil((max + 0.1) * 10) / 10]} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(3)}%`, 'Yield']}
                    contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)' }}
                  />
                  <Area type="monotone" dataKey="yield" stroke="var(--accent)" strokeWidth={2} fill="url(#tbillFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Live from Yahoo Finance (13-week T-bill index) · weekly closes over 1 year{loading ? ' · updating…' : ''}</div>
    </div>
  )
}

/** Market Scan panel: the live yield card plus the scan's note on rates, when saved. */
export default function TBillYield() {
  const { get } = useApp()
  const note = get('market.rates.note')
  return (
    <div className="lu-block">
      <TBillYieldCard />
      {typeof note === 'string' && note && (
        <div style={{ fontSize: 13, marginTop: 8, color: 'var(--text)' }}><span style={{ color: 'var(--muted)' }}>From the last scan: </span>{note}</div>
      )}
    </div>
  )
}
