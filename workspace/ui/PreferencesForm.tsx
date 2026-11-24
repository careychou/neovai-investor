import './fullWidth.css'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useApp } from '@neovai/panel'

type Prefs = Record<string, any>
type Group = 'Money' | 'Profit' | 'Risk' | 'Sizing' | 'Timing' | 'Other rules'

const GROUP_ORDER: Group[] = ['Money', 'Profit', 'Risk', 'Sizing', 'Timing', 'Other rules']

const KNOWN: Record<string, { label: string; group: Group; hint: string; unit?: string; min?: number; max?: number; step?: number }> = {
  budget: { label: 'Budget', group: 'Money', hint: 'Total money available for all positions.', unit: '$', min: 0, step: 100 },
  earningCapPct: { label: 'Per-stock profit limit %', group: 'Profit', hint: 'Sell a stock once it is up this much.', unit: '%', min: 0, max: 1000, step: 0.5 },
  overallProfitPct: { label: 'Overall profit goal %', group: 'Profit', hint: 'Target gain on the whole budget, all positions together.', unit: '%', min: 0, max: 1000, step: 0.5 },
  maxPerStockUsd: { label: 'Max per stock', group: 'Sizing', hint: 'Most money in any one stock, per buy and in total.', unit: '$', min: 0, step: 50 },
  lossLimitPct: { label: 'Loss limit %', group: 'Risk', hint: 'Largest loss allowed on a position before exiting.', unit: '%', min: 0, max: 100, step: 0.5 },
}

/** New settings shown with these starting values until the user saves them. */
const DEFAULTS: Prefs = { overallProfitPct: 10, maxPerStockUsd: 1000 }
const ORDER = ['budget', 'earningCapPct', 'overallProfitPct', 'lossLimitPct', 'maxPerStockUsd']

const labelOf = (key: string) =>
  KNOWN[key]?.label ??
  key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\bpct\b/i, '%').replace(/\busd\b/i, '($)')
    .replace(/^./, (c) => c.toUpperCase())

function groupOf(key: string): Group {
  if (KNOWN[key]) return KNOWN[key].group
  const k = key.toLowerCase()
  if (/budget|cash|capital|money/.test(k)) return 'Money'
  if (/profit|gain|earning|target|cap/.test(k)) return 'Profit'
  if (/loss|stop|risk|drawdown|avoid|exclude|margin/.test(k)) return 'Risk'
  if (/size|position|per|max|min|count|buys/.test(k)) return 'Sizing'
  if (/time|day|week|hour|minute|hold|earnings|open|close/.test(k)) return 'Timing'
  return 'Other rules'
}

const card: CSSProperties = { border: '1px solid var(--line)', borderRadius: 10, padding: 14, background: 'var(--panel)' }
const input: CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', font: 'inherit', boxSizing: 'border-box' }
const hintStyle: CSSProperties = { fontSize: 12, color: 'var(--muted)', marginTop: 4 }

function Field({ k, value, onChange }: { k: string; value: any; onChange: (v: any) => void }) {
  const meta = KNOWN[k]
  const label = labelOf(k)
  let control: JSX.Element
  if (typeof value === 'boolean') {
    control = (
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span>{value ? 'Yes' : 'No'}</span>
      </label>
    )
  } else if (typeof value === 'number' || value === null || value === '') {
    control = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {meta?.unit === '$' && <span style={{ color: 'var(--muted)' }}>$</span>}
        <input
          type="number" style={input} value={value ?? ''} min={meta?.min} max={meta?.max} step={meta?.step ?? 'any'}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {meta?.unit === '%' && <span style={{ color: 'var(--muted)' }}>%</span>}
      </div>
    )
  } else if (Array.isArray(value)) {
    control = (
      <input
        style={input} value={value.join(', ')} placeholder="Comma-separated"
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
      />
    )
  } else if (typeof value === 'object') {
    control = (
      <div style={{ display: 'grid', gap: 8, paddingLeft: 8, borderLeft: '2px solid var(--line)' }}>
        {Object.keys(value).map((sub) => (
          <Field key={sub} k={sub} value={value[sub]} onChange={(v) => onChange({ ...value, [sub]: v })} />
        ))}
      </div>
    )
  } else {
    const text = String(value)
    control = text.length > 60
      ? <textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={text} onChange={(e) => onChange(e.target.value)} />
      : <input style={input} value={text} onChange={(e) => onChange(e.target.value)} />
  }
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {control}
      {meta?.hint && <div style={hintStyle}>{meta.hint}</div>}
    </div>
  )
}

function problems(d: Prefs): string[] {
  const out: string[] = []
  const pos = (k: string, name: string) => {
    if (typeof d[k] !== 'number' || !isFinite(d[k]) || d[k] <= 0) out.push(`${name} must be a number above 0.`)
  }
  pos('budget', 'Budget')
  pos('earningCapPct', 'Take-profit %')
  pos('lossLimitPct', 'Loss limit %')
  pos('overallProfitPct', 'Overall profit goal %')
  pos('maxPerStockUsd', 'Max per stock')
  if (typeof d.maxPerStockUsd === 'number' && typeof d.budget === 'number' && d.maxPerStockUsd > d.budget)
    out.push('Max per stock cannot be more than the budget.')
  if (typeof d.lossLimitPct === 'number' && d.lossLimitPct >= 100) out.push('Loss limit % must be under 100.')
  return out
}

/** Editable form for every preference in goals.json. Saves with savePrefs. */
export default function PreferencesForm() {
  const app = useApp()
  const prefs: Prefs = (app.prefs as Prefs) ?? {}
  const withDefaults = (p: Prefs): Prefs => ({ ...DEFAULTS, ...p })
  const [draft, setDraft] = useState<Prefs>(() => withDefaults(prefs))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const prefsJson = JSON.stringify(withDefaults(prefs))
  const dirty = JSON.stringify(draft) !== prefsJson
  // Pick up outside changes when nothing is being edited.
  useEffect(() => { if (!dirty) setDraft(withDefaults(prefs)) }, [prefsJson])
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 2500); return () => clearTimeout(t) }, [saved])

  const groups = useMemo(() => {
    const rest = Object.keys(draft).filter((k) => !ORDER.includes(k))
    const keys = [...ORDER, ...rest]
    const map = new Map<Group, string[]>()
    for (const k of keys) {
      const g = groupOf(k)
      map.set(g, [...(map.get(g) ?? []), k])
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const)
  }, [draft])

  const issues = problems(draft)

  async function save() {
    if (!app.savePrefs) { setError('Saving is not available right now.'); return }
    if (issues.length) { setError(issues.join(' ')); return }
    setBusy(true); setError(null)
    try {
      await app.savePrefs({ ...prefs, ...draft })
      setSaved(true)
    } catch (e: any) {
      setError('Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lu-block">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3 className="lu-title" style={{ margin: 0 }}>Your preferences</h3>
        <span style={hintStyle}>Every job reads these on its next run.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
        {groups.map(([group, keys]) => (
          <section key={group} style={group === 'Profit' ? { ...card, gridColumn: 'span 2' } : card}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 10 }}>{group}</div>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: group === 'Profit' ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr' }}>
              {keys.map((k) => (
                <Field key={k} k={k} value={draft[k] ?? ''} onChange={(v) => { setSaved(false); setError(null); setDraft((d) => ({ ...d, [k]: v })) }} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="button primary" onClick={save} disabled={busy || !dirty || !app.savePrefs}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="button" onClick={() => { setDraft(withDefaults(prefs)); setError(null) }} disabled={busy || !dirty}>
          Undo changes
        </button>
        {saved && <span style={{ color: 'var(--ok)', fontWeight: 600 }}>✓ Saved</span>}
        {!saved && dirty && !error && <span style={hintStyle}>Unsaved changes</span>}
        {error && <span style={{ color: 'var(--bad)' }}>{error}</span>}
      </div>
    </div>
  )
}
