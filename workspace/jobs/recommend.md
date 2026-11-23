---
title: Recommendations
description: Turn candidates and open positions into new buys, sells and changes with the recommendation skill.
---
Follow the user-preference rules and the recommendation skill.

This job is the same as the daily job with `mode` "reuse-candidates". Ignore any input option; it always reuses the saved candidates.

Inputs:
- Candidates: `records/data/candidates.json`. Reuse it as it is, even if its date is not today. Do not run a new market scan or candidate evaluation. The user picks this job when they want to refresh only the recommendations. If the file is missing, save "picks" with empty buys, keep making the sell and change calls on open positions, and say in "summary" that a full refresh is needed for new buys. Still fetch today's prices for entries, targets and stops, and use "no data" for any price you cannot fetch.
- Open positions: the Buy calls the user accepted in `records/data/decisions.json` that a later accepted Sell all has not closed, and the positions in `records/data/review.json`.

Before you finish, call save_data with the name "picks" and this shape. Every call needs an entry, target and stop, and a "name": the company or fund name as listed (for example "Walmart Inc.", "Consumer Staples Select Sector SPDR Fund"); use "no data" if you cannot find it, never guess:

```json
{
  "date": "YYYY-MM-DD",
  "basedOn": "one line: which market scan and candidates these calls used, with their dates, e.g. Reused candidates from 2026-11-21 (market scan 2026-11-21).",
  "summary": "two to four sentences in markdown",
  "buys": [{ "ticker": "ABC", "name": "ABC Corp.", "action": "Buy", "reason": "one or two lines", "confidence": "high | medium | low", "confidenceReason": "one line: why this confidence level", "entry": 0, "target": 0, "stop": 0, "shares": 0 }],
  "sells": [{ "ticker": "XYZ", "name": "XYZ Inc.", "action": "Sell part | Sell all", "reason": "one or two lines", "confidence": "high | medium | low", "entry": 0, "target": 0, "stop": 0, "shares": 0 }],
  "changes": [{ "ticker": "XYZ", "name": "XYZ Inc.", "action": "Raise stop | Lower target | Add | Hold", "reason": "what changes and why", "confidence": "high | medium | low", "entry": 0, "target": 0, "stop": 0, "shares": 0, "heldShares": 0 }],
  "cash": "cash left after these calls",
  "counts": [
    { "label": "New stocks", "value": 0 },
    { "label": "Sells", "value": 0 },
    { "label": "Changes", "value": 0 }
  ]
}
```

Shares: every call needs a whole-number "shares". For a buy it is the number to buy at "entry" (sized by the recommendation skill). For a sell it is the number to sell ("Sell all" = every share held; "Sell part" = the part to sell, usually half). For a change it is the number to add for "Add", or 0 for any other change. Put the shares currently held in "heldShares" (from accepted decisions and review.json). "entry" is the limit price for the order. The Recommendations screen shows each order as "Buy N shares at $entry".

Every call must follow the user-preference rules: at most $1,000 per stock, a stop no more than 2% below the entry, sell all above +20%, sell half at +3%, at most 5 open positions and at most 5 buys per day, no buys when the daily ($200) or weekly ($500) loss limit is hit, and no buys in the first or last 15 minutes of the session. Say in "summary" which cap or limit stopped more buys, if any. Never add a ticker that failed evaluation. Every buy must have "confidence" (exactly "high", "medium" or "low") and a one-line "confidenceReason".

"counts" values must equal the number of items in buys, sells and changes (0 when a list is empty).

Empty lists are valid. Finish with a short report: the calls and the cash left.
