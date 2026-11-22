---
title: Recommendations
description: Turn candidates and open positions into new buys, sells and changes with the recommendation skill.
---
Follow the user-preference rules and the recommendation skill.

Inputs:
- Candidates: `records/data/candidates.json`. If it is missing or its date is not today, run market-scan and candidate-evaluation first and save "market" and "candidates" (the shapes in jobs/scan.md and jobs/evaluate.md).
- Open positions: the Buy calls the user accepted in `records/data/decisions.json` that a later accepted Sell all has not closed, and the positions in `records/data/review.json`.

Before you finish, call save_data with the name "picks" and this shape. Every call needs an entry, target and stop:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "two to four sentences in markdown",
  "buys": [{ "ticker": "ABC", "action": "Buy", "reason": "one or two lines", "confidence": "high | medium | low", "entry": 0, "target": 0, "stop": 0, "shares": 0 }],
  "sells": [{ "ticker": "XYZ", "action": "Sell part | Sell all", "reason": "one or two lines", "confidence": "high | medium | low", "entry": 0, "target": 0, "stop": 0, "shares": 0 }],
  "changes": [{ "ticker": "XYZ", "action": "Raise stop | Lower target | Add | Hold", "reason": "what changes and why", "confidence": "high | medium | low", "entry": 0, "target": 0, "stop": 0 }],
  "cash": "cash left after these calls"
}
```

Empty lists are valid. Finish with a short report: the calls and the cash left.
