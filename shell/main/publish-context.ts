import type { Message } from 'neovai-kernel/cards/agent-loop'
import type { SessionRow } from 'neovai-kernel/cards/session-store'

const textOf = (c: Message['content']): string =>
  typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => ('text' in p && typeof p.text === 'string' ? p.text : '')).join(' ') : ''

const PUBLISH_ASK = 'Publish my changes to the repository.'

/**
 * The Codify requests behind a publish: from every chat changed since the repository's last commit, the user's
 * asks and Codify's closing answer to each, so the commit message can say why. In a chat that was published from
 * before, only the turns after that publish count.
 */
export function publishContext(chats: SessionRow[], load: (id: string) => Message[], since: number, maxChars = 12_000): string {
  const parts: string[] = []
  for (const c of [...chats].filter((c) => c.updated_at > since).sort((a, b) => a.updated_at - b.updated_at)) {
    const lines: string[] = []
    let answer = ''
    const flush = () => { if (answer) lines.push(`Codify: ${answer.slice(0, 600)}`); answer = '' }
    for (const m of load(c.id)) {
      if (m.role === 'user') {
        flush()
        const t = textOf(m.content).trim()
        if (t === PUBLISH_ASK) lines.length = 0
        else if (t) lines.push(`User: ${t.slice(0, 1500)}`)
      } else if (m.role === 'assistant' && m.content && !m.tool_calls?.length && lines.length) {
        answer = String(m.content).replace(/\s+/g, ' ').trim()
      }
    }
    flush()
    if (lines.some((l) => l.startsWith('User:'))) parts.push(`## Request: ${c.title}\n${lines.join('\n')}`)
  }
  const text = parts.join('\n\n')
  return text.length > maxChars ? '… (earlier requests cut)\n' + text.slice(-maxChars) : text
}
