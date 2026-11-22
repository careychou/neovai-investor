import fs from 'node:fs'
import path from 'node:path'

/** Lists, in the workspace, every path the app has ever seeded, so a file the user deletes is not brought back. */
export const SEEDED = '.seeded.json'

/** What version 0.2.0 shipped, before the manifest existed. Its workspaces count these as seen. */
export const LEGACY = [
  'goals.json', 'instructions', 'instructions/system.md', 'logic', 'logic/index.ts', 'records', 'records/README.md',
  'skills', 'tests', 'tests/logic.test.ts', 'ui', 'ui/Today.tsx',
  ...['candidate-evaluation', 'market-scan', 'performance-review', 'recommendation', 'user-preference']
    .flatMap((n) => [`skills/${n}`, `skills/${n}/SKILL.md`])
]

function walk(root: string, rel = ''): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name
    out.push(p)
    if (e.isDirectory()) out.push(...walk(root, p))
  }
  return out
}

/**
 * Gives the installed app its own editable workspace. The first run copies everything.
 * Later runs add only files and folders a newer version introduced, at any depth, and never
 * overwrite or restore what the user or the agent changed or deleted. Returns what was added.
 */
export function seedWorkspace(bundled: string, own: string): string[] {
  if (!fs.existsSync(bundled)) return []
  const all = walk(bundled)
  const manifest = path.join(own, SEEDED)
  let added: string[] = []
  if (!fs.existsSync(own)) {
    fs.cpSync(bundled, own, { recursive: true })
    added = all.filter((p) => !p.includes('/'))
  } else {
    let seen: Set<string>
    try { seen = new Set(JSON.parse(fs.readFileSync(manifest, 'utf8'))) } catch {
      // Before the manifest only missing top-level entries were seeded; keep that, and count 0.2.0 files as seen.
      seen = new Set(LEGACY.filter((p) => p.includes('/') || fs.existsSync(path.join(own, p))))
    }
    for (const p of all) {
      if (seen.has(p) || fs.existsSync(path.join(own, p))) continue
      if (added.some((a) => p.startsWith(`${a}/`))) continue
      fs.cpSync(path.join(bundled, p), path.join(own, p), { recursive: true })
      added.push(p)
    }
  }
  fs.writeFileSync(manifest, JSON.stringify(all, null, 1))
  return added
}
