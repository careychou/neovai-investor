import fs from 'node:fs'
import path from 'node:path'
import type { Goals } from '../shared/api'

export const DEFAULT_GOALS: Goals = { earningCapPct: 15, lossLimitPct: 7, budget: 10000 }

const num = (v: unknown, fallback: number, max = Infinity) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 && n <= max ? n : fallback
}

/** Keeps only the known fields, as positive numbers; a bad value falls back to the default. */
export function cleanGoals(raw: unknown): Goals {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    earningCapPct: num(r.earningCapPct, DEFAULT_GOALS.earningCapPct, 1000),
    lossLimitPct: num(r.lossLimitPct, DEFAULT_GOALS.lossLimitPct, 100),
    budget: num(r.budget, DEFAULT_GOALS.budget)
  }
}

export function loadGoals(workspace: string): Goals {
  try { return cleanGoals(JSON.parse(fs.readFileSync(path.join(workspace, 'goals.json'), 'utf8'))) } catch { return { ...DEFAULT_GOALS } }
}

export function saveGoals(workspace: string, g: unknown): Goals {
  const clean = cleanGoals(g)
  fs.writeFileSync(path.join(workspace, 'goals.json'), JSON.stringify(clean, null, 2) + '\n')
  return clean
}
