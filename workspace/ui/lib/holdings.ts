/** Parsers and math for holdings the user added by hand, and the details shown for any position. */

export interface ManualHolding {
  id: string
  ticker: string
  shares: number
  avgCost: number
  buyDate?: string
  name?: string
  kind?: string
  note?: string
  addedAt?: string
  updatedAt?: string
}

export type Kind = 'Stock' | 'ETF' | 'Mutual fund' | string

export interface Dividend { date: string; amount: number }

export interface Quote {
  symbol: string
  name: string
  kind: Kind
  currency: string
  price: number | null
  prevClose: number | null
  dayChangePct: number | null
  high52: number | null
  low52: number | null
  time: string | null
  /** Newest first. */
  dividends: Dividend[]
  /** Paid per share over the last 12 months. */
  ttmDividend: number
  /** ttmDividend / price × 100, or null without a price. */
  yieldPct: number | null
}

const UA_SAFE = (s: string) => encodeURIComponent(s.trim().toUpperCase())
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null)
const pad = (n: number) => String(n).padStart(2, '0')
export const isoDay = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export const cleanTicker = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, '')

/** One year of daily prices plus dividend events: price, previous close, 52-week range and payouts in one request. */
export const quoteUrl = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${UA_SAFE(symbol)}?range=1y&interval=1d&events=div`

export function kindOf(instrumentType: unknown): Kind {
  const t = String(instrumentType ?? '').toUpperCase()
  if (t === 'EQUITY') return 'Stock'
  if (t === 'ETF') return 'ETF'
  if (t === 'MUTUALFUND') return 'Mutual fund'
  return t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Unknown'
}

export const isFund = (kind: unknown) => kind === 'ETF' || kind === 'Mutual fund'

/** Reads a Yahoo chart answer. Returns null when the symbol is unknown. */
export function parseQuote(raw: unknown, now = Date.now()): Quote | null {
  const r = (raw as any)?.chart?.result?.[0]
  const m = r?.meta
  if (!m) return null
  const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? []
  const valid = closes.filter((c): c is number => num(c) != null)
  const price = num(m.regularMarketPrice) ?? valid[valid.length - 1] ?? null
  // The last bar is the current (or latest) session, so the close before it is the previous close.
  const prevClose = valid.length >= 2 ? valid[valid.length - 2] : num(m.previousClose)
  const all = Object.values(r.events?.dividends ?? {})
    .map((d: any) => ({ t: Number(d?.date) * 1000, amount: Number(d?.amount) }))
    .filter((d) => isFinite(d.t) && isFinite(d.amount) && d.amount > 0)
    .sort((a, b) => b.t - a.t)
  const yearAgo = now - 365 * 86400_000
  const ttm = all.filter((d) => d.t > yearAgo).reduce((s, d) => s + d.amount, 0)
  return {
    symbol: String(m.symbol ?? ''),
    name: String(m.longName ?? m.shortName ?? m.symbol ?? ''),
    kind: kindOf(m.instrumentType),
    currency: String(m.currency ?? 'USD'),
    price,
    prevClose,
    dayChangePct: price != null && prevClose ? ((price - prevClose) / prevClose) * 100 : null,
    high52: num(m.fiftyTwoWeekHigh),
    low52: num(m.fiftyTwoWeekLow),
    time: num(m.regularMarketTime) != null ? new Date(m.regularMarketTime * 1000).toISOString() : null,
    dividends: all.map((d) => ({ date: isoDay(d.t), amount: d.amount })),
    ttmDividend: Math.round(ttm * 10000) / 10000,
    yieldPct: price ? (ttm / price) * 100 : null,
  }
}

const SA = 'https://stockanalysis.com'

/** The overview page with fees, dividends and ratios. */
export function overviewUrl(symbol: string, kind: Kind): string {
  const s = cleanTicker(symbol)
  if (kind === 'ETF') return `${SA}/etf/${s.toLowerCase()}/`
  if (kind === 'Mutual fund') return `${SA}/quote/mutf/${s}/`
  return `${SA}/stocks/${s.toLowerCase()}/`
}

/** What a fund holds; null for anything that is not a fund. */
export function fundHoldingsUrl(symbol: string, kind: Kind): string | null {
  const s = cleanTicker(symbol)
  if (kind === 'ETF') return `${SA}/etf/${s.toLowerCase()}/holdings/`
  if (kind === 'Mutual fund') return `${SA}/quote/mutf/${s}/holdings/`
  return null
}

const STR = '"((?:[^"\\\\]|\\\\.)*)"'
const unescape = (s: string) => { try { return JSON.parse(`"${s}"`) as string } catch { return s } }

/** The first `key:"value"` in the page whose value passes `ok`. */
function field(html: string, key: string, ok: (v: string) => boolean = () => true): string | undefined {
  const re = new RegExp(`[{,]${key}:${STR}`, 'g')
  for (const m of html.matchAll(re)) {
    const v = unescape(m[1])
    if (v && v !== 'n/a' && ok(v)) return v
  }
  return undefined
}

function labeled(html: string, label: string): string | undefined {
  const m = html.match(new RegExp(`\\{t:"${label}",v:${STR}`))
  return m ? unescape(m[1]) : undefined
}

export interface Overview {
  marketCap?: string
  revenue?: string
  peRatio?: string
  forwardPE?: string
  eps?: string
  /** "$2.12 (2.21%)" for stocks, "$1.05" for funds. */
  dividend?: string
  dividendYield?: string
  payoutRatio?: string
  payoutFrequency?: string
  exDividendDate?: string
  beta?: string
  earningsDate?: string
  analysts?: string
  target?: string
  sector?: string
  industry?: string
  aum?: string
  expenseRatio?: string
  category?: string
  holdingsCount?: number
  inception?: string
  description?: string
}

const money = (v: string) => /^\$?-?[\d.,]+[KMBT]?$/i.test(v)
const percent = (v: string) => /^-?[\d.,]+%$/.test(v)
const plain = (v: string) => /^-?[\d.,]+$/.test(v)

/** Reads the fields stockanalysis.com embeds in its overview page (stocks, ETFs and mutual funds). Missing ones are left out. */
export function parseOverview(html: string): Overview {
  const o: Overview = {}
  const set = <K extends keyof Overview>(k: K, v: Overview[K] | undefined) => { if (v != null && v !== '') o[k] = v }
  set('marketCap', field(html, 'marketCap', money))
  set('revenue', field(html, 'revenue', money))
  set('peRatio', field(html, 'peRatio', plain))
  set('forwardPE', field(html, 'forwardPE', plain) ?? field(html, 'peForward', plain))
  set('eps', field(html, 'eps', plain))
  set('dividend', field(html, 'dividend', (v) => v.startsWith('$')) ?? field(html, 'dps', money))
  const dy = field(html, 'dividendYield', percent) ?? o.dividend?.match(/\(([\d.]+%)\)/)?.[1]
  set('dividendYield', dy)
  set('payoutRatio', field(html, 'payoutRatio', percent))
  set('payoutFrequency', field(html, 'payoutFrequency', (v) => /^[A-Za-z -]+$/.test(v)))
  set('exDividendDate', field(html, 'exDividendDate', (v) => /\d{4}/.test(v)) ?? field(html, 'exDivDate', (v) => /\d{4}/.test(v)))
  set('beta', field(html, 'beta', plain))
  set('earningsDate', field(html, 'earningsDate', (v) => /\d{4}/.test(v)))
  set('analysts', field(html, 'analysts', (v) => /^[A-Za-z ]+$/.test(v)))
  set('target', field(html, 'target', (v) => /^[\d.]/.test(v)))
  set('sector', labeled(html, 'Sector'))
  set('industry', labeled(html, 'Industry'))
  set('aum', field(html, 'aum', money) ?? field(html, 'assets', money))
  set('expenseRatio', field(html, 'expenseRatio', percent))
  set('category', field(html, 'fundCategory') ?? field(html, 'assetClass') ?? field(html, 'category', (v) => v.length < 60))
  const hc = html.match(/[{,]holdings:(\d+)[,}]/)
  if (hc) o.holdingsCount = Number(hc[1])
  set('inception', field(html, 'inception', (v) => /[A-Za-z]{3} \d{1,2}, \d{4}/.test(v)) ?? field(html, 'inception', (v) => /\d{4}/.test(v)))
  const desc = field(html, 'description', (v) => v.length > 40)
  if (desc) set('description', desc.length > 600 ? `${desc.slice(0, 597).replace(/\s+\S*$/, '')}…` : desc)
  return o
}

export interface FundHolding { rank: number; symbol: string | null; name: string; weightPct: number | null }
export interface FundHoldings { asOf: string | null; total: number | null; items: FundHolding[] }

/** Reads the top holdings table of a stockanalysis.com ETF or mutual fund holdings page. */
export function parseFundHoldings(html: string): FundHoldings {
  const items: FundHolding[] = []
  for (const m of html.matchAll(/\{no:(\d+),([^{}]*)\}/g)) {
    const body = m[2]
    const get = (k: string) => { const x = body.match(new RegExp(`(?:^|,)${k}:${STR}`)); return x ? unescape(x[1]) : undefined }
    const name = get('n')
    if (!name) continue
    const s = get('s')
    const w = body.match(/(?:^|,)holdingWeight:(-?[\d.]+)/)?.[1] ?? get('as')?.replace('%', '')
    const weight = w != null && w !== '' && isFinite(Number(w)) ? Number(w) : null
    // Listed stocks come as "$PG"; bonds and cash have no ticker or a description instead.
    items.push({ rank: Number(m[1]), symbol: s?.startsWith('$') ? s.slice(1) : null, name, weightPct: weight })
  }
  const meta = html.match(/date:"([^"]+)",count:(\d+)/)
  return { asOf: meta?.[1] ?? null, total: meta ? Number(meta[2]) : null, items }
}

export interface Position {
  ticker: string
  shares: number
  avgCost: number
  price: number | null
  marketValue: number | null
  costBasis: number
  unrealizedUsd: number | null
  unrealizedPct: number | null
  dayChangeUsd: number | null
  dayChangePct: number | null
  estAnnualIncome: number | null
  daysHeld: number | null
}

const cents = (v: number) => Math.round(v * 100) / 100

/** Values a hand-added holding at the live quote. A missing price leaves the money fields null. */
export function valueHolding(h: ManualHolding, q: Quote | null | undefined, today = new Date()): Position {
  const price = q?.price ?? null
  const costBasis = cents(h.shares * h.avgCost)
  const mv = price != null ? cents(h.shares * price) : null
  const boughtToday = h.buyDate === isoDay(today.getTime())
  const ref = boughtToday ? h.avgCost : q?.prevClose ?? null
  const days = h.buyDate ? Math.max(0, Math.floor((Date.parse(isoDay(today.getTime())) - Date.parse(h.buyDate)) / 86400_000)) : null
  return {
    ticker: h.ticker, shares: h.shares, avgCost: h.avgCost, price,
    marketValue: mv, costBasis,
    unrealizedUsd: mv != null ? cents(mv - costBasis) : null,
    unrealizedPct: price != null && h.avgCost > 0 ? ((price - h.avgCost) / h.avgCost) * 100 : null,
    dayChangeUsd: price != null && ref != null ? cents(h.shares * (price - ref)) : null,
    dayChangePct: q?.dayChangePct ?? null,
    estAnnualIncome: q ? cents(h.shares * q.ttmDividend) : null,
    daysHeld: days,
  }
}

export interface ManualTotals { count: number; costBasis: number; marketValue: number; unrealizedUsd: number; dayChangeUsd: number; estAnnualIncome: number; missing: number }

/** Adds up hand-added positions. A position without a price counts at cost and is listed in `missing`. */
export function totalManual(rows: Position[]): ManualTotals {
  const t = { count: rows.length, costBasis: 0, marketValue: 0, unrealizedUsd: 0, dayChangeUsd: 0, estAnnualIncome: 0, missing: 0 }
  for (const r of rows) {
    t.costBasis += r.costBasis
    t.marketValue += r.marketValue ?? r.costBasis
    t.unrealizedUsd += r.unrealizedUsd ?? 0
    t.dayChangeUsd += r.dayChangeUsd ?? 0
    t.estAnnualIncome += r.estAnnualIncome ?? 0
    if (r.marketValue == null) t.missing++
  }
  for (const k of ['costBasis', 'marketValue', 'unrealizedUsd', 'dayChangeUsd', 'estAnnualIncome'] as const) t[k] = cents(t[k])
  return t
}

/** Share of the top `n` holdings in a fund, in percent. */
export const topWeight = (items: FundHolding[], n = 10) =>
  cents(items.slice(0, n).reduce((s, h) => s + (h.weightPct ?? 0), 0))

/** "0.06%" → 0.06. */
export const pctNumber = (s: string | undefined): number | null => {
  const m = s?.match(/-?[\d.]+/)
  return m ? Number(m[0]) : null
}

/** Key statistics page for a stock (valuation, quality, risk, ownership, growth). */
export const statsUrl = (symbol: string) => `${SA}/stocks/${cleanTicker(symbol).toLowerCase()}/statistics/`

export const STAT_IDS = [
  'marketcap', 'pe', 'peForward', 'pegRatio', 'pfcf', 'evEbitda',
  'roic', 'roe', 'grossMargin', 'operatingMargin', 'fcfMargin', 'fcfYield', 'debtEquity', 'debtEbitda', 'zScore', 'fScore',
  'beta', 'rsi', 'sma50', 'sma200', 'ch1y', 'averageVolume', 'shortFloat',
  'sharesInstitutions', 'sharesInsiders', 'analystCount', 'analystRatings', 'priceTarget',
  'revenue3y', 'eps3y', 'dividendYield', 'dividendGrowthYears', 'earningsdate',
] as const
export type StatId = typeof STAT_IDS[number]
export type Stats = Partial<Record<StatId, string>>

/** Reads `{id:"pe",title:"PE Ratio",value:"39.03"}` entries from a stockanalysis statistics page. */
export function parseStats(html: string): Stats {
  const out: Stats = {}
  for (const id of STAT_IDS) {
    const m = html.match(new RegExp(`\\{id:"${id}",title:${STR},value:${STR}`))
    const v = m ? unescape(m[2]) : undefined
    if (v && v !== 'n/a' && v !== '-') out[id] = v
  }
  return out
}

/** "39.66B" → 39_660_000_000, "1,234" → 1234, "13.45%" → 13.45. */
export function statNumber(s: string | undefined): number | null {
  if (!s) return null
  const m = s.replace(/[,$]/g, '').match(/^([+-]?[\d.]+)\s*([KMBT])?/i)
  if (!m) return null
  const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[(m[2] ?? '').toUpperCase() as 'K'] ?? 1
  return Number(m[1]) * mult
}

export interface StatFlag { label: string; tone: 'good' | 'bad' | 'neutral' }

/** Plain checks behind the long-term "hidden jewel" screen (user-preference rules 26 to 32). */
export function jewelFlags(s: Stats, price: number | null = null): StatFlag[] {
  const f: StatFlag[] = []
  const n = (id: StatId) => statNumber(s[id])
  const cap = n('marketcap'), analysts = n('analystCount'), roic = n('roic'), fcfY = n('fcfYield'), peg = n('pegRatio')
  const dE = n('debtEbitda'), fs = n('fScore'), rsi = n('rsi'), short = n('shortFloat'), sma200 = n('sma200')
  if (cap != null) f.push({ label: cap < 3e8 ? 'Micro cap' : cap <= 2e10 ? 'Small/mid cap' : 'Large cap', tone: cap >= 3e8 && cap <= 2e10 ? 'good' : 'neutral' })
  if (analysts != null) f.push({ label: analysts <= 8 ? `Under-followed (${analysts} analysts)` : `${analysts} analysts`, tone: analysts <= 8 ? 'good' : 'neutral' })
  if (roic != null) f.push({ label: `ROIC ${roic}%`, tone: roic >= 12 ? 'good' : roic < 5 ? 'bad' : 'neutral' })
  if (fcfY != null) f.push({ label: `FCF yield ${fcfY}%`, tone: fcfY >= 4 ? 'good' : fcfY <= 0 ? 'bad' : 'neutral' })
  if (peg != null) f.push({ label: `PEG ${peg}`, tone: peg > 0 && peg < 1.5 ? 'good' : peg >= 3 ? 'bad' : 'neutral' })
  if (dE != null) f.push({ label: `Debt/EBITDA ${dE}`, tone: dE < 3 ? 'good' : dE > 5 ? 'bad' : 'neutral' })
  if (fs != null) f.push({ label: `Piotroski ${fs}/9`, tone: fs >= 6 ? 'good' : fs <= 3 ? 'bad' : 'neutral' })
  if (price != null && sma200 != null) f.push({ label: price >= sma200 ? 'Above 200-day' : 'Below 200-day', tone: price >= sma200 ? 'good' : 'bad' })
  const hype = (rsi != null && rsi > 75) || (short != null && short > 15)
  if (hype) f.push({ label: `Hype risk${rsi != null && rsi > 75 ? ` · RSI ${rsi}` : ''}${short != null && short > 15 ? ` · short ${short}%` : ''}`, tone: 'bad' })
  return f
}
