import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ChatRequest, Delta, ModelAdapter } from 'neovai-kernel/cards/agent-loop'
import { createLiveUi } from 'neovai-kernel/cards/live-ui'
import { createRuntime } from 'neovai-kernel/cards/runtime-agent'
import { createAgent } from '../shell/main/agent'

const bundled = path.resolve(__dirname, '../workspace')
let tmp = ''
afterEach(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }) })

describe('shipped workspace', () => {
  it('has screens and panels that load, and jobs for every run block', () => {
    const ui = createLiveUi({ workspace: bundled })
    expect(ui.check()).toMatch(/^OK: today, review/)
    const runtime = createRuntime({ workspace: bundled, adapter: { async *stream() {} }, settings: () => ({ model: '' }) })
    const jobs = runtime.jobs().map((j) => j.name)
    for (const s of ui.screens()) {
      for (const m of JSON.stringify(s.screen).matchAll(/"job":"([^"]+)"/g)) expect(jobs).toContain(m[1])
    }
    // Every skill is in the runtime instruction, in order, with the job last.
    const prompt = runtime.systemPrompt(runtime.jobs().find((j) => j.name === 'daily'))
    const at = (s: string) => prompt.indexOf(s)
    expect(at('# Skill: user-preference')).toBeGreaterThan(0)
    expect(at('# Skill: user-preference')).toBeLessThan(at('# Skill: recommendation'))
    expect(at('# Job: Daily run')).toBeGreaterThan(at('# Skill: recommendation'))
  })
})

describe('Codify and the live UI', () => {
  it('gives Codify a check_ui tool that reports a broken screen', async () => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neovai-main-')))
    const workspace = path.join(tmp, 'workspace')
    fs.mkdirSync(path.join(workspace, 'ui', 'screens'), { recursive: true })
    fs.writeFileSync(path.join(workspace, 'ui', 'screens', 'today.json'), '{"blocks":[{"type":"chart"}]}')
    const requests: ChatRequest[] = []
    const steps: Delta[][] = [
      [{ type: 'tool_call', index: 0, id: 'c0', name: 'check_ui', args: '{}' }, { type: 'finish', reason: 'tool_calls' }],
      [{ type: 'text', text: 'done' }, { type: 'finish', reason: 'stop' }]
    ]
    const adapter: ModelAdapter = { async *stream(req) { requests.push(structuredClone(req)); for (const d of steps.shift() ?? []) yield d } }
    const agent = createAgent({
      dataDir: path.join(tmp, 'data'), workspace, adapter, ui: createLiveUi({ workspace }),
      settings: () => ({ defaultModel: 'm', maxTurnsMain: 5, maxOutputTokens: 0, reasoning: 'off', maxConcurrency: 2 }),
      onEvent: () => {}
    })
    await agent.send(agent.newChat().id, 'check')
    const out = String(requests[1].messages.find((m) => m.role === 'tool')?.content)
    expect(out).toContain('ui/screens/today.json')
    expect(out).toContain('blocks[0]')
    agent.dispose()
  })
})
