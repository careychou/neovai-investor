---
title: Performance review
description: Score past picks and keep the account ledger (holdings, closed trades, account summary) with the performance-review skill.
---
Follow the performance-review skill. Build the ledger from accepted calls in `records/data/decisions.json` and today's live prices. Value the holdings the user added by hand in `records/data/holdings.json` separately, in `manual` (section 1b of the skill).

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
  "manual": {
    "asOf": "YYYY-MM-DD HH:MM ET",
    "costBasis": 0,
    "marketValue": 0,
    "unrealizedUsd": 0,
    "dayChangeUsd": 0,
    "estAnnualIncomeUsd": 0,
    "holdings": [{
      "id": "id from holdings.json", "source": "manual", "ticker": "SCHD", "name": "fund or company name", "kind": "Stock | ETF | Mutual fund",
      "buyDate": "YYYY-MM-DD or null", "shares": 0, "avgCost": 0, "price": 0, "prevClose": 0, "dayChangePct": 0, "priceSource": "source, time",
      "marketValue": 0, "costBasis": 0, "unrealizedUsd": 0, "unrealizedPct": 0, "daysHeld": null,
      "ttmDividendPerShare": 0, "yieldPct": 0, "estAnnualIncomeUsd": 0, "exDividendDate": "Mon D, YYYY or null",
      "watch": "what to watch next, one line"
    }]
  },
  "suggestions": [{ "skill": "candidate-evaluation", "change": "the exact rule to change", "why": "evidence from at least three calls" }],
  "income": {
    "asOf": "YYYY-MM-DD HH:MM ET",
    "tbillYieldPct": 4.12,
    "tbillYield3moAgoPct": 3.75,
    "tbillTrend": "rising | falling | flat, one line with the 3-month change",
    "yieldSource": "Yahoo ^IRX, time",
    "value": 0,
    "costBasis": 0,
    "unrealizedUsd": 0,
    "estMonthlyIncomeUsd": 0,
    "estAnnualIncomeUsd": 0,
    "interestEarnedUsd": 0,
    "reserveUsd": 5000,
    "idleCashUsd": 0,
    "holdings": [{ "ticker": "SGOV", "name": "fund name", "acceptedDate": "YYYY-MM-DD", "shares": 0, "entry": 0, "price": 0, "priceSource": "source, time", "marketValue": 0, "costBasis": 0, "unrealizedUsd": 0, "yieldPct": 0, "estMonthlyIncomeUsd": 0, "daysHeld": 0 }],
    "note": "one line: what to do with idle cash or the sleeve"
  },
  "goal": { "targetPct": 10, "targetUsd": 1000, "realizedUsd": 0, "unrealizedUsd": 0, "totalUsd": 0, "pct": 0, "invested": 0, "openPositions": 0, "todayPnlUsd": 0, "weekPnlUsd": 0, "asOf": "YYYY-MM-DD HH:MM ET", "note": "one line on the pace toward the overall profit goal" }
}
```

Rules:
- All money and percent values are plain numbers (no "$" or "%"). Percents are in percent units (2.5 means 2.5%). Use null, never a guess, for a price you could not fetch, and write "no data" in `priceSource`.
- `holdings` are the accepted Buys still open (one row per ticker). `closed` holds one row per closed part (Sell part or Sell all), newest sell first. Use empty lists when there are none.
- `winRatePct` is null when there are no closed trades.
- Holdings added by hand (`records/data/holdings.json`) go only in `manual`, never in `holdings`, `closed` or `income`. They are extra money: leave them out of every `account`, `goal` and `income` number (cash, invested, totals, goal progress, win rate, loss limits). The Performance screen adds them to the account value itself. Always fill `manual`, with zeros and an empty list when the file is missing or empty. Use null and "no data" for any price you could not fetch.
- `targetPct` is `overallProfitPct` from goals.json and `targetUsd` = budget × targetPct / 100 (the numbers above are examples at the defaults).
- `goal` repeats the account numbers for the Preferences screen: `pct` = totalPct, `todayPnlUsd` = todayChangeUsd.
- Count only accepted calls since 2026-11-22.
- Income sleeve: accepted calls on SGOV, BIL, USFR or SHV (or any call with "sleeve": true) go in `income.holdings` and `closed`, never in `holdings`, and they do not count toward `openPositions`, `wins`, `losses` or `winRatePct`. They do count in `invested`, `marketValue`, `cash`, `totalValue` and the profit totals, so total value − budget still equals total profit. Follow the "Income sleeve" section of the performance-review skill. Always fill `income`, even with no sleeve holdings (value 0, empty holdings), so the screen can show the T-bill yield and the idle cash. Use null and "no data" for any yield or price you could not fetch.
- In `summary`, add one sentence on the holdings added by hand when there are any: their value, profit and yearly dividend income.
- Flag in `summary` any holding that breaks a rule (down more than 2%, up more than 20%, cost over $1,000), any holding past its stop or target, and a hit daily or weekly loss limit.

Finish with a short report. Suggest skill changes only as suggestions; the user makes them in Codify.
