---
title: Daily run
description: Scan the market, evaluate candidates and recommend today's calls.
---
Run the skills in order: user-preference, market-scan, candidate-evaluation, recommendation.

Before you finish, call save_data with the name "today" and this shape, so the Today screen can show it:

```json
{
  "date": "YYYY-MM-DD",
  "mood": "risk-on | mixed | risk-off, with the reason in one line",
  "summary": "two to four sentences in markdown",
  "metrics": [{ "label": "S&P 500", "value": 6012.3, "change": "+0.4%", "note": "source, time" }],
  "alerts": [{ "level": "info | warn | bad | good", "text": "one line" }],
  "picks": [{ "ticker": "ABC", "action": "Buy | Sell part | Sell all | Hold", "reason": "one or two lines", "confidence": "high | medium | low", "target": 0, "stop": 0 }],
  "watch": [{ "ticker": "XYZ", "reason": "why it stood out" }]
}
```

Use "no data" for anything you could not fetch. An empty picks list is a valid result.

Finish with a short report: the mood, the calls, and the cash left.
