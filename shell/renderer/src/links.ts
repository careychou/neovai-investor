import type { LinkRule } from 'neovai-kernel/cards/agent-loop'

/** This app's link patterns, passed to the kernel chat and screens. Bare http(s) URLs are always links. */
export const LINKS: LinkRule[] = [
  // Cashtags such as $AAPL or $BRK.B open the quote page.
  { pattern: /\$[A-Z]{1,5}(?:\.[A-Z])?\b/, href: (m) => `https://finance.yahoo.com/quote/${m.slice(1).replace('.', '-')}`, title: (m) => `${m.slice(1)} quote` }
]
