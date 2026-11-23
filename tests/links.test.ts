import { describe, it, expect } from 'vitest'
import { linkSegments } from 'neovai-kernel/cards/agent-loop'
import { LINKS } from '../shell/renderer/src/links'

describe('app link rules', () => {
  it('links cashtags to their quote page but not dollar amounts', () => {
    const parts = linkSegments('Buy $AAPL and $BRK.B under $342.56', LINKS).filter((p) => p.href)
    expect(parts.map((p) => [p.text, p.href])).toEqual([
      ['$AAPL', 'https://finance.yahoo.com/quote/AAPL'],
      ['$BRK.B', 'https://finance.yahoo.com/quote/BRK-B']
    ])
  })
})
