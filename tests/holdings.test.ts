import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cleanHoldings, loadHoldings, saveHoldings, HOLDINGS_FILE } from '../shell/main/holdings'

describe('holdings added by hand', () => {
  it('cleans tickers, numbers and dates, and keeps ids unique', () => {
    const now = new Date('2026-11-24T12:00:00Z')
    const [a, b] = cleanHoldings([
      { id: 'x', ticker: ' schd ', shares: '12.5', avgCost: 27.1, buyDate: '2026-01-05', note: '  IRA  ', junk: 1 },
      { id: 'x', ticker: 'BRK.B', shares: 1, avgCost: 0 }
    ], now)
    expect(a).toEqual({ id: 'x', ticker: 'SCHD', shares: 12.5, avgCost: 27.1, buyDate: '2026-01-05', note: 'IRA', addedAt: now.toISOString(), updatedAt: now.toISOString() })
    expect(b.ticker).toBe('BRK.B')
    expect(b.id).not.toBe('x')
  })

  it('rejects bad items with a plain message', () => {
    expect(() => cleanHoldings([{ ticker: '', shares: 1, avgCost: 1 }])).toThrow('not a ticker')
    expect(() => cleanHoldings([{ ticker: 'KO', shares: 0, avgCost: 1 }])).toThrow('KO: shares')
    expect(() => cleanHoldings([{ ticker: 'KO', shares: 1, avgCost: -1 }])).toThrow('average cost')
    expect(() => cleanHoldings([{ ticker: 'KO', shares: 1, avgCost: 1, buyDate: '11/5/2026' }])).toThrow('YYYY-MM-DD')
    expect(() => cleanHoldings({})).toThrow('list')
  })

  it('saves to records/data/holdings.json and loads it back', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neovai-holdings-'))
    try {
      expect(loadHoldings(dir)).toEqual([])
      saveHoldings(dir, [{ ticker: 'VFIAX', shares: 3, avgCost: 600 }])
      const file = JSON.parse(fs.readFileSync(path.join(dir, HOLDINGS_FILE), 'utf8'))
      expect(file.items[0]).toMatchObject({ ticker: 'VFIAX', shares: 3, avgCost: 600 })
      expect(loadHoldings(dir)).toEqual(file.items)
      expect(() => saveHoldings(dir, [{ ticker: 'KO', shares: -1, avgCost: 1 }])).toThrow()
      expect(loadHoldings(dir)).toEqual(file.items)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })
})
