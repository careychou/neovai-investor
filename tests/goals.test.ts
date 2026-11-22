import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cleanGoals, loadGoals, saveGoals, DEFAULT_GOALS } from '../shell/main/goals'

describe('goals', () => {
  it('keeps valid numbers and replaces bad ones with the defaults', () => {
    expect(cleanGoals({ earningCapPct: '20', lossLimitPct: -3, budget: 'abc', extra: 1 }))
      .toEqual({ earningCapPct: 20, lossLimitPct: DEFAULT_GOALS.lossLimitPct, budget: DEFAULT_GOALS.budget })
    expect(cleanGoals({ lossLimitPct: 150 }).lossLimitPct).toBe(DEFAULT_GOALS.lossLimitPct)
    expect(cleanGoals(null)).toEqual(DEFAULT_GOALS)
  })

  it('saves and reloads, and falls back to defaults when the file is missing or broken', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neovai-goals-'))
    try {
      expect(loadGoals(dir)).toEqual(DEFAULT_GOALS)
      saveGoals(dir, { earningCapPct: 12, lossLimitPct: 5, budget: 2500 })
      expect(loadGoals(dir)).toEqual({ earningCapPct: 12, lossLimitPct: 5, budget: 2500 })
      fs.writeFileSync(path.join(dir, 'goals.json'), '{not json')
      expect(loadGoals(dir)).toEqual(DEFAULT_GOALS)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })
})
