import type { CSSProperties, ReactNode } from 'react'
import { fundHoldingsUrl, isFund, overviewUrl, parseFundHoldings, parseOverview, topWeight, type Quote } from './lib/holdings'
import { usePage } from './lib/useQuotes'

const MUTED: CSSProperties = { opacity: 0.6 }
const BORDER = '1px solid rgba(127,127,127,0.22)'
const px = (v: number | null | undefined, d = 2) => (v == null ? 'no data' : `$${v.toFixed(d)}`)
const usd = (v: number | null | undefined) => (v == null ? 'no data' : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const fmtDay = (d: string) => { const t = new Date(`${d}T12:00:00`); return isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }

function Fact({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, ...MUTED }}>{label}</div>
      <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}

function Box({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ border: BORDER, borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <b style={{ fontSize: 12 }}>{title}</b><span style={{ fontSize: 11, ...MUTED }}>{right}</span>
      </div>
      {children}
    </div>
  )
}

const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px 14px', fontSize: 12.5 }

/** What a position is and what it pays: live quote, dividends, fees and ratios, and for funds the stocks inside. */
export default function HoldingDetails({ ticker, shares, quote, quoteError }: { ticker: string; shares: number | null; quote: Quote | null | undefined; quoteError?: string }) {
  const kind = quote?.kind ?? 'Stock'
  const ov = usePage(quote ? overviewUrl(ticker, kind) : null, parseOverview)
  const fh = usePage(quote ? fundHoldingsUrl(ticker, kind) : null, parseFundHoldings)
  const o = ov.data ?? {}
  const fund = isFund(kind)
  const income = quote && shares != null ? shares * quote.ttmDividend : null
  const lastDivs = quote?.dividends.slice(0, 8) ?? []

  if (!quote) {
    return <div style={{ fontSize: 12, ...MUTED }}>{quoteError ? `No quote for ${ticker}: ${quoteError}.` : `Loading ${ticker}…`}</div>
  }

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10, whiteSpace: 'normal' }}>
      <div style={{ fontSize: 13 }}>
        <b>{quote.name}</b> <span style={MUTED}>· {kind}{o.category ? ` · ${o.category}` : ''}{o.sector ? ` · ${o.sector}` : ''}{o.industry ? ` · ${o.industry}` : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
        <Box title="Dividends" right={o.payoutFrequency}>
          <div style={grid}>
            <Fact label="Last 12 months" value={quote.ttmDividend ? `${px(quote.ttmDividend, 4)} / share` : 'none paid'} />
            <Fact label="Yield (trailing)" value={quote.yieldPct != null && quote.ttmDividend ? `${quote.yieldPct.toFixed(2)}%` : null} />
            <Fact label="Yield (quoted)" value={o.dividendYield} />
            <Fact label="Your income / yr" value={income != null && quote.ttmDividend ? usd(income) : null} />
            <Fact label="Ex-dividend" value={o.exDividendDate} />
            <Fact label="Payout ratio" value={o.payoutRatio} />
          </div>
          {lastDivs.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
              <thead><tr><th style={{ textAlign: 'left', fontWeight: 500, ...MUTED }}>Paid</th><th style={{ textAlign: 'right', fontWeight: 500, ...MUTED }}>Per share</th><th style={{ textAlign: 'right', fontWeight: 500, ...MUTED }}>For you</th></tr></thead>
              <tbody>{lastDivs.map((d) => (
                <tr key={d.date}><td>{fmtDay(d.date)}</td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{px(d.amount, 4)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{shares != null ? usd(d.amount * shares) : '—'}</td></tr>
              ))}</tbody>
            </table>
          )}
          {!lastDivs.length && <div style={{ fontSize: 12, marginTop: 6, ...MUTED }}>No dividends in the last year.</div>}
        </Box>

        <Box title={fund ? 'Fund facts' : 'Company facts'} right={ov.loading ? 'loading…' : ov.error ? `stockanalysis.com: ${ov.error}` : 'stockanalysis.com'}>
          <div style={grid}>
            <Fact label="Price" value={px(quote.price)} />
            <Fact label="52-week range" value={quote.low52 != null && quote.high52 != null ? `${px(quote.low52)} – ${px(quote.high52)}` : null} />
            {fund ? <>
              <Fact label="Expense ratio" value={o.expenseRatio} />
              <Fact label="Assets" value={o.aum} />
              <Fact label="Holdings" value={o.holdingsCount} />
              <Fact label="P/E" value={o.peRatio} />
              <Fact label="Beta" value={o.beta} />
              <Fact label="Since" value={o.inception} />
            </> : <>
              <Fact label="Market cap" value={o.marketCap} />
              <Fact label="P/E" value={o.peRatio} />
              <Fact label="Forward P/E" value={o.forwardPE} />
              <Fact label="EPS" value={o.eps} />
              <Fact label="Beta" value={o.beta} />
              <Fact label="Next earnings" value={o.earningsDate} />
              <Fact label="Analysts" value={o.analysts} />
              <Fact label="Price target" value={o.target} />
            </>}
          </div>
          {o.description && <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45, ...MUTED }}>{o.description}</div>}
        </Box>
      </div>

      {fund && (
        <Box title="What it holds" right={fh.loading ? 'loading…' : fh.error ? `stockanalysis.com: ${fh.error}` : fh.data ? `top ${fh.data.items.length}${fh.data.total ? ` of ${fh.data.total}` : ''}${fh.data.asOf ? ` · as of ${fh.data.asOf}` : ''}` : ''}>
          {fh.data && fh.data.items.length > 0 ? <>
            <div style={{ fontSize: 12, marginBottom: 6, ...MUTED }}>Top 10 make up {topWeight(fh.data.items).toFixed(1)}% of the fund.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2px 18px', fontSize: 12 }}>
              {fh.data.items.map((h) => (
                <div key={`${h.rank}-${h.name}`} style={{ display: 'grid', gridTemplateColumns: '22px 56px 1fr 60px', gap: 6, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(127,127,127,0.1)' }}>
                  <span style={MUTED}>{h.rank}</span>
                  <b>{h.symbol ?? ''}</b>
                  <span title={h.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {h.weightPct != null ? `${h.weightPct.toFixed(2)}%` : '—'}
                    <span style={{ display: 'block', height: 3, borderRadius: 2, marginTop: 2, background: 'var(--accent, #3b82f6)', opacity: 0.5, width: `${Math.min(100, Math.max(0, (h.weightPct ?? 0) * 8))}%`, marginLeft: 'auto' }} />
                  </span>
                </div>
              ))}
            </div>
          </> : !fh.loading && <div style={{ fontSize: 12, ...MUTED }}>{fh.error ? 'Could not load the holdings list.' : 'No holdings list published for this fund.'}</div>}
        </Box>
      )}
      <div style={{ fontSize: 11, ...MUTED }}>Prices and dividends from Yahoo Finance{quote.time ? `, ${new Date(quote.time).toLocaleString()}` : ''}. Fund and company facts from stockanalysis.com.</div>
    </div>
  )
}
