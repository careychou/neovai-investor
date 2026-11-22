import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AgentEvent, ChatRequest, Delta, Message, ModelAdapter } from 'neovai-kernel/cards/agent-loop'
import { createAgent, type Agent } from '../shell/main/agent'

const say = (text: string): Delta[] => [{ type: 'text', text }, { type: 'usage', prompt: 5, completion: 2 }, { type: 'finish', reason: 'stop' }]
const call = (...calls: Array<[name: string, args: unknown]>): Delta[] => [
  ...calls.map(([name, args], i): Delta => ({ type: 'tool_call', index: i, id: `c${i}`, name, args: JSON.stringify(args) })),
  { type: 'finish', reason: 'tool_calls' }
]
const toolOutputs = (msgs: Message[]) => msgs.filter((m) => m.role === 'tool').map((m) => String(m.content))

let tmp: string
let workspace: string
let agent: Agent
let requests: ChatRequest[]
let events: Array<{ chatId: string; e: AgentEvent }>

function start(steps: Delta[][]) {
  requests = []
  events = []
  const adapter: ModelAdapter = {
    async *stream(req) {
      requests.push({ ...req, messages: structuredClone(req.messages) })
      const s = steps.shift()
      if (!s) throw new Error('no more steps')
      for (const d of s) yield d
    }
  }
  agent = createAgent({
    dataDir: path.join(tmp, 'data'), workspace, adapter,
    settings: () => ({ defaultModel: 'm', maxTurnsMain: 20, maxOutputTokens: 0, reasoning: 'off', maxConcurrency: 4 }),
    onEvent: (chatId, e) => events.push({ chatId, e })
  })
}

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neovai-investor-')))
  workspace = path.join(tmp, 'workspace')
  fs.mkdirSync(path.join(workspace, 'instructions'), { recursive: true })
  fs.writeFileSync(path.join(workspace, 'instructions', 'system.md'), 'Stay inside the goals. MARKER-123')
  fs.writeFileSync(path.join(workspace, 'goals.json'), '{"budget":1}')
})
afterEach(() => {
  agent?.dispose()
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('investor agent', () => {
  it('answers a prompt, saves the conversation and records usage', async () => {
    start([say('hello')])
    const chat = agent.newChat()
    expect(await agent.send(chat.id, 'What changed today?')).toEqual({ status: 'completed', text: 'hello' })
    expect(agent.openChat(chat.id).map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(agent.listChats()[0]).toMatchObject({ id: chat.id, title: 'What changed today?' })
    expect(events.every((x) => x.chatId === chat.id)).toBe(true)
    expect(events.at(-1)!.e).toMatchObject({ kind: 'agent_end', status: 'completed' })
    expect(agent.store.usageSince(0)).toMatchObject([{ session_id: chat.id, model: 'm', prompt: 5, completion: 2 }])
  })

  it('puts the workspace instructions in the system prompt and re-reads them each run', async () => {
    start([say('a'), say('b')])
    const chat = agent.newChat()
    await agent.send(chat.id, 'one')
    expect(String(requests[0].messages[0].content)).toContain('MARKER-123')
    fs.writeFileSync(path.join(workspace, 'instructions', 'system.md'), 'EDITED-456')
    await agent.send(chat.id, 'two')
    expect(String(requests[1].messages[0].content)).toContain('EDITED-456')
  })

  it('lets the model write inside the workspace', async () => {
    start([call(['write_file', { path: 'logic/note.ts', content: 'export const x = 1\n' }]), say('done')])
    const chat = agent.newChat()
    await agent.send(chat.id, 'go')
    expect(fs.readFileSync(path.join(workspace, 'logic', 'note.ts'), 'utf8')).toBe('export const x = 1\n')
  })

  it('refuses writes to goals.json and to anything outside the workspace', async () => {
    const outside = path.join(tmp, 'outside.txt')
    start([call(
      ['write_file', { path: 'goals.json', content: '{"budget":999}' }],
      ['write_file', { path: outside, content: 'x' }],
      ['write_file', { path: '../escape.txt', content: 'x' }]
    ), say('done')])
    const chat = agent.newChat()
    await agent.send(chat.id, 'go')
    const out = toolOutputs(requests[1].messages)
    expect(out[0]).toMatch(/^Error: .*read-only/)
    expect(out[1]).toMatch(/^Error: .*outside the workspace/)
    expect(out[2]).toMatch(/^Error: .*outside the workspace/)
    expect(fs.readFileSync(path.join(workspace, 'goals.json'), 'utf8')).toBe('{"budget":1}')
    expect(fs.existsSync(outside)).toBe(false)
    expect(fs.existsSync(path.join(tmp, 'escape.txt'))).toBe(false)
  })

  it('runs shell commands in the workspace without asking', async () => {
    start([call(['shell', { command: 'pwd', description: 'Print folder' }]), say('done')])
    const chat = agent.newChat()
    await agent.send(chat.id, 'go')
    const out = toolOutputs(requests[1].messages)[0]
    expect(out).toContain(workspace)
    expect(out).toContain('<exit code 0>')
  })

  it('reopens a saved chat after a restart and deletes chats', async () => {
    start([say('first')])
    const chat = agent.newChat()
    await agent.send(chat.id, 'remember this')
    agent.dispose()
    start([say('second')])
    await agent.send(chat.id, 'again')
    expect(requests[0].messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    agent.deleteChat(chat.id)
    expect(agent.listChats()).toEqual([])
  })

  it('lists skills in the system prompt and rereads them on every call', () => {
    start([])
    expect(agent.systemPrompt()).toContain('(no skills yet)')
    const dir = path.join(workspace, 'skills', 'scan')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\ndescription: Scan the market.\norder: 1\n---\nBODY-ONE')
    expect(agent.systemPrompt()).toContain('- scan: Scan the market.')
    expect(agent.skills().map((s) => s.name)).toEqual(['scan'])
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\ndescription: Scan twice.\norder: 1\n---\nBODY-TWO')
    expect(agent.systemPrompt()).toContain('- scan: Scan twice.')
  })

  it('gives the model a skill tool that returns the skill body', async () => {
    const dir = path.join(workspace, 'skills', 'scan')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\ndescription: Scan the market.\n---\nBODY-ONE')
    start([call(['skill', { name: 'scan' }]), say('done')])
    const chat = agent.newChat()
    await agent.send(chat.id, 'scan please')
    expect(toolOutputs(requests[1].messages)[0]).toContain('BODY-ONE')
  })
})
