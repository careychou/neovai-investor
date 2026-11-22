import fs from 'node:fs'
import path from 'node:path'

/**
 * Gives the installed app its own editable workspace. The first run copies everything.
 * Later runs add only top-level entries a newer version introduced, so nothing the user
 * or the agent changed is overwritten. Returns what was added.
 */
export function seedWorkspace(bundled: string, own: string): string[] {
  if (!fs.existsSync(bundled)) return []
  if (!fs.existsSync(own)) {
    fs.cpSync(bundled, own, { recursive: true })
    return fs.readdirSync(own)
  }
  const added: string[] = []
  for (const name of fs.readdirSync(bundled)) {
    if (fs.existsSync(path.join(own, name))) continue
    fs.cpSync(path.join(bundled, name), path.join(own, name), { recursive: true })
    added.push(name)
  }
  return added
}
