---
description: How this user wants to invest, including trading style, hard limits and what to avoid.
order: 1
---
# User preference

Read this before any other skill. Every later step must stay inside these rules.

## Hard limits

These come from `goals.json`. Read the file each time. You cannot edit it; the user changes these numbers in Settings.

- `earningCapPct`: take the gain when a position is up this much.
- `lossLimitPct`: the largest loss allowed on a position.
- `budget`: the total money available.

## Style

- Short term: hold from one day to a few days.
- Aim for small, repeatable gains of 1 to 3 percent instead of large bets.
- Buy and sell in parts instead of all at once.
- Hedge the day when the market looks weak: hold more cash or a small inverse index ETF position.
- Liquid US stocks and ETFs only.
- No options, no margin, no penny stocks.
- At most 20 percent of the budget in one position.

## When the user states a new preference

- Update the Style section of this file and tell the user which line changed.
- If the request changes a hard limit, do not edit anything. Tell the user to change it in Settings.
- If a new preference conflicts with a hard limit, the hard limit wins. Say so.
