import type { CSSProperties, ReactNode } from 'react'
import { usePanelState } from '@neovai/panel'
import { ChevronDown, ChevronRight, Calculator, AlertTriangle } from 'lucide-react'

const GREEN = '#22a06b'
const RED = '#e5484d'
const BORDER = '1px solid rgba(127,127,127,0.22)'
const MUTED: CSSProperties = { opacity: 0.6 }

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null)
const r2 = (v: number) => Math.round(v * 100) / 100
const usd = (v: number | null, sign = true) => {
  if (v == null) return 'no data'
  const s = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${v < 0 ? '−' : sign && v > 0 ? '+' : ''}$${s}`
}
const tone = (v: number | null) => (v == null || Math.abs(v) < 0.005 ? undefined : v > 0 ? GREEN : RED)

interface Line { label: ReactNode; detail?: ReactNode; value: number | null; sign?: boolean; muted?: boolean }

/** One sum: its lines, a rule and the result, plus a warning if the parts do not match the saved total. */
function Sum({ title, help, lines, total, totalLabel, saved, sign = true }: {
  title: string; help: ReactNode; lines: Line[]; total: number; totalLabel: string; saved?: number | null; sign?: boolean
}) {
  const off = saved != null && Math.abs(r2(saved) - r2(total)) >= 0.01
  return (
    <div style={{ border: BORDER, borderRadius: 10, padding: '12px 14px', minWidth: 0, background: 'rgba(127,127,127,0.04)' }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 12, margin: '2px 0 8px', ...MUTED }}>{help}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} style={l.muted ? MUTED : undefined}>
              <td style={{ padding: '3px 0', verticalAlign: 'top' }}>
                {l.label}
                {l.detail && <div style={{ fontSize: 11, ...MUTED }}>{l.detail}</div>}
              </td>
              <td style={{ padding: '3px 0', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', color: l.sign === false ? undefined : tone(l.value) }}>
                {usd(l.value, l.sign !== false)}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ paddingTop: 6, borderTop: BORDER, fontWeight: 700 }}>= {totalLabel}</td>
            <td style={{ paddingTop: 6, borderTop: BORDER, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: sign ? tone(total) : undefined }}>{usd(total, sign)}</td>
          </tr>
        </tbody>
      </table>
      {off && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#e0a030', display: 'flex', gap: 6 }}>
          <AlertTriangle size={14} style={{ flex: 'none', marginTop: 1 }} />
          The saved card says {usd(saved!, sign)}, which doesn't match these parts. Click “Update account” to recompute.
        </div>
      )}
    </div>
  )
}

export default function ShowTheMath({ data }: { data: Record<string, any> }) {
  const [open, setOpen] = usePanelState('perf-math-open', true)
  const review = data?.review ?? {}
  const a = review.account ?? {}
  if (!review.account) return null

  const trades: any[] = (Array.isArray(review.holdings) ? review.holdings : []).filter((h: any) => h?.source !== 'manual')
  const income: any[] = Array.isArray(review.income?.holdings) ? review.income.holdings : []
  const closed: any[] = Array.isArray(review.closed) ? review.closed : []
  const open_ = [
    ...trades.map((h) => ({ ...h, where: 'Positions table' })),
    ...income.map((h) => ({ ...h, where: 'Income section below' })),
  ]
  const cost = (h: any) => num(h.costBasis) ?? (num(h.entry) ?? 0) * (num(h.shares) ?? 0)
  const mv = (h: any) => num(h.marketValue) ?? (num(h.price) ?? 0) * (num(h.shares) ?? 0)
  const unr = (h: any) => num(h.unrealizedUsd) ?? mv(h) - cost(h)

  const budget = num(a.budget) ?? 10000
  const realized = r2(closed.reduce((s, c) => s + (num(c.realizedUsd) ?? 0), 0))
  const unrealized = r2(open_.reduce((s, h) => s + unr(h), 0))
  const invested = r2(open_.reduce((s, h) => s + cost(h), 0))
  const market = r2(open_.reduce((s, h) => s + mv(h), 0))
  const cash = r2(budget - invested + realized)
  const total = r2(realized + unrealized)
  const value = r2(cash + market)
  const wins = closed.filter((c) => (num(c.realizedUsd) ?? 0) > 0)
  const losses = closed.filter((c) => (num(c.realizedUsd) ?? 0) <= 0)
  const lossSum = r2(losses.reduce((s, c) => s + (num(c.realizedUsd) ?? 0), 0))
  const winSum = r2(wins.reduce((s, c) => s + (num(c.realizedUsd) ?? 0), 0))
  const losingOpen = open_.filter((h) => unr(h) < 0)

  const tradeLine = (c: any): Line => ({
    label: `${c.ticker} · ${c.shares} sh`,
    detail: `sold ${usd(num(c.exit), false)} − bought ${usd(num(c.entry), false)} = ${usd(r2((num(c.exit) ?? 0) - (num(c.entry) ?? 0)))} × ${c.shares}`,
    value: num(c.realizedUsd),
  })
  const openLine = (h: any): Line => ({
    label: `${h.ticker} · ${h.shares} sh`,
    detail: `now ${usd(num(h.price), false)} − paid ${usd(num(h.entry), false)} = ${usd(r2((num(h.price) ?? 0) - (num(h.entry) ?? 0)))} × ${h.shares} · ${h.where}`,
    value: unr(h),
  })

  return (
    <section className="lu-block" style={{ border: BORDER, borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '12px 16px', background: 'rgba(127,127,127,0.05)', borderBottom: open ? BORDER : 'none' }}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Calculator size={15} />
        <span className="lu-title" style={{ margin: 0 }}>How these numbers add up</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, ...MUTED }}>
          {usd(realized)} realized {unrealized < 0 ? '−' : '+'} {usd(Math.abs(unrealized), false)} unrealized = <b style={{ color: tone(total), opacity: 1 }}>{usd(total)}</b>
        </span>
      </button>

      {open && (
        <div style={{ padding: 16 }}>
          {/* Plain-English answer first */}
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
            <b>Why it's up overall even though most lines are red:</b>{' '}
            {losses.length > 0 && <>the {losses.length} losing trade{losses.length > 1 ? 's' : ''} ({losses.map((c) => c.ticker).join(', ')}) cost {usd(lossSum)} in total. </>}
            {wins.length > 0 && <>The winning sale{wins.length > 1 ? 's' : ''} ({wins.map((c) => c.ticker).join(', ')}) made {usd(winSum)}. </>}
            {open_.length > 0 && <>Positions you still hold are {usd(unrealized)} on paper{losingOpen.length > 0 && <>, with {losingOpen.map((h) => h.ticker).join(', ')} down and the rest up</>}. </>}
            The gains slightly outweigh the losses, so the net is <b style={{ color: tone(total) }}>{usd(total)}</b> on a {usd(budget, false)} budget ({((total / budget) * 100).toFixed(2)}%).
            {income.length > 0 && <> Note: the Positions table above lists only trades. {income.map((h) => h.ticker).join(', ')} {income.length > 1 ? 'are' : 'is'} in the Income section below but still counts in the cards.</>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            <Sum title="1 · Realized profit" help="Money locked in by trades you closed: (sell price − buy price) × shares."
              lines={closed.map(tradeLine)} total={realized} totalLabel="Realized profit" saved={num(a.realizedUsd)} />

            <Sum title="2 · Unrealized profit" help="Paper gain or loss on what you still hold: (today's price − price paid) × shares."
              lines={open_.map(openLine)} total={unrealized} totalLabel="Unrealized profit" saved={num(a.unrealizedUsd)} />

            <Sum title="3 · Total profit" help="Everything you've made or lost since the start."
              lines={[{ label: 'Realized (closed trades)', value: realized }, { label: 'Unrealized (still held)', value: unrealized }]}
              total={total} totalLabel="Total profit" saved={num(a.totalUsd)} />

            <Sum title="4 · Cash" help="What you started with, minus what's tied up in holdings, plus or minus closed-trade results." sign={false}
              lines={[
                { label: 'Starting budget', value: budget, sign: false },
                { label: 'Paid for holdings still held', detail: open_.map((h) => `${h.ticker} ${usd(cost(h), false)}`).join(' + '), value: -invested },
                { label: 'Realized profit', value: realized },
              ]}
              total={cash} totalLabel="Cash" saved={num(a.cash)} />

            <Sum title="5 · Total value" help="Cash plus what your holdings are worth today." sign={false}
              lines={[
                { label: 'Cash', value: cash, sign: false },
                { label: 'Holdings at today\'s price', detail: open_.map((h) => `${h.ticker} ${usd(mv(h), false)}`).join(' + '), value: market, sign: false },
              ]}
              total={value} totalLabel="Total value" saved={num(a.totalValue)} />

            <Sum title="6 · Check" help="Total value minus the starting budget should equal total profit." 
              lines={[
                { label: 'Total value', value: value, sign: false },
                { label: 'Starting budget', value: -budget, sign: false },
              ]}
              total={r2(value - budget)} totalLabel="Total profit" saved={total} />
          </div>

          <div style={{ fontSize: 12, marginTop: 12, ...MUTED }}>
            Win rate counts closed trades only: {wins.length} winning out of {closed.length}. A partial sale (like selling some shares of a stock you still hold) counts as its own closed trade.
            Hand-added holdings are extra money and are left out of these sums. Prices as of {String(a.asOf ?? review.date ?? '')}.
          </div>
        </div>
      )}
    </section>
  )
}
