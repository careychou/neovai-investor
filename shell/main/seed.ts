import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

/** Lists, in the workspace, every path the app has ever seeded, so a file the user deletes is not brought back. */
export const SEEDED = '.seeded.json'

/** What version 0.2.0 shipped, before the manifest existed. Its workspaces count these as seen. */
export const LEGACY = [
  'goals.json', 'instructions', 'instructions/system.md', 'logic', 'logic/index.ts', 'records', 'records/README.md',
  'skills', 'tests', 'tests/logic.test.ts', 'ui', 'ui/Today.tsx',
  ...['candidate-evaluation', 'market-scan', 'performance-review', 'recommendation', 'user-preference']
    .flatMap((n) => [`skills/${n}`, `skills/${n}/SKILL.md`])
]

/**
 * Hashes of files earlier versions shipped, from before the manifest kept hashes.
 * A file that still matches one was never edited, so an update may replace it.
 */
export const SHIPPED: Record<string, string[]> = {
  'jobs/daily.md': ['3f3187cf477640082d52552e0882262794e03a44e9a81062adda000110d791e7'],
  'jobs/review.md': ['6657031cd97ceb3dcff48c5adbff2d02b650fe5493c91561ff645e16bc33bfbd'],
  'skills/user-preference/SKILL.md': ['228d595788ab411edae1a9674735d5ee54647480d95c21e6ead468c507e8fbba'],
  'skills/performance-review/SKILL.md': ['7ebf45300cf0c427173ecfb840b3b98db8d0dd97af0ca2131d08b82b94020b18'],
  'ui/screens/today.json': ['ccd8baf4f648c7807cdba874cc12cf0c263e4c998ae7cbee8206b68c20c3a71d'],
  'ui/screens/review.json': ['0fed471781101f0748a26b30db388008e15a74d7e8b8dd2f582f91778ccc3070'],
  'records/README.md': ['ee3ef121cdd6fbfbd51643ee994103c44fc23f4c58f7c690530c078e5e82d42b', '93ded19d9764858bd67d2926974af254d87b69be1f5310a0d378b8a9a48a1a17']
}

const hashOf = (f: string) => { try { return createHash('sha256').update(fs.readFileSync(f)).digest('hex') } catch { return '' } }

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
 * Later runs add files and folders a newer version introduced, at any depth, and update files
 * the user never edited (they still match what an earlier version shipped). They never
 * overwrite an edited file or restore a deleted one. Returns what was added or updated.
 * The manifest `.seeded.json` maps every seeded path to the hash of what was shipped.
 */
export function seedWorkspace(bundled: string, own: string, shipped: Record<string, string[]> = SHIPPED): string[] {
  if (!fs.existsSync(bundled)) return []
  const all = walk(bundled)
  const manifest = path.join(own, SEEDED)
  const hashes: Record<string, string> = {}
  for (const p of all) hashes[p] = fs.statSync(path.join(bundled, p)).isDirectory() ? '' : hashOf(path.join(bundled, p))
  let added: string[] = []
  if (!fs.existsSync(own)) {
    fs.cpSync(bundled, own, { recursive: true })
    added = all.filter((p) => !p.includes('/'))
  } else {
    let seen: Set<string>
    let before: Record<string, string> = {}
    try {
      const m = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      // 0.3.0 kept a plain list of paths; later versions keep a path-to-hash map.
      if (Array.isArray(m)) seen = new Set(m)
      else { before = m; seen = new Set(Object.keys(m)) }
    } catch {
      // Before the manifest only missing top-level entries were seeded; keep that, and count 0.2.0 files as seen.
      seen = new Set(LEGACY.filter((p) => p.includes('/') || fs.existsSync(path.join(own, p))))
    }
    for (const p of all) {
      const target = path.join(own, p)
      if (fs.existsSync(target)) {
        if (!hashes[p] || fs.statSync(target).isDirectory()) continue
        const cur = hashOf(target)
        const untouched = cur === before[p] || (shipped[p] ?? []).includes(cur)
        if (untouched && cur !== hashes[p]) { fs.copyFileSync(path.join(bundled, p), target); added.push(p) }
        continue
      }
      if (seen.has(p)) continue
      if (added.some((a) => p.startsWith(`${a}/`))) continue
      fs.cpSync(path.join(bundled, p), target, { recursive: true })
      added.push(p)
    }
  }
  fs.writeFileSync(manifest, JSON.stringify(hashes, null, 1))
  return added
}
