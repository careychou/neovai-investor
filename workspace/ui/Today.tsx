import './fullWidth.css'
import MarketScanPanel from './MarketScanPanel'
import type { MarketScan, Severity, Mood, ScanTrend } from '../logic'

export interface Goals { earningCapPct: number; lossLimitPct: number; budget: number }

const LEVEL: Record<string, Severity> = { bad: 'high', warn: 'medium', info: 'low', good: 'low' }
const str = (v: unknown) => (v == null ? null : String(v))
const pctNum = (v: unknown) => { const n = parseFloat(String(v ?? '').replace(/[^\d.+-]/g, '')); return isFinite(n) ? n : null }

/** Turn the saved scan (what "Run market scan" writes) into the box's shape. Only saved numbers; missing ones stay null. */
export function fromSaved(m: any): MarketScan | null {
  if (!m || typeof m !== 'object') return null
  const moodText = String(m.mood ?? '')
  const label = (['risk-on', 'risk-off', 'mixed'].find((l) => moodText.toLowerCase().startsWith(l)) ?? 'mixed') as Mood
  const reason = moodText.replace(/^(risk-on|risk-off|mixed)\s*[:\-–—]?\s*/i, '') || String(m.summary ?? '')
  const asOf = str(m.asOf) ?? (m.date ? `${m.date}T12:00:00` : new Date(0).toISOString())
  const sectors: any[] = Array.isArray(m.sectors) ? m.sectors : []
  const ranked = sectors.map((s) => ({ name: String(s.sector ?? ''), c: pctNum(s.change) })).filter((s) => s.name && s.c != null).sort((a, b) => b.c! - a.c!)
  const news: any[] = Array.isArray(m.news) ? m.news : []
  return {
    asOf,
    mood: { label, reason },
    metrics: (Array.isArray(m.metrics) ? m.metrics : []).map((x: any) => ({
      item: String(x.label ?? x.item ?? ''),
      value: x.value == null || x.value === 'no data' ? null : typeof x.value === 'number' ? x.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(x.value),
      change: x.change == null || x.change === 'no data' ? null : String(x.change),
      source: String(x.note ?? x.source ?? ''),
      time: String(x.time ?? ''),
    })),
    alerts: (Array.isArray(m.alerts) ? m.alerts : []).map((a: any) => ({
      severity: LEVEL[a.level] ?? a.severity ?? 'low',
      kind: a.kind ?? 'news',
      title: String(a.title ?? a.text ?? ''),
      detail: String(a.detail ?? ''),
      tickers: a.tickers,
      source: String(a.source ?? ''),
      time: String(a.time ?? ''),
    })),
    trends: news.map((n): ScanTrend => ({ title: String(n.headline ?? ''), direction: 'mixed', why: String(n.why ?? ''), source: String(n.source ?? '') })),
    sectors: {
      leading: ranked.filter((s) => s.c! > 0).slice(0, 3).map((s) => `${s.name} (${s.c! > 0 ? '+' : ''}${s.c}%)`),
      lagging: ranked.filter((s) => s.c! < 0).slice(-3).reverse().map((s) => `${s.name} (${s.c}%)`),
    },
    watchList: [],
  }
}

export default function Today({ goals, data }: { goals: Goals | null; data: Record<string, any> }) {
  const scan = fromSaved(data?.market)
  return (
    <div className="today">
      <h1>Market Scan</h1>
      <MarketScanPanel scan={scan} trendsTitle="News likely to move the market" />
      {goals && (
        <div className="cards">
          <div className="card"><span>Take profit at</span><b>+{goals.earningCapPct}%</b></div>
          <div className="card"><span>Exit at a loss of</span><b>-{goals.lossLimitPct}%</b></div>
          <div className="card"><span>Budget</span><b>${goals.budget.toLocaleString()}</b></div>
        </div>
      )}
    </div>
  )
}
