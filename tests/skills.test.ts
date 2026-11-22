import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadSkills } from 'neovai-kernel/cards/skills'
import { seedWorkspace } from '../shell/main/seed'

const defaults = path.join(__dirname, '..', 'workspace', 'skills')

describe('default skills', () => {
  it('ships the five daily-loop skills in order, each with a description', () => {
    const skills = loadSkills(defaults)
    expect(skills.map((s) => s.name)).toEqual(['user-preference', 'market-scan', 'candidate-evaluation', 'recommendation', 'performance-review'])
    for (const s of skills) {
      expect(s.description.length).toBeGreaterThan(20)
      expect(s.body.length).toBeGreaterThan(200)
    }
  })
})

describe('seedWorkspace', () => {
  let tmp: string
  let bundled: string
  let own: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-'))
    bundled = path.join(tmp, 'bundled')
    own = path.join(tmp, 'own')
    fs.mkdirSync(path.join(bundled, 'skills', 'a'), { recursive: true })
    fs.writeFileSync(path.join(bundled, 'skills', 'a', 'SKILL.md'), 'default')
    fs.writeFileSync(path.join(bundled, 'goals.json'), '{"budget":1}')
  })
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('copies everything on the first run', () => {
    seedWorkspace(bundled, own)
    expect(fs.readFileSync(path.join(own, 'skills', 'a', 'SKILL.md'), 'utf8')).toBe('default')
    expect(fs.existsSync(path.join(own, 'goals.json'))).toBe(true)
  })

  it('adds a folder a newer version introduced without touching existing files', () => {
    fs.mkdirSync(own)
    fs.writeFileSync(path.join(own, 'goals.json'), '{"budget":999}')
    expect(seedWorkspace(bundled, own)).toEqual(['skills'])
    expect(fs.readFileSync(path.join(own, 'goals.json'), 'utf8')).toBe('{"budget":999}')
    expect(fs.existsSync(path.join(own, 'skills', 'a', 'SKILL.md'))).toBe(true)
  })

  it('adds new nested files once, and never brings back a file the user deleted', () => {
    seedWorkspace(bundled, own)
    fs.mkdirSync(path.join(bundled, 'ui', 'screens'), { recursive: true })
    fs.writeFileSync(path.join(bundled, 'ui', 'screens', 'today.json'), '{}')
    fs.rmSync(path.join(own, 'skills', 'a'), { recursive: true })
    expect(seedWorkspace(bundled, own)).toEqual(['ui'])
    expect(fs.existsSync(path.join(own, 'ui', 'screens', 'today.json'))).toBe(true)
    expect(fs.existsSync(path.join(own, 'skills', 'a'))).toBe(false)
    fs.rmSync(path.join(own, 'ui', 'screens', 'today.json'))
    expect(seedWorkspace(bundled, own)).toEqual([])
  })

  it('upgrades a 0.2.0 workspace: adds new folders inside existing ones, keeps deleted 0.2.0 skills deleted', () => {
    fs.mkdirSync(path.join(bundled, 'skills', 'market-scan'), { recursive: true })
    fs.writeFileSync(path.join(bundled, 'skills', 'market-scan', 'SKILL.md'), 'default')
    fs.mkdirSync(path.join(bundled, 'ui', 'screens'), { recursive: true })
    fs.writeFileSync(path.join(bundled, 'ui', 'Today.tsx'), 'default')
    fs.writeFileSync(path.join(bundled, 'ui', 'screens', 'today.json'), '{}')
    fs.mkdirSync(path.join(own, 'ui'), { recursive: true })
    fs.writeFileSync(path.join(own, 'ui', 'Today.tsx'), 'edited')
    fs.writeFileSync(path.join(own, 'goals.json'), '{}')
    fs.mkdirSync(path.join(own, 'skills'))
    expect(seedWorkspace(bundled, own)).toEqual(['skills/a', 'ui/screens'])
    expect(fs.readFileSync(path.join(own, 'ui', 'Today.tsx'), 'utf8')).toBe('edited')
    expect(fs.existsSync(path.join(own, 'skills', 'market-scan'))).toBe(false)
  })

  it('never overwrites a file that exists', () => {
    fs.mkdirSync(path.join(own, 'skills', 'mine'), { recursive: true })
    fs.writeFileSync(path.join(own, 'skills', 'mine', 'SKILL.md'), 'edited')
    fs.writeFileSync(path.join(own, 'goals.json'), 'mine')
    seedWorkspace(bundled, own)
    expect(fs.readFileSync(path.join(own, 'goals.json'), 'utf8')).toBe('mine')
    expect(fs.readFileSync(path.join(own, 'skills', 'mine', 'SKILL.md'), 'utf8')).toBe('edited')
  })
})
