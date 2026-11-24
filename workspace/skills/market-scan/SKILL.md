---
description: Scan today's market for major news, alerts and key metrics before picking any stock.
order: 2
---
# Market scan

Use the web fetch tool. Give every number its source and the time you read it.

## Collect

- Indexes: S&P 500, Nasdaq, Dow and Russell 2000, with level and percent change.
- Risk metrics: VIX and the 10-year Treasury yield.
- Interest rates for the income sleeve: the 13-week T-bill yield (Yahoo `^IRX`, the price is the yield in %) today, about 3 months ago and about 1 year ago, and whether it is rising, falling or flat. Say in one line what it means for parking idle cash in T-bill funds (user-preference rules 20 to 25).
- Major news: the three to five stories moving the market today.
- Alerts: earnings due today and tomorrow, big movers, trading halts, analyst upgrades and downgrades.
- Sectors: which are leading and which are lagging.
- News on my holdings: fetch news for every stock the user holds. Do this on every scan (steps below).

## News on my holdings

1. Find the holdings in `records/data/decisions.json` (read-only). A holding is a ticker with an accepted Buy that no later accepted Sell all has closed. An accepted Sell part leaves the rest of the position open. A declined call never opens or closes a position. Also add every ticker in `records/data/holdings.json` (read-only): stocks and funds the user bought outside the app. For a fund (ETF or mutual fund) look for news on the fund itself, its dividend, and big moves in its top holdings. Note the entry, target and stop from the Buy.
2. For each holding, fetch news from the last 48 hours: the CNBC quote page (`cnbc.com/quotes/<TICKER>`, news section), plus the market live blog and stocks-moving pages above. Look for earnings and guidance, rating changes, deals, lawsuits, product news, insider sales and sector news that names the stock.
3. Keep only news that could move the stock. Keep up to three items per holding, newest first. If you find nothing relevant, add one row for that ticker with headline "No relevant news found" and impact "neutral". If every fetch fails, use headline "no data". Never make up a headline.
4. Rate each item for the position: `good` (helps the case for holding it), `bad` (hurts the case, or puts the stop or an earnings date at risk) or `neutral`.
5. Suggest an action only when the news matters, using the user-preference rules: for example "Sell all: earnings before next session (no earnings while holding)", "Tighten stop to entry", "Watch: stop at risk if it opens lower", or "Hold: supports the thesis". Use "" when the news doesn't call for an action. This is a flag for the recommendation step, not a trade call.
6. Any `bad` item with an action also goes in `alerts` (level `bad` or `warn`), naming the ticker.

## Hidden jewels for the long bucket

The crowd chases what is already on the front page. The long bucket (user-preference rules 26 to 33) wants good businesses few people are watching. Find them on every scan:

1. **Screen.** Fetch the finviz screener with a browser-like request: `https://finviz.com/screener.ashx?v=111&f=<filters>`. Tickers appear in the page as `quote.ashx?t=XYZ&`. Useful filter sets:
   - Quality at a fair price: `cap_smallover,cap_midunder,fa_roe_o15,fa_pe_u25,fa_debteq_u0.5,fa_salesqoq_o10,sh_avgvol_o500,ta_sma200_pa`
   - Cash machines: `cap_smallover,fa_fcf_o5,fa_curratio_o1.5,fa_debteq_u0.5,sh_avgvol_o300`
   - Insider buying: `cap_smallover,it_latestbuys,sh_avgvol_o300` (or `openinsider.com/latest-cluster-buys`)
   - Beaten-down quality: `cap_smallover,fa_roe_o15,ta_highlow52w_b0to10h,sh_avgvol_o300` (within 10% of a 52-week low)
2. **Check.** For the best 8 to 12, read `stockanalysis.com/stocks/<ticker>/statistics/`: market cap, P/E, PEG, P/FCF, FCF yield, ROIC, debt/EBITDA, Piotroski F-score, analyst count, short interest (% float), RSI, 200-day average. Keep names that meet most of rule 26.
3. **Under-followed.** Prefer 8 or fewer analysts and low institutional ownership. Skip anything all over the news this week.
4. **Hype flag.** Mark a name `hype: true` when RSI is above 75, short interest is above 15% of float, or it is up more than 15% in a week on news or social buzz. Hype is only for the trade bucket with a quick exit.

## Rules

- If a source fails, try one other source. If that fails too, write "no data" for that item. Never guess a number.
- Do not use numbers from memory. Only use what you fetched in this run.

## Output

- Mood: one line, risk-on, mixed or risk-off, with the reason.
- Metrics table: item, value, change, source, time.
- News and alerts: short bullets.
- Watch list: at least 20 US stocks or ETFs worth evaluating, each with the reason it stood out and its bucket. At least 8 should be `long` ideas from the hidden-jewel screen and at least 10 should be liquid `trade` names. The recommendation step needs about 10 calls after candidate evaluation drops some, so keep the list wide.

## Today panel

After every scan, overwrite `ui/marketScanData.ts` so the Market scan panel on the Today tab shows it. Set `latestScan` to a `MarketScan` object (type in `logic/marketScan.ts`):

- `asOf`: ISO time of the scan. `mood`: label and one-line reason.
- `metrics`: one entry per index and risk metric, with source and time. Use `null` for any value or change you could not fetch. The panel shows "no data".
- `alerts`: the important items that can move the market today: macro events (Fed, CPI, jobs data), earnings, big movers, halts, rating changes and major news. Give each a severity:
  - `high`: likely to move the whole market or a held/watched ticker more than 3%.
  - `medium`: likely to move a sector or a single large stock.
  - `low`: worth knowing, small expected effect.
  Every alert needs a plain-English `detail` saying why it matters, plus source and time.
- `trends`: three to five trends likely to move the market in the coming days (for example rates, oil, AI spending, earnings season), each with direction, reason and source.
- `sectors`: leading and lagging. `watchList`: same as above.

Only put fetched data in this file. Never write numbers from memory.

## Sources that worked

Keep this list up to date. After each scan, add any source that returned good data and remove any that failed twice in a row.

- CNBC daily market live blog (`cnbc.com/<date>/stock-market-today-live-updates.html`, linked from cnbc.com/markets): index closes, VIX notes, Fed news, analyst calls. Read from start_index about 5000.
- CNBC stocks moving the most (`cnbc.com/<date>/stocks-moving-the-most-today-live-updates.html`): big movers and upgrades.
- CNBC quote pages (`cnbc.com/quotes/.VIX`, `.RUT`, `US10Y`, `.SPX`, `.IXIC`, `.DJI`): last value and change at about start_index 6000.
- finviz screener (`finviz.com/screener.ashx?v=111&f=...`): works with a browser user agent; about 20 tickers a page (added 2026-11-24).
- stockanalysis statistics (`stockanalysis.com/stocks/<ticker>/statistics/`): valuation, quality, analyst count, short interest, RSI. Funds have no statistics page (added 2026-11-24).

Failed (first time, 2026-11-22): finance.yahoo.com/markets (fetch failed), stooq.com CSV (404), cnbc.com/us-markets and /pre-markets (empty), cnbc.com/earnings (no calendar text). Next time try a different earnings calendar source.
