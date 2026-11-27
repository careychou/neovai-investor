---
title: Retail scan
description: Dive into retail (grocery, big box, discount, staples, home improvement, online) with the retail-scan skill.
---
Follow the user-preference rules and the retail-scan skill. Do not evaluate candidates, recommend anything or change the market scan.

Before you finish, call save_data with the name "retail" and this shape, so the Retail screen can show it:

```json
{
  "date": "YYYY-MM-DD",
  "asOf": "ISO time of the scan, e.g. 2026-11-25T14:30:00Z",
  "mood": "strong | mixed | weak, with the reason in one line",
  "summary": "two to four sentences in markdown: the most important retail news today and what it means",
  "segments": [{ "key": "grocery | bigbox | discount | staples | home | online | etf", "name": "Grocery", "changePct": 0.4, "leaders": "KR +1.2%, SFM +0.9%", "laggards": "ACI -0.8%", "note": "one line: what drove the segment today" }],
  "news": [{ "segment": "grocery", "headline": "one line", "why": "why it matters, in everyday words", "impact": "good | bad | neutral", "tickers": ["KR"], "source": "site", "time": "YYYY-MM-DD HH:MM ET", "url": "link if you have it" }],
  "alerts": [{ "level": "info | warn | bad | good", "text": "one line" }],
  "shopper": [{ "label": "Retail sales (Oct)", "value": "+0.4% m/m", "note": "source, release date" }],
  "calendar": [{ "date": "YYYY-MM-DD", "ticker": "COST", "event": "Earnings after close", "note": "what to watch" }],
  "themes": [{ "title": "Shoppers trade down", "why": "one or two lines", "source": "site, date" }],
  "yours": [{ "ticker": "WMT", "note": "what today's retail news means for this holding or watch-list name", "impact": "good | bad | neutral" }],
  "ideas": [{ "ticker": "BJ", "name": "BJ's Wholesale Club", "segment": "bigbox", "reason": "why it is worth a closer look" }]
}
```

Rules:
- Percents are plain numbers in percent units (0.4 means 0.4%). Use null for a change you could not fetch and "no data" for text you could not find. Never guess.
- `news` is newest first within importance: the items most likely to move a stock come first. Tag every item with its segment and every ticker it names, so the screen can filter by segment and open a stock's details.
- Put any `bad` news on a holding in `alerts` too, naming the ticker.
- `yours` is [] when the user holds and watches no retail or staples names.

Finish with a short report: the mood, the three most important retail stories, anything that affects the user's holdings, and the next big dates.
