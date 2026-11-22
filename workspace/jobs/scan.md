---
title: Market scan
description: Scan today's market with the market-scan skill.
---
Follow the user-preference rules and the market-scan skill. Do not evaluate candidates or recommend anything in this job.

Before you finish, call save_data with the name "market" and this shape, so the Today screen can show it:

```json
{
  "date": "YYYY-MM-DD",
  "mood": "risk-on | mixed | risk-off, with the reason in one line",
  "summary": "two to four sentences in markdown",
  "metrics": [{ "label": "S&P 500", "value": 6012.3, "change": "+0.4%", "note": "source, time" }],
  "news": [{ "headline": "one line", "why": "why it moves the market", "source": "site, time" }],
  "alerts": [{ "level": "info | warn | bad | good", "text": "one line" }],
  "sectors": [{ "sector": "Energy", "change": "+1.2%", "note": "leading | lagging, and why" }],
  "watch": [{ "ticker": "XYZ", "reason": "why it stood out" }]
}
```

Use "no data" for anything you could not fetch. Finish with a short report: the mood and the watch list.
