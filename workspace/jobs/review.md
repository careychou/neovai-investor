---
title: Performance review
description: Score past picks and keep the account ledger (holdings, closed trades, account summary) with the performance-review skill.
---
Follow the performance-review skill. Build the ledger only from accepted calls in `records/data/decisions.json` and today's live prices.

Before you finish, call save_data with the name "review" and this shape:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "two to four sentences in markdown",
  "account": {
    "asOf": "YYYY-MM-DD HH:MM ET",
    "budget": 10000,
    "totalValue": 10000,
    "cash": 10000,
    "invested": 0,
    "marketValue": 0,
    "realizedUsd": 0,
    "unrealizedUsd": 0,
    "totalUsd": 0,
    "totalPct": 0,
    "goalPct": 10,  // = overallProfitPct from goals.json
    "goalUsd": 1000,  // = budget × goalPct / 100
    "wins": 0,
    "losses": 0,
    "winRatePct": null,
    "todayChangeUsd": 0,
    "todayChangePct": 0,
    "weekPnlUsd": 0,
    "openPositions": 0,
    "closedTrades": 0
  },
  "holdings": [{
    "ticker": "ABC", "acceptedDate": "YYYY-MM-DD", "shares": 0,
    "entry": 0, "price": 0, "prevClose": 0, "priceSource": "source, time",
    "marketValue": 0, "costBasis": 0, "unrealizedUsd": 0, "unrealizedPct": 0,
    "dayChangeUsd": 0, "dayChangePct": 0,
    "stop": 0, "target": 0, "daysHeld": 0,
    "watch": "what to watch next, one line"
  }],
  "closed": [{
    "ticker": "ABC", "buyDate": "YYYY-MM-DD", "sellDate": "YYYY-MM-DD", "shares": 0,
    "entry": 0, "exit": 0, "realizedUsd": 0, "realizedPct": 0, "daysHeld": 0,
    "reason": "why it was sold, short"
  }],
  "metrics": [{ "label": "Hit rate", "value": "4 of 6" }],
  "outcomes": [{ "date": "YYYY-MM-DD", "ticker": "ABC", "action": "Buy", "decision": "accepted | declined | none", "entry": 0, "now": 0, "result": "+3.1%", "status": "open | target hit | stopped out" }],
  "suggestions": [{ "skill": "candidate-evaluation", "change": "the exact rule to change", "why": "evidence from at least three calls" }],
  "goal": { "targetPct": 10, "targetUsd": 1000, "realizedUsd": 0, "unrealizedUsd": 0, "totalUsd": 0, "pct": 0, "invested": 0, "openPositions": 0, "todayPnlUsd": 0, "weekPnlUsd": 0, "asOf": "YYYY-MM-DD HH:MM ET", "note": "one line on the pace toward the overall profit goal" }
}
```

Rules:
- All money and percent values are plain numbers (no "$" or "%"). Percents are in percent units (2.5 means 2.5%). Use null, never a guess, for a price you could not fetch, and write "no data" in `priceSource`.
- `holdings` are the accepted Buys still open (one row per ticker). `closed` holds one row per closed part (Sell part or Sell all), newest sell first. Use empty lists when there are none.
- `winRatePct` is null when there are no closed trades.
- `targetPct` is `overallProfitPct` from goals.json and `targetUsd` = budget × targetPct / 100 (the numbers above are examples at the defaults).
- `goal` repeats the account numbers for the Preferences screen: `pct` = totalPct, `todayPnlUsd` = todayChangeUsd.
- Count only accepted calls since 2026-11-22.
- Flag in `summary` any holding that breaks a rule (down more than 2%, up more than 20%, cost over $1,000), any holding past its stop or target, and a hit daily or weekly loss limit.

Finish with a short report. Suggest skill changes only as suggestions; the user makes them in Codify.
