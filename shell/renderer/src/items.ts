import type { AgentEvent, Message } from '../../shared/api'

export type Item =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string; live?: boolean }
  | { kind: 'tool'; callId: string; name: string; args: string; output?: string; ok?: boolean }
  | { kind: 'error'; text: string }

const textOf = (c: Extract<Message, { role: 'user' }>['content']) =>
  typeof c === 'string' ? c : c.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('\n')

/** Turns a saved conversation into what the chat panel draws. */
export function fromMessages(messages: Message[]): Item[] {
  const results = new Map<string, string>()
  for (const m of messages) if (m.role === 'tool') results.set(m.tool_call_id, m.content)
  const out: Item[] = []
  for (const m of messages) {
    if (m.role === 'user') out.push({ kind: 'user', text: textOf(m.content) })
    if (m.role !== 'assistant') continue
    if (m.content) out.push({ kind: 'assistant', text: m.content })
    for (const c of m.tool_calls ?? []) {
      const output = results.get(c.id)
      out.push(output === undefined
        ? { kind: 'tool', callId: c.id, name: c.function.name, args: c.function.arguments, output: 'No result was saved.', ok: false }
        : { kind: 'tool', callId: c.id, name: c.function.name, args: c.function.arguments, output, ok: !output.startsWith('Error:') })
    }
  }
  return out
}

/** Folds one live event into the list. Returns the same array when nothing changes. */
export function applyEvent(items: Item[], e: AgentEvent): Item[] {
  const last = items[items.length - 1]
  switch (e.kind) {
    case 'text':
      return last?.kind === 'assistant' && last.live
        ? [...items.slice(0, -1), { ...last, text: last.text + e.text }]
        : [...items, { kind: 'assistant', text: e.text, live: true }]
    case 'assistant_done':
      return last?.kind === 'assistant' && last.live
        ? [...items.slice(0, -1), { kind: 'assistant', text: last.text }]
        : items
    case 'tool_start':
      return [...items, { kind: 'tool', callId: e.callId, name: e.name, args: e.args }]
    case 'tool_end':
      return items.map((it) => (it.kind === 'tool' && it.callId === e.callId ? { ...it, output: e.output, ok: e.ok } : it))
    case 'error':
      return [...items, { kind: 'error', text: e.message }]
    default:
      return items
  }
}

/** One short line describing a tool call, taken from its arguments. */
export function summarize(_name: string, args: string): string {
  try {
    const a = JSON.parse(args)
    const v = a.command ?? a.path ?? a.url ?? a.pattern ?? ''
    return typeof v === 'string' ? v : ''
  } catch {
    return ''
  }
}
