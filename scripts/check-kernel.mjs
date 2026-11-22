// Fails unless the sibling neovai-kernel checkout is exactly at the tag pinned in kernel.json.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const { tag } = JSON.parse(readFileSync(path.join(root, 'kernel.json'), 'utf8'))
const kernel = path.resolve(root, '../neovai-kernel')
const git = (...a) => execFileSync('git', ['-C', kernel, ...a], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
try {
  const want = git('rev-parse', `${tag}^{commit}`)
  const have = git('rev-parse', 'HEAD')
  const dirty = git('status', '--porcelain')
  if (want !== have) throw new Error(`kernel is at ${have.slice(0, 7)}, but ${tag} is ${want.slice(0, 7)}. Run: git -C ../neovai-kernel checkout ${tag}`)
  if (dirty) throw new Error(`kernel has uncommitted changes, so it is not ${tag}`)
  console.log(`kernel ok: ${tag}`)
} catch (e) {
  console.error(`check-kernel: ${e.message}`)
  process.exit(1)
}
