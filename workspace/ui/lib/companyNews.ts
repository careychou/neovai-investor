import { useEffect, useState } from 'react'
import { useApp, resolveData } from '@neovai/panel'

type AnyObj = Record<string, unknown>

export type NewsItem = {
  headline: string
  detail?: string
  source?: string
  time?: string
  impact?: 'good' | 'bad' | 'neutral'
  kind: 'holding' | 'market' | 'scan'
}

const asObjs = (v: unknown): AnyObj[] => (Array.isArray(v) ? (v as AnyObj[]) : [])
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const usable = (s: string) => s !== '' && !/^no data$/i.test(s)

/** "Walmart Inc." -> "Walmart" (used to spot the company in headlines). */
export function shortName(name: string): string {
  return name
    .replace(/[,.]/g, ' ')
    .replace(/\b(inc|incorporated|corp|corporation|co|company|ltd|plc|holdings?|group|the|class [a-c]|common stock|n\.?v|s\.?a)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Name saved by the jobs, if any. */
export function savedName(data: AnyObj, ticker: string, rec?: AnyObj | null): string {
  const t = ticker.toUpperCase()
  const fromRec = str(rec?.name)
  if (usable(fromRec)) return fromRec
  for (const path of ['candidates.ranked', 'candidates.dropped', 'market.watch', 'review.holdings']) {
    const hit = asObjs(resolveData(data, path)).find(o => str(o.ticker).toUpperCase() === t)
    const n = str(hit?.name)
    if (usable(n)) return n
  }
  return ''
}

const nameCache: Record<string, string | null> = {}

/** Company name: saved by the jobs, else read from Yahoo once. '' while unknown. */
export function useCompanyName(ticker: string, rec?: AnyObj | null): string {
  const app = useApp()
  const saved = savedName(app.data as AnyObj, ticker, rec)
  const [fetched, setFetched] = useState<string | null>(nameCache[ticker] ?? null)
  useEffect(() => {
    if (saved || !ticker || ticker in nameCache || typeof app.fetchJson !== 'function') return
    let alive = true
    nameCache[ticker] = null
    app
      .fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`)
      .then((j: any) => {
        const meta = j?.chart?.result?.[0]?.meta
        const n = str(meta?.longName) || str(meta?.shortName)
        nameCache[ticker] = n
        if (alive) setFetched(n)
      })
      .catch(() => {
        nameCache[ticker] = ''
        if (alive) setFetched('')
      })
    return () => {
      alive = false
    }
  }, [ticker, saved])
  return saved || fetched || ''
}

/** News about one ticker from the saved market scan, most relevant first. */
export function companyNews(data: AnyObj, ticker: string, name: string): NewsItem[] {
  const t = ticker.toUpperCase()
  const out: NewsItem[] = []
  const seen = new Set<string>()
  const add = (n: NewsItem) => {
    const key = n.headline.toLowerCase()
    if (!n.headline || seen.has(key)) return
    seen.add(key)
    out.push(n)
  }

  // 1. News fetched for the stocks you hold (bad news first).
  const held = asObjs(resolveData(data, 'market.holdingsNews'))
    .filter(o => str(o.ticker).toUpperCase() === t)
    .filter(o => !/^no (relevant )?news/i.test(str(o.headline)))
  const order = { bad: 0, good: 1, neutral: 2 } as Record<string, number>
  held.sort((a, b) => (order[str(a.impact)] ?? 3) - (order[str(b.impact)] ?? 3))
  for (const o of held) {
    add({
      headline: str(o.headline),
      detail: str(o.action) || undefined,
      source: str(o.source) || undefined,
      time: str(o.time) || undefined,
      impact: (['good', 'bad', 'neutral'].includes(str(o.impact)) ? str(o.impact) : undefined) as NewsItem['impact'],
      kind: 'holding',
    })
  }

  // 2. Market stories that name this ticker or company.
  const tickerRe = new RegExp(`(^|[^A-Za-z])${escape(t)}([^A-Za-z]|$)`)
  const short = shortName(name)
  const nameRe = short.length >= 3 ? new RegExp(`\\b${escape(short)}\\b`, 'i') : null
  for (const o of asObjs(resolveData(data, 'market.news'))) {
    const tags = Array.isArray(o.tickers) ? (o.tickers as unknown[]).map(x => String(x).toUpperCase()) : []
    const text = `${str(o.headline)} ${str(o.why)}`
    if (tags.includes(t) || tickerRe.test(text) || (nameRe && nameRe.test(text))) {
      add({ headline: str(o.headline), detail: str(o.why) || undefined, source: str(o.source) || undefined, kind: 'market' })
    }
  }

  // 3. Market alerts that mention it.
  for (const o of asObjs(resolveData(data, 'market.alerts'))) {
    const text = str(o.text)
    if (tickerRe.test(text) || (nameRe && nameRe.test(text))) {
      const lvl = str(o.level)
      add({ headline: text, impact: lvl === 'good' ? 'good' : lvl === 'bad' ? 'bad' : 'neutral', kind: 'market' })
    }
  }

  // 4. Why the scan put it on the watch list.
  const watch = asObjs(resolveData(data, 'market.watch')).find(o => str(o.ticker).toUpperCase() === t)
  if (watch && str(watch.reason)) add({ headline: str(watch.reason), source: 'Market scan watch list', kind: 'scan' })

  return out
}
