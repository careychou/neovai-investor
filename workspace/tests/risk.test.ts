import { describe, it, expect } from 'vitest'
import { riskMetrics, accountCurve, returns, rebased, mixCurve, parseCloses } from '../ui/lib/risk'
import { parseStats, statNumber, jewelFlags } from '../ui/lib/holdings'

describe('risk metrics', () => {
  it('a portfolio that is twice the market has beta 2 and no alpha without a risk-free rate', () => {
    const b = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.005]
    const p = b.map((x) => 2 * x)
    const m = riskMetrics(p, b)
    expect(m.beta).toBeCloseTo(2, 6)
    expect(m.alphaPct).toBeCloseTo(0, 6)
    expect(m.correlation).toBeCloseTo(1, 6)
    expect(m.maxDrawdownPct).toBeLessThan(0)
  })
  it('max drawdown is the worst peak-to-trough fall', () => {
    const m = riskMetrics([0.1, -0.5, 0.2, 0.0, 0.0], [0, 0, 0, 0, 0])
    expect(m.maxDrawdownPct).toBeCloseTo(-50, 6)
    expect(m.beta).toBeNull()
  })
  it('too few days gives no ratios', () => {
    const m = riskMetrics([0.01, 0.02], [0.01, 0.01])
    expect(m.sharpe).toBeNull()
    expect(m.totalPct).toBeCloseTo(3.02, 6)
  })
})

describe('account curve', () => {
  const days = ['2026-11-20', '2026-11-23', '2026-11-24']
  const series = { WMT: { '2026-11-20': 100, '2026-11-23': 110, '2026-11-24': 99 }, SCHD: { '2026-11-20': 30, '2026-11-23': 30, '2026-11-24': 33 } }
  it('values cash plus accepted trades, and treats a hand-added lot as new money', () => {
    const c = accountCurve(days, series, [{ ticker: 'WMT', action: 'Buy', shares: 10, entry: 100, date: '2026-11-20' }],
      [{ ticker: 'SCHD', shares: 10, avgCost: 28, buyDate: '2026-11-23' }], 1000, '2026-11-20')
    expect(c.map((p) => p.value)).toEqual([1000, 1100 + 300, 990 + 330])
    expect(c[1].flow).toBe(300)
    const r = returns(c)
    expect(r[0]).toBeCloseTo(0.1, 9)
    expect(rebased(c, { '2026-11-20': 1, '2026-11-23': 1, '2026-11-24': 1 }).map((x) => x.account)).toEqual([100, 110, 103.714])
  })
  it('a fixed mix starts at 100', () => {
    expect(mixCurve(days, series, { WMT: 1, SCHD: 1 })[0].value).toBe(100)
  })
  it('reads adjusted closes from a Yahoo chart', () => {
    const t = Date.parse('2026-11-20T14:30:00Z') / 1000
    expect(parseCloses({ chart: { result: [{ meta: { gmtoffset: -18000 }, timestamp: [t], indicators: { quote: [{ close: [5] }], adjclose: [{ adjclose: [4.9] }] } }] } })).toEqual({ '2026-11-20': 4.9 })
  })
})

describe('key stats', () => {
  const html = '{id:"marketcap",title:"Market Cap",value:"4.2B"},{id:"analystCount",title:"Analyst Count",value:"5"},{id:"roic",title:"Return on Invested Capital (ROIC)",value:"18.2%",hover:"x"},{id:"pegRatio",title:"PEG Ratio",value:"n/a"},{id:"rsi",title:"RSI",value:"81.3"},{id:"sma200",title:"200-Day Moving Average",value:"40.10"}'
  it('parses ids and skips n/a', () => {
    const s = parseStats(html)
    expect(s).toMatchObject({ marketcap: '4.2B', analystCount: '5', roic: '18.2%', rsi: '81.3' })
    expect(s.pegRatio).toBeUndefined()
    expect(statNumber('4.2B')).toBe(4.2e9)
    expect(statNumber('5,660,530')).toBe(5660530)
  })
  it('flags under-followed quality and hype', () => {
    const f = jewelFlags(parseStats(html), 45)
    expect(f.find((x) => /Under-followed/.test(x.label))?.tone).toBe('good')
    expect(f.find((x) => /Above 200-day/.test(x.label))?.tone).toBe('good')
    expect(f.find((x) => /Hype/.test(x.label))?.tone).toBe('bad')
  })
})
