import { describe, expect, it } from 'vitest'
import type { AgentEvent, Message } from '../shell/shared/api'
import { applyEvent, fromMessages, summarize, type Item } from '../shell/renderer/src/items'

const call = (id: string, name: string, args: object) =>
  ({ id, type: 'function' as const, function: { name, arguments: JSON.stringify(args) } })

describe('fromMessages', () => {
  it('rebuilds a saved chat: no system message, tool results paired with their calls', () => {
    const saved: Message[] = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'image_url', image_url: { url: 'data:x' } }] },
      { role: 'assistant', content: null, tool_calls: [call('a', 'read_file', { path: 'x.ts' }), call('b', 'shell', { command: 'ls' })] },
      { role: 'tool', tool_call_id: 'b', content: 'Error: boom' },
      { role: 'tool', tool_call_id: 'a', content: 'body' },
      { role: 'assistant', content: 'done' }
    ]
    expect(fromMessages(saved)).toEqual([
      { kind: 'user', text: 'hi' },
      { kind: 'tool', callId: 'a', name: 'read_file', args: '{"path":"x.ts"}', output: 'body', ok: true },
      { kind: 'tool', callId: 'b', name: 'shell', args: '{"command":"ls"}', output: 'Error: boom', ok: false },
      { kind: 'assistant', text: 'done' }
    ])
  })
})

describe('applyEvent', () => {
  const run = (events: object[]) =>
    events.reduce<Item[]>((s, e) => applyEvent(s, { agentId: 'm', ...e } as AgentEvent), [{ kind: 'user', text: 'q' }])

  it('joins streamed text, and starts a new bubble after a tool call', () => {
    const out = run([
      { kind: 'text', text: 'Hel' }, { kind: 'text', text: 'lo' },
      { kind: 'assistant_done', message: { role: 'assistant', content: 'Hello' } },
      { kind: 'tool_start', callId: 'a', name: 'shell', args: '{"command":"pwd"}' },
      { kind: 'tool_end', callId: 'a', name: 'shell', output: '/w', ok: true },
      { kind: 'text', text: 'Bye' }
    ])
    expect(out).toEqual([
      { kind: 'user', text: 'q' },
      { kind: 'assistant', text: 'Hello' },
      { kind: 'tool', callId: 'a', name: 'shell', args: '{"command":"pwd"}', output: '/w', ok: true },
      { kind: 'assistant', text: 'Bye', live: true }
    ])
  })

  it('shows errors and leaves the list untouched for events it does not draw', () => {
    const before: Item[] = [{ kind: 'user', text: 'q' }]
    expect(applyEvent(before, { kind: 'usage', agentId: 'm', prompt: 1, completion: 1 } as AgentEvent)).toBe(before)
    expect(run([{ kind: 'error', message: 'no key' }]).at(-1)).toEqual({ kind: 'error', text: 'no key' })
  })
})

describe('summarize', () => {
  it('picks the most useful argument and survives bad JSON', () => {
    expect(summarize('shell', '{"command":"npm test","description":"x"}')).toBe('npm test')
    expect(summarize('write_file', '{"path":"a.ts","content":"…"}')).toBe('a.ts')
    expect(summarize('web_fetch', '{"url":"https://example.com"}')).toBe('https://example.com')
    expect(summarize('grep', '{"pattern":"foo"}')).toBe('foo')
    expect(summarize('shell', '{"comm')).toBe('')
  })
})
