import { useEffect, useState } from 'react'
import { useApp } from '@neovai/panel'

/** What a company does, read live from stockanalysis.com. Fields it cannot find are left out; nothing is guessed. */
export interface Profile {
  ticker: string
  kind: 'stock' | 'fund'
  description?: string
  industry?: string
  industryPath?: string
  sector?: string
  founded?: string
  employees?: string
  ceo?: string
  website?: string
  source: string
}

export interface Peer { ticker: string; name: string; marketCap: number | null }

const SA = 'https://stockanalysis.com'

const decode = (s: string) =>
  s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ').trim()

/** The value cell next to a label cell in the profile's key-facts table. */
function row(html: string, label: string): string | undefined {
  const m = html.match(new RegExp(`<td[^>]*>\\s*${label}\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i'))
  const v = m ? decode(m[1]) : ''
  return v && v !== 'n/a' && v !== '-' ? v : undefined
}

export function parseCompanyPage(ticker: string, html: string): Profile {
  const p: Profile = { ticker, kind: 'stock', source: 'stockanalysis.com company profile' }
  const d = html.match(/Company Description<\/h1>\s*<div[^]*?(<p>[\s\S]*?)<\/div>/i)
  if (d) { const t = decode(d[1]); if (t.length > 30) p.description = t }
  const ind = html.match(/<td[^>]*>\s*Industry\s*<\/td>\s*<td[^>]*>[\s\S]*?href="(\/stocks\/industry\/[^"]+)"[^>]*>([^<]+)</i)
  if (ind) { p.industryPath = ind[1]; p.industry = decode(ind[2]) } else p.industry = row(html, 'Industry')
  p.sector = row(html, 'Sector')
  p.founded = row(html, 'Founded')
  p.employees = row(html, 'Employees')
  p.ceo = row(html, 'CEO')
  const w = html.match(/[{,]website:"([^"]+)"/)
  if (w) p.website = w[1]
  return p
}

function parseFundPage(ticker: string, html: string): Profile {
  const p: Profile = { ticker, kind: 'fund', source: 'stockanalysis.com fund page' }
  const a = html.match(/About [A-Z.\-]+<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)
  if (a) { const t = decode(a[1]); if (t.length > 30) p.description = t }
  const c = html.match(/<td[^>]*>\s*(?:Category|Asset Class)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i)
  if (c) p.industry = decode(c[1])
  return p
}

const profiles: Record<string, Promise<Profile | null>> = {}
const peerLists: Record<string, Promise<{ s: string; n: string; mc: number | null }[]>> = {}

type FetchText = (url: string) => Promise<{ ok: boolean; status?: number; text: string }>

function loadProfile(fetchText: FetchText, ticker: string): Promise<Profile | null> {
  const t = ticker.toUpperCase()
  if (!profiles[t]) {
    profiles[t] = (async () => {
      const r = await fetchText(`${SA}/stocks/${t.toLowerCase()}/company/`)
      if (r.ok && /Company Description/i.test(r.text)) return parseCompanyPage(t, r.text)
      const f = await fetchText(`${SA}/etf/${t.toLowerCase()}/`)
      if (f.ok) return parseFundPage(t, f.text)
      return null
    })().catch(() => { delete profiles[t]; return null })
  }
  return profiles[t]
}

function loadIndustry(fetchText: FetchText, path: string) {
  if (!peerLists[path]) {
    peerLists[path] = (async () => {
      const r = await fetchText(`${SA}${path}`)
      if (!r.ok) return []
      const out: { s: string; n: string; mc: number | null }[] = []
      for (const m of r.text.matchAll(/\{no:\d+,s:"([^"]+)",n:"((?:[^"\\]|\\.)*)",marketCap:([\d.e+]+|null)/g)) {
        out.push({ s: m[1], n: m[2].replace(/\\"/g, '"'), mc: m[3] === 'null' ? null : Number(m[3]) })
      }
      return out
    })().catch(() => { delete peerLists[path]; return [] })
  }
  return peerLists[path]
}

/** The company profile for one ticker: loading, the profile, or null when the page could not be read. */
export function useProfile(ticker: string | null) {
  const app = useApp() as any
  const [st, setSt] = useState<{ loading: boolean; profile: Profile | null }>({ loading: !!ticker, profile: null })
  useEffect(() => {
    if (!ticker || typeof app.fetchText !== 'function') { setSt({ loading: false, profile: null }); return }
    let alive = true
    setSt({ loading: true, profile: null })
    loadProfile(app.fetchText, ticker).then((p) => alive && setSt({ loading: false, profile: p }))
    return () => { alive = false }
  }, [ticker])
  return st
}

/** Listed companies in the same industry closest in size (by market value). Not a curated competitor list. */
export function useIndustryPeers(profile: Profile | null, n = 6) {
  const app = useApp() as any
  const [st, setSt] = useState<{ loading: boolean; peers: Peer[]; total: number }>({ loading: false, peers: [], total: 0 })
  useEffect(() => {
    if (!profile?.industryPath || typeof app.fetchText !== 'function') { setSt({ loading: false, peers: [], total: 0 }); return }
    let alive = true
    setSt({ loading: true, peers: [], total: 0 })
    loadIndustry(app.fetchText, profile.industryPath).then((all) => {
      if (!alive) return
      const self = all.find((x) => x.s.toUpperCase() === profile.ticker)
      const others = all.filter((x) => x.s.toUpperCase() !== profile.ticker)
      const size = self?.mc
      const picked = size
        ? [...others].filter((x) => x.mc).sort((a, b) => Math.abs(Math.log(a.mc! / size)) - Math.abs(Math.log(b.mc! / size))).slice(0, n)
        : others.slice(0, n)
      picked.sort((a, b) => (b.mc ?? 0) - (a.mc ?? 0))
      setSt({ loading: false, peers: picked.map((x) => ({ ticker: x.s, name: x.n, marketCap: x.mc })), total: all.length })
    })
    return () => { alive = false }
  }, [profile?.industryPath, profile?.ticker])
  return st
}

export const fmtCap = (v: number | null | undefined) => {
  if (v == null) return 'no data'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}
