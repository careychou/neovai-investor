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
  "news": [{ "headline": "one line", "why": "why it moves the market", "source": "site, time", "tickers": ["every ticker the story names or is mainly about, e.g. NVDA; [] if none"] }],
  "alerts": [{ "level": "info | warn | bad | good", "text": "one line" }],
  "sectors": [{ "sector": "Energy", "change": "+1.2%", "note": "leading | lagging, and why" }],
  "watch": [{ "ticker": "XYZ", "name": "company or fund name", "reason": "why it stood out" }],
  "holdingsNote": "one line in markdown: how many holdings were checked and the ones that need attention, or 'You hold no accepted positions right now.'",
  "holdingsNews": [{ "ticker": "ABC", "headline": "one line", "source": "site", "time": "YYYY-MM-DD HH:MM ET", "impact": "good | bad | neutral", "action": "suggested action, or empty if none needed" }]
}
```

Fetch "holdingsNews" on every run, following "News on my holdings" in the market-scan skill. Holdings are the accepted Buy calls in `records/data/decisions.json` that no later accepted Sell all has closed. If there are none, save "holdingsNews" as [] and say so in "holdingsNote". Put the "bad" items first.

Tag every "news" item with the tickers it is about, so the Recommendations screen can show each stock's top news when its ticker is clicked. A stock may have several holdingsNews items; list the most important first.

"watch" should hold at least 20 tickers (see the market-scan skill). Use "no data" for anything you could not fetch. Finish with a short report: the mood, any holdings with bad news, and the watch list.
