import type { CSSProperties } from 'react'
import { Landmark } from 'lucide-react'
import { TBillYieldCard } from './TBillYield'
import { fmtUsd, fmtPct, SLEEVE_FUNDS } from './lib/tbill'

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null)
const BORDER = '1px solid var(--line)'
const muted: CSSProperties = { color: 'var(--muted)' }
const th: CSSProperties = { textAlign: 'right', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 12px', borderBottom: BORDER, whiteSpace: 'nowrap', color: 'var(--muted)' }
const td: CSSProperties = { textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
const left: CSSProperties = { textAlign: 'left' }

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ border: BORDER, borderRadius: 10, padding: '10px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', ...muted }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, ...muted }}>{sub}</div>}
    </div>
  )
}

/** Income sleeve on the Performance screen: Treasury bill fund holdings, estimated interest and idle cash. */
export default function IncomeSleeve({ data }: { data: Record<string, any> }) {
  const inc = data?.review?.income
  const holdings: any[] = Array.isArray(inc?.holdings) ? inc.holdings : []
  const value = num(inc?.value)
  const monthly = num(inc?.estMonthlyIncomeUsd)
  const annual = num(inc?.estAnnualIncomeUsd) ?? (monthly != null ? monthly * 12 : null)
  const earned = num(inc?.interestEarnedUsd)
  const idle = num(inc?.idleCashUsd)
  const reserve = num(inc?.reserveUsd)
  const yieldNow = num(inc?.tbillYieldPct)
  const idleMonthly = idle != null && yieldNow != null ? (idle * yieldNow) / 100 / 12 : null

  return (
    <section className="lu-block" style={{ border: BORDER, borderRadius: 12, margin: '16px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: BORDER, background: 'rgba(127,127,127,0.05)' }}>
        <Landmark size={16} color="var(--accent)" />
        <h3 className="lu-title" style={{ margin: 0 }}>Income: Treasury bills</h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, ...muted }}>{inc?.asOf ? `As of ${inc.asOf}` : 'Filled in by “Update account”'}</span>
      </div>
      <div style={{ padding: 14, display: 'grid', gap: 12 }}>
        <TBillYieldCard compact />

        {!inc ? (
          <div style={muted}>No income data yet. Click “Update account” to compute the income sleeve and how much idle cash could earn interest.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <Stat label="In T-bill funds" value={fmtUsd(value)} sub={num(inc.unrealizedUsd) != null ? `Price change ${fmtUsd(num(inc.unrealizedUsd), true)}` : undefined} />
              <Stat label="Est. interest / month" value={fmtUsd(monthly)} color={monthly ? 'var(--ok)' : undefined} sub={annual != null ? `${fmtUsd(annual)} a year` : undefined} />
              <Stat label="Interest earned (est.)" value={fmtUsd(earned, true)} color={earned ? 'var(--ok)' : undefined} sub="Since buying, at the current yield" />
              <Stat label="Idle cash" value={fmtUsd(idle)} sub={reserve != null ? `After a ${fmtUsd(reserve)} trading reserve` : undefined} />
            </div>

            {idle != null && idle > 500 && idleMonthly != null && (
              <div style={{ fontSize: 13, borderLeft: '3px solid var(--accent)', paddingLeft: 10 }}>
                {fmtUsd(idle)} is sitting idle. In T-bill funds at {fmtPct(yieldNow)} it would earn about <b>{fmtUsd(idleMonthly)}</b> a month. Look for an Income call on the Recommendations screen.
              </div>
            )}
            {typeof inc.note === 'string' && inc.note && <div style={{ fontSize: 13 }}><span style={muted}>Note: </span>{inc.note}</div>}

            {holdings.length === 0 ? (
              <div style={{ ...muted, fontSize: 13 }}>No T-bill funds held. Accepted Income calls show up here after the next update.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>
                    <th style={{ ...th, ...left }}>Fund</th><th style={th}>Shares</th><th style={th}>Avg cost</th><th style={th}>Price</th>
                    <th style={th}>Value</th><th style={th}>Yield</th><th style={th}>Est. / month</th><th style={th}>Days</th>
                  </tr></thead>
                  <tbody>
                    {holdings.map((h, i) => (
                      <tr key={`${h.ticker}-${i}`}>
                        <td style={{ ...td, ...left }}>
                          <b>{h.ticker}</b>
                          <div style={{ fontSize: 11, ...muted }}>{h.name ?? SLEEVE_FUNDS[String(h.ticker ?? '').toUpperCase()] ?? ''}</div>
                        </td>
                        <td style={td}>{num(h.shares) ?? '—'}</td>
                        <td style={td}>{fmtUsd(num(h.entry))}</td>
                        <td style={td}>{fmtUsd(num(h.price))}</td>
                        <td style={td}>{fmtUsd(num(h.marketValue))}</td>
                        <td style={td}>{fmtPct(num(h.yieldPct))}</td>
                        <td style={{ ...td, color: 'var(--ok)' }}>{fmtUsd(num(h.estMonthlyIncomeUsd))}</td>
                        <td style={td}>{num(h.daysHeld) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ fontSize: 11, ...muted }}>
              Interest figures are estimates at the current yield. These funds pay monthly, and their price dips slightly on payout day, so price change alone understates the return. Selling settles the next business day.
            </div>
          </>
        )}
      </div>
    </section>
  )
}
