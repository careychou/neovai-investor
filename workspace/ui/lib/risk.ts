/** Account value curve and the risk numbers investors use: return, volatility, beta, alpha, Sharpe, Sortino, drawdown. */

export type Closes = Record<string, number>
/** ticker → day (YYYY-MM-DD) → close */
export type Series = Record<string, Closes>

export interface Trade { ticker: string; action: string; shares: number | null; entry: number | null; date: string }
export interface Lot { ticker: string; shares: number; avgCost: number; buyDate?: string }

export interface Point { date: string; value: number; flow: number }

export const isBuy = (a: string) => /buy|add/i.test(a)
export const isSellAll = (a: string) => /sell all|exit|close/i.test(a)
export const isSellPart = (a: string) => /sell/i.test(a) && !isSellAll(a)

/** Yahoo chart JSON → day → close. */
export function parseCloses(raw: unknown): Closes {
  const r = (raw as any)?.chart?.result?.[0]
  const out: Closes = {}
  const ts: number[] = r?.timestamp ?? []
  const c: (number | null)[] = r?.indicators?.adjclose?.[0]?.adjclose ?? r?.indicators?.quote?.[0]?.close ?? []
  const off = Number(r?.meta?.gmtoffset ?? 0)
  ts.forEach((t, i) => {
    const v = c[i]
    if (typeof v !== 'number' || !isFinite(v)) return
    out[new Date((t + off) * 1000).toISOString().slice(0, 10)] = v
  })
  return out
}

/** Last close on or before `day`. */
function closeOn(s: Closes | undefined, days: string[], i: number): number | null {
  if (!s) return null
  for (let k = i; k >= 0; k--) { const v = s[days[k]]; if (v != null) return v }
  return null
}

/**
 * Daily value of the app account (budget cash + accepted trades) plus hand-added lots from their buy date.
 * `flow` is new money that day (a hand-added lot's cost), so returns can leave it out.
 */
export function accountCurve(days: string[], series: Series, trades: Trade[], lots: Lot[], budget: number, start: string): Point[] {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const out: Point[] = []
  const pos = new Map<string, number>()
  let cash = budget
  let t = 0
  const added = new Set<number>()
  days.forEach((day, i) => {
    if (day < start) return
    while (t < sorted.length && sorted[t].date <= day) {
      const tr = sorted[t++]
      const px = tr.entry ?? closeOn(series[tr.ticker], days, i)
      if (px == null) continue
      const held = pos.get(tr.ticker) ?? 0
      if (isBuy(tr.action) && tr.shares) { pos.set(tr.ticker, held + tr.shares); cash -= tr.shares * px }
      else if (isSellAll(tr.action)) { pos.set(tr.ticker, 0); cash += held * px }
      else if (isSellPart(tr.action)) { const sh = Math.min(held, tr.shares ?? Math.floor(held / 2)); pos.set(tr.ticker, held - sh); cash += sh * px }
    }
    let value = cash
    for (const [tk, sh] of pos) { if (sh) value += sh * (closeOn(series[tk], days, i) ?? 0) }
    let flow = 0
    lots.forEach((l, k) => {
      const from = l.buyDate && l.buyDate > start ? l.buyDate : start
      if (day < from) return
      const px = closeOn(series[l.ticker], days, i)
      if (px == null) return
      value += l.shares * px
      if (!added.has(k)) { added.add(k); flow += out.length ? l.shares * px : 0 }
    })
    out.push({ date: day, value, flow })
  })
  return out
}

/** Value of today's mix held unchanged over the whole window (a backtest of what you own now). */
export function mixCurve(days: string[], series: Series, weights: Record<string, number>): Point[] {
  const out: Point[] = []
  const first: Record<string, number> = {}
  days.forEach((day, i) => {
    let value = 0, known = 0
    for (const [tk, w] of Object.entries(weights)) {
      const px = closeOn(series[tk], days, i)
      if (px == null) continue
      first[tk] ??= px
      value += w * (px / first[tk]); known += w
    }
    if (known > 0) out.push({ date: day, value: (value / known) * 100, flow: 0 })
  })
  return out
}

/** Daily returns with new money left out: (V_t − flow_t) / V_{t−1} − 1. */
export function returns(curve: Point[]): number[] {
  const r: number[] = []
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].value
    if (prev > 0) r.push((curve[i].value - curve[i].flow) / prev - 1)
  }
  return r
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
const sd = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) }

export interface Metrics {
  days: number
  totalPct: number
  benchPct: number
  excessPct: number
  annualVolPct: number | null
  beta: number | null
  alphaPct: number | null
  sharpe: number | null
  sortino: number | null
  maxDrawdownPct: number
  correlation: number | null
  upCapturePct: number | null
  downCapturePct: number | null
}

/** Risk numbers from aligned daily returns. `rfAnnualPct` is the T-bill yield used as the risk-free rate. */
export function riskMetrics(p: number[], b: number[], rfAnnualPct = 0): Metrics {
  const n = Math.min(p.length, b.length)
  p = p.slice(-n); b = b.slice(-n)
  const rf = rfAnnualPct / 100 / 252
  const grow = (a: number[]) => (a.reduce((v, x) => v * (1 + x), 1) - 1) * 100
  const ex = p.map((x) => x - rf), exB = b.map((x) => x - rf)
  const mp = mean(p), mb = mean(b)
  let cov = 0, varB = 0
  for (let i = 0; i < n; i++) { cov += (p[i] - mp) * (b[i] - mb); varB += (b[i] - mb) ** 2 }
  const enough = n >= 5
  const beta = enough && varB > 0 ? cov / varB : null
  const sp = sd(p), sb = sd(b)
  const down = Math.sqrt(mean(ex.map((x) => Math.min(0, x) ** 2)))
  let peak = 1, v = 1, mdd = 0
  for (const x of p) { v *= 1 + x; peak = Math.max(peak, v); mdd = Math.min(mdd, v / peak - 1) }
  const capture = (sel: (x: number) => boolean) => {
    const idx = b.map((x, i) => (sel(x) ? i : -1)).filter((i) => i >= 0)
    const bm = mean(idx.map((i) => b[i]))
    return enough && idx.length && bm !== 0 ? (mean(idx.map((i) => p[i])) / bm) * 100 : null
  }
  const totalPct = grow(p), benchPct = grow(b)
  return {
    days: n,
    totalPct,
    benchPct,
    excessPct: totalPct - benchPct,
    annualVolPct: enough ? sp * Math.sqrt(252) * 100 : null,
    beta,
    alphaPct: beta == null ? null : (mean(ex) - beta * mean(exB)) * 252 * 100,
    sharpe: enough && sp > 0 ? (mean(ex) / sp) * Math.sqrt(252) : null,
    sortino: enough && down > 0 ? (mean(ex) / down) * Math.sqrt(252) : null,
    maxDrawdownPct: mdd * 100,
    correlation: enough && sp > 0 && sb > 0 ? cov / (n - 1) / (sp * sb) : null,
    upCapturePct: capture((x) => x > 0),
    downCapturePct: capture((x) => x < 0),
  }
}

/** Both curves rebased to 100 on the first shared day, for one chart. */
export function rebased(curve: Point[], bench: Closes): { date: string; account: number; spy: number }[] {
  const rows: { date: string; account: number; spy: number }[] = []
  let a0 = 0, b0 = 0, acc = 100
  for (let i = 0; i < curve.length; i++) {
    const c = curve[i], b = bench[c.date]
    if (b == null) continue
    if (!rows.length) { a0 = c.value; b0 = b; rows.push({ date: c.date, account: 100, spy: 100 }); continue }
    const prev = curve[i - 1]
    acc *= prev && prev.value > 0 ? (c.value - c.flow) / prev.value : 1
    rows.push({ date: c.date, account: +acc.toFixed(3), spy: +((b / b0) * 100).toFixed(3) })
  }
  return a0 ? rows : []
}

/** Shares held now per ticker from accepted trades (the same rules as the account curve). */
export function openShares(trades: Trade[]): Record<string, number> {
  const pos: Record<string, number> = {}
  for (const tr of [...trades].sort((a, b) => a.date.localeCompare(b.date))) {
    const held = pos[tr.ticker] ?? 0
    if (isBuy(tr.action) && tr.shares) pos[tr.ticker] = held + tr.shares
    else if (isSellAll(tr.action)) pos[tr.ticker] = 0
    else if (isSellPart(tr.action)) pos[tr.ticker] = held - Math.min(held, tr.shares ?? Math.floor(held / 2))
  }
  for (const k of Object.keys(pos)) if (!pos[k]) delete pos[k]
  return pos
}

/** Fall from the running peak, in percent, for each point. */
export function drawdowns(rows: { date: string; account: number }[]): { date: string; drawdown: number }[] {
  let peak = -Infinity
  return rows.map((r) => { peak = Math.max(peak, r.account); return { date: r.date, drawdown: +((r.account / peak - 1) * 100).toFixed(3) } })
}
