---
description: Check each watch-list ticker against the user's goals and thresholds and rank the ones that pass.
order: 3
---
# Candidate evaluation

Input: the watch list from `market-scan` (`records/data/market.json` when an earlier run saved it), the rules from `user-preference`, and the numbers in `goals.json`.

Each ticker is judged for its bucket: `long` (hidden jewels, user-preference rules 26 to 33) or `trade` (rules 4 to 17). The watch list suggests a bucket; you may move a ticker if the numbers say otherwise, and say why. A hype name (RSI above 75, short interest above 15%, or a news spike) is `trade` only.

## For each ticker, collect

- Current price, with source and time
- Today's range and volume compared with the average
- Trend over the last five days, the last month and the last year; price against the 50-day and 200-day averages
- Next earnings date
- For long ideas, from `stockanalysis.com/stocks/<ticker>/statistics/`: market cap, P/E, PEG, FCF yield, ROIC, debt/EBITDA, Piotroski F-score, analyst count, short interest, insider ownership, dividend yield

## Drop the ticker if

- It breaks a rule in `user-preference` for its bucket.
- You could not get a live price.
- Trade: earnings fall inside the planned holding period, or volume is too thin to sell the position in one day.
- Long: it fails most of rule 26, it is hype, or it has no thesis you can state in one line.

## Long-term thresholds

- Score quality from 1 to 5 (ROIC, margins, F-score, debt) and valuation from 1 to 5 (PEG, FCF yield, P/E against its own history). Keep a ticker only when both are 3 or more.
- Target: a 12-month fair value with the method (for example "15× FCF"). Expected upside at least 25%.
- Stop: 8 to 10% below the entry, or under the 200-day average (rule 28).
- Thesis: one line on why the market is missing it, and one line on what would prove it wrong.

## Trade thresholds

- Upside target: a realistic price for the holding period (usually intraday), at least +3% (rule 17 in `user-preference`) and never more than 20% or `earningCapPct` above the entry, whichever is lower.
- Downside stop: below a recent low, never more than 2% below the entry (or `lossLimitPct` if that is smaller). If the natural stop is more than 2% away, drop the ticker.
- Reward to risk: upside divided by downside. Keep the ticker only when it is 1.5 or more.
- Liquidity: drop it if the price is under $5 or the average volume is under 1,000,000 shares.

## Output

- Ranked table, best first: ticker, bucket, horizon, price, target, stop, reward to risk, volume against average, trend, next earnings, quality and valuation (long), thesis (long), hype, and one line of reasoning. Keep a mix: aim for at least 3 long and 5 trade names when that many pass.
- Dropped list: each ticker with the rule that removed it.

If nothing passes, say so. An empty list is a valid result. The Candidates screen shows this.
