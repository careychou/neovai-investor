import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ChatRequest, Delta, ModelAdapter } from 'neovai-kernel/cards/agent-loop'
import { createLiveUi, DEFAULT_EXTERNALS } from 'neovai-kernel/cards/live-ui'
import { PANEL_LIBRARIES } from '../shell/shared/api'
import { createRuntime } from 'neovai-kernel/cards/runtime-agent'
import { createAgent } from '../shell/main/agent'
import { runtimeModelOf } from '../shell/main/app-settings'

const bundled = path.resolve(__dirname, '../workspace')
let tmp = ''
afterEach(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }) })

describe('shipped workspace', () => {
  it('has screens and panels that load, and jobs for every run block', () => {
    const ui = createLiveUi({ workspace: bundled, externals: [...DEFAULT_EXTERNALS, ...PANEL_LIBRARIES] })
    expect(ui.check()).toMatch(/^OK: preferences, today, retail, candidates, recommendations, review/)
    // Every screen names the skills it is built on, and each shipped skill has a screen.
    const skills = fs.readdirSync(path.join(bundled, 'skills'))
    const used = ui.screens().flatMap((s) => s.screen?.skills ?? [])
    for (const s of used) expect(skills).toContain(s)
    expect([...new Set(used)].sort()).toEqual([...skills].sort())
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
    expect(at('# Job: Full daily run')).toBeGreaterThan(at('# Skill: recommendation'))
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

describe('decisions and the runtime model', () => {
  it('lets the runtime agent read decisions but never change them', async () => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neovai-dec-')))
    fs.cpSync(bundled, tmp, { recursive: true })
    createLiveUi({ workspace: tmp }).decide({ ticker: 'XLP', action: 'Buy', date: '2026-11-22' }, 'accepted')
    const steps: Delta[][] = [
      [{ type: 'tool_call', index: 0, id: 'a', name: 'write_file', args: JSON.stringify({ path: 'records/data/decisions.json', content: '{}' }) },
       { type: 'tool_call', index: 1, id: 'b', name: 'save_data', args: JSON.stringify({ name: 'decisions', data: {} }) },
       { type: 'finish', reason: 'tool_calls' }],
      [{ type: 'text', text: 'done' }, { type: 'finish', reason: 'stop' }]
    ]
    const adapter: ModelAdapter = { async *stream() { for (const d of steps.shift() ?? []) yield d } }
    const runtime = createRuntime({ workspace: tmp, adapter, settings: () => ({ model: 'm' }), readOnly: ['goals.json', 'records/data/decisions.json'] })
    await runtime.run('daily')
    const saved = JSON.parse(fs.readFileSync(path.join(tmp, 'records/data/decisions.json'), 'utf8'))
    expect(saved.items).toMatchObject([{ ticker: 'XLP', decision: 'accepted' }])
  })
  it('runs jobs on the Codify model unless the runtime has its own', () => {
    expect(runtimeModelOf({ defaultModel: 'opus', runtimeModel: '' })).toBe('opus')
    expect(runtimeModelOf({ defaultModel: 'opus', runtimeModel: 'flash' })).toBe('flash')
  })
})
