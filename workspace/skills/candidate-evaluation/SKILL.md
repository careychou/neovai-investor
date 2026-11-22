---
description: Check each watch-list ticker against the user's goals and thresholds and rank the ones that pass.
order: 3
---
# Candidate evaluation

Input: the watch list from `market-scan` (`records/data/market.json` when an earlier run saved it), the rules from `user-preference`, and the numbers in `goals.json`.

## For each ticker, collect

- Current price, with source and time
- Today's range and volume compared with the average
- Trend over the last five days and the last month
- Next earnings date

## Drop the ticker if

- It breaks a rule in `user-preference`.
- You could not get a live price.
- Earnings fall inside the planned holding period.
- Volume is too thin to sell the position in one day.

## Set the thresholds

- Upside target: a realistic price for the holding period, never more than `earningCapPct` above the entry.
- Downside stop: below a recent low, never more than `lossLimitPct` below the entry.
- Reward to risk: upside divided by downside. Keep the ticker only when it is 1.5 or more.

## Output

- Ranked table, best first: ticker, price, target, stop, reward to risk, volume against average, trend, next earnings, and one line of reasoning.
- Dropped list: each ticker with the rule that removed it.

If nothing passes, say so. An empty list is a valid result. The Candidates screen shows this.
