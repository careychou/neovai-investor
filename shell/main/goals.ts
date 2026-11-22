import fs from 'node:fs'
import path from 'node:path'
import type { Goals } from '../shared/api'

/** The user's preferences live in goals.json: only the user changes them (on the Preferences screen); agents read them. */
export const DEFAULT_GOALS: Goals = { earningCapPct: 15, lossLimitPct: 7, budget: 10000 }

const MAX_BYTES = 64_000

/**
 * Any JSON object up to 64 KB, so the Preferences screen can add its own fields.
 * The three core numbers are always present and positive; a bad one falls back to the default.
 */
export function cleanGoals(raw: unknown): Goals {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const r = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  if (JSON.stringify(r).length > MAX_BYTES) throw new Error('preferences are too large')
  const max = { earningCapPct: 1000, lossLimitPct: 100, budget: Infinity }
  for (const k of Object.keys(max) as (keyof typeof max)[]) {
    const n = Number(r[k])
    r[k] = Number.isFinite(n) && n > 0 && n <= max[k] ? n : DEFAULT_GOALS[k]
  }
  return r as Goals
}

export function loadGoals(workspace: string): Goals {
  try { return cleanGoals(JSON.parse(fs.readFileSync(path.join(workspace, 'goals.json'), 'utf8'))) } catch { return { ...DEFAULT_GOALS } }
}

export function saveGoals(workspace: string, g: unknown): Goals {
  const clean = cleanGoals(g)
  fs.writeFileSync(path.join(workspace, 'goals.json'), JSON.stringify(clean, null, 2) + '\n')
  return clean
}
