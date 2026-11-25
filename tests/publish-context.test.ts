import { describe, it, expect } from 'vitest'
import type { Message } from 'neovai-kernel/cards/agent-loop'
import { publishContext } from '../shell/main/publish-context'

const row = (id: string, title: string, updated_at: number) => ({ id, title, cwd: '', model: '', created_at: 0, updated_at })

describe('publishContext', () => {
  it('collects requests and closing answers from chats changed since the last commit, after their last publish', () => {
    const chats: Record<string, Message[]> = {
      a: [
        { role: 'user', content: 'old ask' },
        { role: 'assistant', content: 'old done' },
        { role: 'user', content: 'Publish my changes to the repository.' },
        { role: 'assistant', content: 'Published.' },
        { role: 'user', content: [{ type: 'text', text: 'Trade stops should be 2%' }] },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', type: 'function', function: { name: 'edit', arguments: '{}' } }] },
        { role: 'tool', tool_call_id: '1', content: 'ok' },
        { role: 'assistant', content: 'Changed the stop rule in  the trade skill.' }
      ],
      b: [{ role: 'user', content: 'stale' }]
    }
    const text = publishContext([row('b', 'Old', 5), row('a', 'Stops', 20)], (id) => chats[id], 10)
    expect(text).toBe('## Request: Stops\nUser: Trade stops should be 2%\nCodify: Changed the stop rule in the trade skill.')
  })

  it('keeps the newest requests when too long', () => {
    const text = publishContext([row('a', 'T', 2)], () => [{ role: 'user', content: 'x'.repeat(50) }, { role: 'user', content: 'last' }], 0, 20)
    expect(text.startsWith('… (earlier requests cut)')).toBe(true)
    expect(text.endsWith('User: last')).toBe(true)
  })
})
