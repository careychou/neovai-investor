import { describe, it, expect } from 'vitest'
import { version } from '../logic'

describe('workspace logic', () => {
  it('reports a version', () => {
    expect(version()).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
