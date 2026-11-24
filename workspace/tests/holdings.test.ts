import { describe, it, expect } from 'vitest'
import { parseQuote, parseOverview, parseFundHoldings, valueHolding, totalManual, kindOf, overviewUrl, fundHoldingsUrl, topWeight } from '../ui/lib/holdings'

const day = (s: string) => Date.parse(`${s}T15:00:00Z`) / 1000
const chart = {
  chart: { result: [{
    meta: { symbol: 'SCHD', instrumentType: 'ETF', longName: 'Schwab U.S. Dividend Equity ETF', currency: 'USD', regularMarketPrice: 34.39, fiftyTwoWeekHigh: 36.38, fiftyTwoWeekLow: 27.02, regularMarketTime: day('2026-11-23') },
    timestamp: [day('2026-11-18'), day('2026-11-19'), day('2026-11-20'), day('2026-11-23')],
    indicators: { quote: [{ close: [34.2, null, 33.94, 34.39] }] },
    events: { dividends: {
      a: { amount: 0.265, date: day('2025-09-24') },
      b: { amount: 0.249, date: day('2026-03-25') },
      c: { amount: 0.26, date: day('2026-06-25') },
      d: { amount: 0.27, date: day('2026-09-24') },
      e: { amount: 0.25, date: day('2025-06-25') },
    } },
  }] },
}

describe('quote', () => {
  it('reads price, previous close, range and the last 12 months of dividends', () => {
    const q = parseQuote(chart, Date.parse('2026-11-23T20:00:00Z'))!
    expect(q.kind).toBe('ETF')
    expect(q.price).toBe(34.39)
    expect(q.prevClose).toBe(33.94)
    expect(q.dividends.map((d) => d.date)).toEqual(['2026-09-24', '2026-06-25', '2026-03-25', '2025-09-24', '2025-06-25'])
    // Only payouts within a year (not Sep 2025) of now count toward the trailing total.
    expect(q.ttmDividend).toBeCloseTo(0.249 + 0.26 + 0.27, 4)
    expect(q.yieldPct).toBeCloseTo((q.ttmDividend / 34.39) * 100, 6)
  })

  it('returns null for an unknown symbol and names the kinds', () => {
    expect(parseQuote({ chart: { result: null, error: { code: 'Not Found' } } })).toBeNull()
    expect([kindOf('EQUITY'), kindOf('ETF'), kindOf('MUTUALFUND'), kindOf('CRYPTOCURRENCY')]).toEqual(['Stock', 'ETF', 'Mutual fund', 'Cryptocurrency'])
    expect(overviewUrl('brk.b', 'Stock')).toBe('https://stockanalysis.com/stocks/brk.b/')
    expect(overviewUrl('vfiax', 'Mutual fund')).toBe('https://stockanalysis.com/quote/mutf/VFIAX/')
    expect(fundHoldingsUrl('SCHD', 'ETF')).toBe('https://stockanalysis.com/etf/schd/holdings/')
    expect(fundHoldingsUrl('KO', 'Stock')).toBeNull()
  })
})

describe('overview pages', () => {
  it('reads a stock page', () => {
    const html = `currency:{dividend:"USD"},quote:{marketCap:"412.47B",marketCapGrowth:34.8,revenue:"51.05B",eps:"3.39",peRatio:"28.28",forwardPE:"27.57",dividend:"$2.12 (2.21%)",exDividendDate:"Dec 1, 2026",beta:"0.27",analysts:"Buy",target:"99.64 (+3.92%)",earningsDate:"Oct 27, 2026",description:"The Coca-Cola Company, a beverage company, manufactures, markets, and sells various nonalcoholic beverages worldwide."},info:[{t:"Sector",v:"Consumer Staples",u:"x"},{t:"Industry",v:"Beverages - Non-Alcoholic",u:"y"}]`
    expect(parseOverview(html)).toMatchObject({
      marketCap: '412.47B', peRatio: '28.28', forwardPE: '27.57', dividend: '$2.12 (2.21%)', dividendYield: '2.21%',
      exDividendDate: 'Dec 1, 2026', beta: '0.27', earningsDate: 'Oct 27, 2026', sector: 'Consumer Staples', industry: 'Beverages - Non-Alcoholic',
    })
  })

  it('reads an ETF page and a mutual fund page', () => {
    const etf = `{aum:"$118.39B",expenseRatio:"0.06%",peRatio:"17.60",peForward:"14.18",sharesOut:"3.46B",dps:"$1.05",dividendYield:"3.07%",dividend:"$1.05 (3.07%)",payoutRatio:"54.01%",exDivDate:"Sep 23, 2026",ch1y:"+26.90%",payoutFrequency:"Quarterly",beta:"0.68",holdings:102,inception:"Oct 20, 2011"},features:{dividend:true,holdings:true},x:{inception:"2011-10-20"}`
    expect(parseOverview(etf)).toMatchObject({ aum: '$118.39B', expenseRatio: '0.06%', dividendYield: '3.07%', payoutRatio: '54.01%', exDividendDate: 'Sep 23, 2026', payoutFrequency: 'Quarterly', holdingsCount: 102, inception: 'Oct 20, 2011' })
    const mf = `{expenseRatio:"0.04%",assets:"1.74T",fundCategory:"Large Blend",dps:"7.42",dividendYield:"1.11%",payoutFrequency:"Quarterly",payoutRatio:void 0,exDivDate:"Sep 28, 2026",inception:"Aug 31, 1976",holdings:516,beta:"1.00",analysts:"n/a"}`
    const o = parseOverview(mf)
    expect(o).toMatchObject({ expenseRatio: '0.04%', aum: '1.74T', category: 'Large Blend', dividend: '7.42', dividendYield: '1.11%', holdingsCount: 516 })
    expect(o.analysts).toBeUndefined()
  })
})

describe('fund holdings pages', () => {
  it('reads ETF rows with numeric weights and mutual fund rows with percent text', () => {
    const etf = parseFundHoldings(`[{no:1,s:"$PG",n:"The Procter & Gamble Company",holdingWeight:4.7,holdingShares:32656078,price:169.6,change:.14},{no:2,s:"$KO",n:"The Coca-Cola Company",holdingWeight:4.51,holdingShares:1}],date:"Nov 21, 2026",count:102`)
    expect(etf).toEqual({ asOf: 'Nov 21, 2026', total: 102, items: [
      { rank: 1, symbol: 'PG', name: 'The Procter & Gamble Company', weightPct: 4.7 },
      { rank: 2, symbol: 'KO', name: 'The Coca-Cola Company', weightPct: 4.51 },
    ] })
    const mf = parseFundHoldings(`[{no:1,n:"Apple Inc.",s:"$AAPL",as:"7.70%",sh:"387,820,542"},{no:2,n:"TREASURY BILL - 0.0 2026-12-22",s:"XIB.0 12.22.26",as:"9.39%"},{no:3,n:"USD CASH",as:"-6.75%"}],date:"Oct 31, 2026",count:516`)
    expect(mf.items.map((h) => [h.symbol, h.weightPct])).toEqual([['AAPL', 7.7], [null, 9.39], [null, -6.75]])
    expect(topWeight(mf.items, 2)).toBe(17.09)
    expect(parseFundHoldings('<html>nothing</html>')).toEqual({ asOf: null, total: null, items: [] })
  })
})

describe('valuing hand-added holdings', () => {
  const q = parseQuote(chart, Date.parse('2026-11-23T20:00:00Z'))!
  const today = new Date('2026-11-23T18:00:00')

  it('values a holding at the live price, with day change from the previous close and income from trailing dividends', () => {
    const p = valueHolding({ id: '1', ticker: 'SCHD', shares: 100, avgCost: 30, buyDate: '2026-11-01' }, q, today)
    expect(p).toMatchObject({ marketValue: 3439, costBasis: 3000, unrealizedUsd: 439, dayChangeUsd: 45, daysHeld: 22, estAnnualIncome: 77.9 })
    expect(p.unrealizedPct).toBeCloseTo(14.6333, 3)
  })

  it('uses the cost for day change on the buy day, and counts a holding without a price at cost', () => {
    expect(valueHolding({ id: '1', ticker: 'SCHD', shares: 10, avgCost: 34, buyDate: '2026-11-23' }, q, today).dayChangeUsd).toBe(3.9)
    const none = valueHolding({ id: '2', ticker: 'ZZZ', shares: 5, avgCost: 10 }, null, today)
    expect(none).toMatchObject({ price: null, marketValue: null, unrealizedUsd: null, daysHeld: null })
    const t = totalManual([valueHolding({ id: '1', ticker: 'SCHD', shares: 100, avgCost: 30, buyDate: '2026-11-01' }, q, today), none])
    expect(t).toEqual({ count: 2, costBasis: 3050, marketValue: 3489, unrealizedUsd: 439, dayChangeUsd: 45, estAnnualIncome: 77.9, missing: 1 })
  })
})
