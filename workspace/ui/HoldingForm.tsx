import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useApp } from '@neovai/panel'
import { cleanTicker, isoDay, parseQuote, quoteUrl, type ManualHolding, type Quote } from './lib/holdings'

const MUTED: CSSProperties = { opacity: 0.6 }
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', font: 'inherit' }
const label: CSSProperties = { display: 'grid', gap: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }

export type Draft = Omit<ManualHolding, 'id' | 'addedAt' | 'updatedAt'> & { id?: string; addedAt?: string }

/** Add or edit a holding bought outside the app. Looks the ticker up so you see what you are adding. */
export default function HoldingForm({ initial, onSave, onCancel }: { initial?: ManualHolding; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const { fetchText } = useApp()
  const [ticker, setTicker] = useState(initial?.ticker ?? '')
  const [shares, setShares] = useState(initial ? String(initial.shares) : '')
  const [avgCost, setAvgCost] = useState(initial ? String(initial.avgCost) : '')
  const [buyDate, setBuyDate] = useState(initial?.buyDate ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [found, setFound] = useState<Quote | null>(null)
  const [lookup, setLookup] = useState<'idle' | 'busy' | 'none' | 'error'>('idle')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const look = async (raw: string) => {
    const t = cleanTicker(raw)
    if (!t || !fetchText) return null
    setLookup('busy')
    try {
      const r = await fetchText(quoteUrl(t))
      const q = r.ok ? parseQuote(JSON.parse(r.text)) : null
      setFound(q)
      setLookup(q ? 'idle' : r.status === 404 || r.ok ? 'none' : 'error')
      return q
    } catch { setFound(null); setLookup('error'); return null }
  }

  const save = async () => {
    setError('')
    const t = cleanTicker(ticker)
    const n = Number(shares), c = Number(avgCost)
    if (!t) return setError('Enter a ticker, for example SCHD or VFIAX.')
    if (!(n > 0)) return setError('Shares must be more than 0.')
    if (!(c >= 0) || avgCost.trim() === '') return setError('Enter the average price you paid per share.')
    const q = found?.symbol?.toUpperCase() === t ? found : await look(t)
    if (!q && !initial) return setError(`No quote found for ${t}. Check the ticker.`)
    setSaving(true)
    try {
      await onSave({
        id: initial?.id, addedAt: initial?.addedAt, ticker: t, shares: n, avgCost: c,
        buyDate: buyDate || undefined, note: note.trim() || undefined,
        name: q?.name ?? initial?.name, kind: q?.kind ?? initial?.kind,
      })
    } catch (e: any) {
      setError(String(e?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    } finally { setSaving(false) }
  }

  const cost = Number(shares) * Number(avgCost)
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'rgba(127,127,127,0.04)' }}>
      {initial && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Edit {initial.ticker}{initial.name ? ` · ${initial.name}` : ''} ({initial.shares} shares)</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
        <label style={{ ...label, width: 110 }}>Ticker
          <input style={input} value={ticker} autoFocus={!initial} placeholder="SCHD" disabled={!!initial}
            onChange={(e) => { setTicker(e.target.value.toUpperCase()); setFound(null); setLookup('idle') }}
            onBlur={(e) => { if (e.target.value) void look(e.target.value) }} />
        </label>
        <label style={{ ...label, width: 110 }}>Shares
          <input style={input} type="number" min="0" step="any" value={shares} placeholder="25" onChange={(e) => setShares(e.target.value)} />
        </label>
        <label style={{ ...label, width: 130 }}>Avg cost / share
          <input style={input} type="number" min="0" step="any" value={avgCost} placeholder={found?.price != null ? found.price.toFixed(2) : '0.00'} onChange={(e) => setAvgCost(e.target.value)} />
        </label>
        <label style={{ ...label, width: 150 }}>Bought on
          <input style={input} type="date" value={buyDate} max={isoDay(Date.now())} onChange={(e) => setBuyDate(e.target.value)} />
        </label>
        <label style={{ ...label, flex: '1 1 180px', minWidth: 160, maxWidth: 360 }}>Note
          <input style={input} value={note} placeholder="IRA, gift, bought at Schwab…" maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Add holding'}</button>
          <button onClick={onCancel} disabled={saving}>Cancel</button>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: 12 }}>
        <span style={{ flex: 1, ...MUTED }}>
          {lookup === 'busy' ? 'Looking up…'
            : lookup === 'none' ? `No quote found for ${cleanTicker(ticker)}.`
            : lookup === 'error' ? 'Could not reach Yahoo Finance to check the ticker.'
            : found ? `${found.name} · ${found.kind}${found.price != null ? ` · now $${found.price.toFixed(2)}` : ''}${cost > 0 ? ` · cost $${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}`
            : 'Counted in your account as extra money: it does not use the app’s cash.'}
        </span>
        {error && <span style={{ color: 'var(--bad, #e5484d)', fontWeight: 600 }}>{error}</span>}
      </div>
    </div>
  )
}
