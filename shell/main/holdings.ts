import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ManualHolding } from '../shared/api'

/** Holdings the user bought outside the app's calls. Only the app writes this file (from the Performance screen); agents read it. */
export const HOLDINGS_FILE = 'records/data/holdings.json'

const MAX_ITEMS = 500
const TICKER = /^[A-Z0-9][A-Z0-9.\-^=]{0,14}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

/** Checks every item and throws a plain message on the first bad one, so the form can show it. */
export function cleanHoldings(raw: unknown, now = new Date()): ManualHolding[] {
  if (!Array.isArray(raw)) throw new Error('holdings must be a list')
  if (raw.length > MAX_ITEMS) throw new Error(`at most ${MAX_ITEMS} holdings`)
  const ids = new Set<string>()
  return raw.map((r: any, i) => {
    const at = `holding ${i + 1}`
    const ticker = String(r?.ticker ?? '').trim().toUpperCase()
    if (!TICKER.test(ticker)) throw new Error(`${at}: "${r?.ticker ?? ''}" is not a ticker`)
    const shares = Number(r?.shares)
    if (!Number.isFinite(shares) || shares <= 0 || shares > 1e9) throw new Error(`${ticker}: shares must be more than 0`)
    const avgCost = Number(r?.avgCost)
    if (!Number.isFinite(avgCost) || avgCost < 0 || avgCost > 1e7) throw new Error(`${ticker}: average cost must be 0 or more`)
    const buyDate = text(r?.buyDate, 10)
    if (buyDate && (!DATE.test(buyDate) || isNaN(Date.parse(buyDate)))) throw new Error(`${ticker}: buy date must be YYYY-MM-DD`)
    let id = text(r?.id, 64) ?? randomUUID()
    if (ids.has(id)) id = randomUUID()
    ids.add(id)
    const item: ManualHolding = {
      id, ticker, shares, avgCost,
      addedAt: text(r?.addedAt, 40) ?? now.toISOString(),
      updatedAt: text(r?.updatedAt, 40) ?? now.toISOString()
    }
    if (buyDate) item.buyDate = buyDate
    for (const k of ['name', 'kind', 'note'] as const) {
      const v = text(r?.[k], k === 'note' ? 500 : 200)
      if (v) item[k] = v
    }
    return item
  })
}

export function loadHoldings(workspace: string): ManualHolding[] {
  try { return cleanHoldings(JSON.parse(fs.readFileSync(path.join(workspace, HOLDINGS_FILE), 'utf8')).items) } catch { return [] }
}

export function saveHoldings(workspace: string, items: unknown): ManualHolding[] {
  const clean = cleanHoldings(items)
  const file = path.join(workspace, HOLDINGS_FILE)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ updated: new Date().toISOString(), items: clean }, null, 2) + '\n')
  return clean
}
