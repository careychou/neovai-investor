import { useEffect, useState } from 'react'
import { useApp } from '@neovai/panel'
import { parseQuote, quoteUrl, type Quote } from './holdings'

const TTL = 5 * 60_000
const cache = new Map<string, { at: number; q: Quote | null; error?: string }>()
const inflight = new Map<string, Promise<void>>()

export interface QuoteState { quotes: Record<string, Quote | null>; errors: Record<string, string>; loading: boolean; reload: () => void }

/** Live quotes (price, previous close, 52-week range, dividends) for a list of tickers, cached for five minutes across panels. */
export function useQuotes(tickers: string[], refreshSecs = 300): QuoteState {
  const { fetchText } = useApp()
  const key = [...new Set(tickers.map((t) => t.toUpperCase()))].sort().join(',')
  const [n, setN] = useState(0)
  const [, bump] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const list = key ? key.split(',') : []
    if (!list.length || !fetchText) return
    let live = true
    const load = (force: boolean) => {
      const due = list.filter((t) => force || !cache.has(t) || Date.now() - cache.get(t)!.at > TTL)
      if (!due.length) return
      setLoading(true)
      Promise.all(due.map((t) => {
        if (!force && inflight.has(t)) return inflight.get(t)!
        const p = fetchText(quoteUrl(t)).then((r) => {
          if (!r.ok) { cache.set(t, { at: Date.now(), q: cache.get(t)?.q ?? null, error: r.error ?? `answered ${r.status}` }); return }
          try {
            const q = parseQuote(JSON.parse(r.text))
            cache.set(t, { at: Date.now(), q, error: q ? undefined : 'unknown symbol' })
          } catch { cache.set(t, { at: Date.now(), q: null, error: 'not a quote' }) }
        }).catch((e) => { cache.set(t, { at: Date.now(), q: null, error: String(e?.message ?? e) }) })
          .finally(() => inflight.delete(t))
        inflight.set(t, p)
        return p
      })).finally(() => { if (live) { setLoading(false); bump((x) => x + 1) } })
    }
    load(n > 0)
    const timer = refreshSecs > 0 ? setInterval(() => load(true), refreshSecs * 1000) : null
    return () => { live = false; if (timer) clearInterval(timer) }
  }, [key, n, refreshSecs])

  const quotes: Record<string, Quote | null> = {}
  const errors: Record<string, string> = {}
  for (const t of key ? key.split(',') : []) {
    const c = cache.get(t)
    if (c) { quotes[t] = c.q; if (c.error) errors[t] = c.error }
  }
  return { quotes, errors, loading, reload: () => setN((x) => x + 1) }
}

/** Fetches a page once per symbol and parses it; cached for the session. */
const pages = new Map<string, Promise<any>>()
export function usePage<T>(url: string | null, parse: (html: string) => T): { data: T | null; error: string | null; loading: boolean } {
  const { fetchText } = useApp()
  const [st, setSt] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: !!url })
  useEffect(() => {
    if (!url || !fetchText) { setSt({ data: null, error: url ? 'This app does not let panels fetch.' : null, loading: false }); return }
    let live = true
    setSt((s) => ({ ...s, loading: true }))
    if (!pages.has(url)) {
      const p = fetchText(url).then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'not found' : r.error ?? `answered ${r.status}`)
        return parse(r.text)
      })
      p.catch(() => pages.delete(url))
      pages.set(url, p)
    }
    pages.get(url)!.then((data) => live && setSt({ data, error: null, loading: false }))
      .catch((e) => live && setSt({ data: null, error: String(e?.message ?? e), loading: false }))
    return () => { live = false }
  }, [url])
  return st
}
