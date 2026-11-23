import { describe, it, expect } from 'vitest'
import { version, sortAlerts, showValue, changeDirection, isStale } from '../logic'
import type { ScanAlert } from '../logic'

describe('workspace logic', () => {
  it('reports a version', () => {
    expect(version()).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('market scan', () => {
  const a = (severity: ScanAlert['severity'], title: string): ScanAlert =>
    ({ severity, kind: 'news', title, detail: '', source: 's', time: 't' })

  it('sorts alerts high to low, stable within a level', () => {
    const out = sortAlerts([a('low', '1'), a('high', '2'), a('medium', '3'), a('high', '4')])
    expect(out.map((x) => x.title)).toEqual(['2', '4', '3', '1'])
  })

  it('shows "no data" for missing values', () => {
    expect(showValue(null)).toBe('no data')
    expect(showValue('')).toBe('no data')
    expect(showValue('5,900.10')).toBe('5,900.10')
  })

  it('reads change direction', () => {
    expect(changeDirection('+0.8%')).toBe('up')
    expect(changeDirection('-1.2%')).toBe('down')
    expect(changeDirection('0.0%')).toBe('mixed')
    expect(changeDirection(null)).toBeNull()
    expect(changeDirection('n/a')).toBeNull()
  })

  it('flags stale scans', () => {
    const now = new Date('2026-11-22T12:00:00Z')
    expect(isStale('2026-11-22T08:00:00Z', now)).toBe(false)
    expect(isStale('2026-11-20T08:00:00Z', now)).toBe(true)
    expect(isStale('bad', now)).toBe(true)
  })
})
